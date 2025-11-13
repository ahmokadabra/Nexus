// src/routes/planrealizacije.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const planQuerySchema = z.object({
  programId: z.string().min(1),
  year: z.coerce.number().int().min(1).max(10),
});

// Header: mapiranje code -> naziv fakulteta
const FACULTY_BY_CODE = {
  FIR: "Ekonomski fakultet",
  SMDP: "Ekonomski fakultet",
  RI: "Tehnički fakultet",
  TUG: "Fakultet turizma, ugostiteljstva i gastronomije",
  EP: "Biotehnički fakultet",
};

router.get("/health", (_req, res) => res.json({ ok: true, scope: "planrealizacije" }));

// Idempotent seed standardnih programa (po code)
router.post("/seed-programs", async (_req, res) => {
  const data = [
    { code: "FIR", name: "Finansije i računovodstvo" },
    { code: "SMDP", name: "Strateški menadžment i digitalni poslovni modeli" },
    { code: "RI",  name: "Računarstvo i informatika" },
    { code: "TUG", name: "Turizam, ugostiteljstvo i gastronomija" },
    { code: "EP",  name: "Ekološko poljoprivredarstvo" },
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

// Programi za tabove
router.get("/programs", async (_req, res) => {
  const programs = await prisma.studyProgram.findMany({ orderBy: { name: "asc" } });
  res.json(programs);
});

/** Helper: osiguraj (dodaj) redove u planu za sve predmete iz SubjectOnProgramYear. */
async function ensurePlanRows({ programId, yearNumber, planId, prune = false }) {
  // 1) svi linkovi Predmet↔Program(Godina)
  const links = await prisma.subjectOnProgramYear.findMany({
    where: { programId, yearNumber },
    select: { subjectId: true },
  });
  const linkIds = new Set(links.map(l => l.subjectId));

  // 2) postojeći redovi u planu
  const existing = await prisma.pRNRow.findMany({
    where: { planId },
    select: { subjectId: true },
  });
  const existingIds = new Set(existing.map(r => r.subjectId));

  // 3) dodaj nedostajuće
  const toCreate = [...linkIds].filter(id => !existingIds.contains ? !existingIds.has(id) : !existingIds[id]);
  if (toCreate.length) {
    await prisma.pRNRow.createMany({
      data: toCreate.map(sid => ({
        planId,
        subjectId: sid,
        // polja prema tvom modelu/FRONT-u:
        lectureTotal: 0,
        exerciseTotal: 0,
      })),
      skipDuplicates: true, // radi uz uniq(planId, subjectId)
    });
  }

  // 4) opcionalno obriši redove za predmete koji više nisu u tom program/godina (prune)
  if (prune) {
    await prisma.pRNRow.deleteMany({
      where: {
        planId,
        NOT: { subjectId: { in: [...linkIds] } },
      },
    });
  }
}

// GET /api/planrealizacije/plan?programId=&year=
// Kreira plan ako ne postoji, *uvijek* dosjeme nedostajuće redove iz SubjectOnProgramYear.
router.get("/plan", async (req, res) => {
  const parsed = planQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const { programId, year } = parsed.data;

  try {
    const program = await prisma.studyProgram.findUnique({ id: programId });
    if (!program) return res.status(404).json({ message: "Program not found" });

    // koristi ime kompozitnog ključa iz sheme: @@unique([programId, yearNumber], name: "uniq_plan_per_program_year")
    let plan = await prisma.pRNPlan.findUnique({
      where: { uniq_plan_per_program_year: { programId, yearNumber: year } },
    });

    if (!plan) {
      plan = await prisma.pRNPlan.create({ data: { programId, yearNumber: year } });
    }

    // ensure rows (bez brisanja)
    await ensurePlanRows({ programId, yearNumber: year, planId: plan.id, prune: false });

    const full = await prisma.pRNPlan.findUnique({
      id: plan.id,
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

    const facultyName = FACULTY_BY_CODE[full?.program?.code || ""] || "";
    res.json({
      plan: { id: full.id, program: full.program, facultyName, yearNumber: full.yearNumber },
      rows: full.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "PRN plan error", detail: String(e?.message || e) });
  }
});

// ručni sync: POST /api/planrealizacije/plan/seed-rows  { programId, year, prune?: boolean }
router.post("/plan/seed-rows", async (req, res) => {
  const bodySchema = planQuerySchema.extend({ prune: z.boolean().optional() });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const { programId, year, prune = false } = parsed.data;

  try {
    const plan = await prisma.pRNPlan.upsert({
      where: { uniq_plan_per_program_year: { programId, yearNumber: year } },
      update: {},
      create: { programId, yearNumber: year },
    });

    await ensurePlanRows({ programId, yearNumber: year, planId: plan.id, prune });

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

    res.json({
      ok: true,
      plan: { id: full.id, program: full.program, yearNumber: full.yearNumber },
      rows: full.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Seed rows error", detail: String(e?.message || e) });
  }
});

// UPDATE reda (profesor / sati)
const rowUpdateSchema = z.object({
  professorId:  z.string().min(1).nullable().optional(),
  lectureTotal:  z.coerce.number().int().min(0).optional(),
  exerciseTotal: z.coerce.number().int().min(0).optional(),
});

router.put("/rows/:id", async (req, res) => {
  const parsed = rowUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const updated = await prisma.pRNRow.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.professorId  !== undefined ? { professorId:  parsed.data.professorId || null } : {}),
        ...(parsed.data.lectureTotal  !== undefined ? { lectureTotal:  parsed.data.lectureTotal }  : {}),
        ...(parsed.data.exerciseTotal !== undefined ? { exerciseTotal: parsed.data.exerciseTotal } : {}),
      },
      include: { subject: true, professor: true },
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: String(e?.message || e) });
  }
});

// (opcija) lista planova
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
