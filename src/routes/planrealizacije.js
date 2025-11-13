// src/routes/planrealizacije.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const planQuerySchema = z.object({
  programId: z.string().min(1),
  year: z.coerce.number().int().min(1).max(10),
});

// Za header fakulteta po kodu programa
const FACULTY_BY_CODE = {
  FIR: "Ekonomski fakultet",
  SMDP: "Ekonomski fakultet",
  RI: "Tehnički fakultet",
  TUG: "Fakultet turizma, ugostiteljstva i gastronomije",
  EP: "Biotehnički fakultet",
};

router.get("/health", (_req, res) => res.json({ ok: true, scope: "planrealizacije" }));

// ⚙️ Jednokratni seed studijskih programa (idempotentno)
router.post("/seed-programs", async (_req, res) => {
  const data = [
    { code: "FIR", name: "Finansije i računovodstvo" },
    { code: "SMDP", name: "Strateški menadžment i digitalni poslovni modeli" },
    { code: "RI", name: "Računarstvo i informatika" },
    { code: "TUG", name: "Turizam, ugostiteljstvo i gastronomija" },
    { code: "EP", name: "Ekološko poljoprivredarstvo" },
  ];
  try {
    for (const p of data) {
      await prisma.studyProgram.upsert({
        where: { code: p.code },
        update: { name: p.name },
        create: { code: p.code, name: p.name },
      });
    }
    const all = await prisma.studyProgram.findMany({ orderBy: { name: "asc" } });
    res.json({ ok: true, count: all.length, programs: all });
  } catch (e) {
    res.status(500).json({ message: "Seed failed", detail: String(e?.message || e) });
  }
});

// Lista programa (frontend učitava ovo za dropdown/tabove)
router.get("/programs", async (_req, res) => {
  const programs = await prisma.studyProgram.findMany({ orderBy: { name: "asc" } });
  res.json(programs);
});

// Dohvati ili kreiraj PRN plan za dati program i godinu (+ autoseed redova iz SubjectOnProgramYear)
router.get("/plan", async (req, res) => {
  const parsed = planQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const { programId, year } = parsed.data;

  try {
    const program = await prisma.studyProgram.findUnique({ where: { id: programId } });
    if (!program) return res.status(404).json({ message: "Program not found" });

    // KORIGIRANO: koristi se ime unique constrainta iz sheme ("uniq_plan_per_program_year")
    let plan = await prisma.pRNPlan.findUnique({
      where: { uniq_plan_per_program_year: { programId, yearNumber: year } },
    });

    // ako ne postoji plan – kreiraj i seed-aj redove iz SubjectOnProgramYear za tu godinu
    if (!plan) {
      plan = await prisma.pRNPlan.create({ data: { programId, yearNumber: year } });

      const subjectLinks = await prisma.subjectOnProgramYear.findMany({
        where: { programId, yearNumber: year },
        select: { subjectId: true },
      });

      const uniqueSubjectIds = [...new Set(subjectLinks.map((x) => x.subjectId))];
      if (uniqueSubjectIds.length) {
        await prisma.pRNRow.createMany({
          data: uniqueSubjectIds.map((sid) => ({
            planId: plan.id,
            subjectId: sid,
            // polja ostavi kako ih koristi tvoj UI (ukoliko si u modelu PRNRow koristio lectureTotal/exerciseTotal)
            lectureTotal: 0,
            exerciseTotal: 0,
          })),
          // radi samo ako postoji unique index (npr. @@unique([planId, subjectId]))
          skipDuplicates: true,
        });
      }
    }

    // vrati pun plan sa redovima
    const full = await prisma.pRNPlan.findUnique({
      where: { id: plan.id },
      include: {
        program: true,
        rows: {
          include: {
            subject: { include: { subjectPrograms: { include: { program: true } } } },
            professor: true,
          },
          orderBy: [{ subject: { code: "asc" } }, { subject: { name: "asc" } }],
        },
      },
    });

    const facultyName = FACULTY_BY_CODE[full.program.code || ""] || "";

    res.json({
      plan: {
        id: full.id,
        program: full.program,
        facultyName,
        yearNumber: full.yearNumber,
      },
      rows: full.rows,
    });
  } catch (e) {
    res.status(500).json({ message: "PRN plan error", detail: String(e?.message || e) });
  }
});

// Ažuriranje jednog reda (profesor/sati)
const rowUpdateSchema = z.object({
  professorId: z.string().min(1).nullable().optional(),
  lectureTotal: z.coerce.number().int().min(0).optional(),
  exerciseTotal: z.coerce.number().int().min(0).optional(),
});

router.put("/rows/:id", async (req, res) => {
  const parsed = rowUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const updated = await prisma.pRNRow.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.professorId !== undefined
          ? { professorId: parsed.data.professorId || null }
          : {}),
        ...(parsed.data.lectureTotal !== undefined ? { lectureTotal: parsed.data.lectureTotal } : {}),
        ...(parsed.data.exerciseTotal !== undefined ? { exerciseTotal: parsed.data.exerciseTotal } : {}),
      },
      include: { subject: true, professor: true },
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: String(e?.message || e) });
  }
});

// (opcionalno) lista planova po filteru
router.get("/", async (req, res) => {
  const { programId, year } = req.query;
  const where = {};
  if (programId) where.programId = String(programId);
  if (year) where.yearNumber = Number(year);

  const plans = await prisma.pRNPlan.findMany({
    where,
    include: { program: true, rows: { include: { subject: true, professor: true } } },
    orderBy: [{ yearNumber: "asc" }],
  });

  res.json(plans);
});
