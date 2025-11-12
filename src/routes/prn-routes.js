// src/routes/prn-routes.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const planQuerySchema = z.object({
  programId: z.string().min(1),
  year: z.coerce.number().int().min(1).max(10),
});

// Mapiranje program.code -> naziv fakulteta (za header)
const FACILITY_BY_CODE = {
  FIR: "Ekonomski fakultet",
  SMDP: "Ekonomski fakultet",
  RI: "Tehnički fakultet",
  TUG: "Fakultet turizma, ugostiteljstva i gastronomije",
  EP: "Biotehnički fakultet",
};

// Lista studijskih programa (za dropdown)
router.get("/programs", async (_req, res) => {
  try {
    const programs = await prisma.studyProgram.findMany({
      orderBy: { name: "asc" },
    });
    res.json(programs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/prn/plan?programId=&year=
// Ako plan ne postoji, kreiramo ga i popunimo redove iz SubjectProgram (za dati programId + year)
router.get("/plan", async (req, res) => {
  const parsed = planQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  const { programId, year } = parsed.data;

  try {
    // provjeri da program postoji
    const program = await prisma.studyProgram.findUnique({
      where: { id: programId },
    });
    if (!program) return res.status(404).json({ message: "Program not found" });

    // pokušaj pronaći postojeći plan po kompozitnom ključu
    let plan = await prisma.pRNPlan.findUnique({
      where: { programId_yearNumber: { programId, yearNumber: year } },
    });

    // ako ne postoji — kreiraj i seed-aj redove iz SubjectProgram za tu godinu
    if (!plan) {
      plan = await prisma.pRNPlan.create({
        data: { programId, yearNumber: year },
      });

      const subjectLinks = await prisma.subjectProgram.findMany({
        where: { programId, yearNumber: year },
        select: { subjectId: true },
      });

      const uniqueSubjectIds = [...new Set(subjectLinks.map(s => s.subjectId))];
      if (uniqueSubjectIds.length) {
        await prisma.pRNRow.createMany({
          data: uniqueSubjectIds.map((sid) => ({
            planId:       plan.id,
            subjectId:    sid,
            lectureTotal: 0,
            exerciseTotal: 0,
            // professorId: null by default
          })),
          skipDuplicates: true,
        });
      }
    }

    // vrati plan sa detaljima
    const full = await prisma.pRNPlan.findUnique({
      where: { id: plan.id },
      include: {
        program: true,
        rows: {
          include: {
            subject: {
              include: { subjectPrograms: { include: { program: true } } },
            },
            professor: true,
          },
        },
      },
    });

    const facultyName = FACILITY_BY_CODE[full?.program?.code || ""] || "";

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
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

// Ažuriranje jednog reda PRN-a (profesor + ukupni sati)
const rowUpdateSchema = z.object({
  professorId:  z.string().min(1).nullable().optional(),
  lectureTotal: z.coerce.number().int().min(0).optional(),
  exerciseTotal:z.coerce.number().int().min(0).optional(),
});

router.put("/rows/:id", async (req, res) => {
  const parsed = rowUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  try {
    const updated = await prisma.pRNRow.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.professorId !== undefined
          ? { professorId: parsed.data.professorId || null }
          : {}),
        ...(parsed.data.lectureTotal  !== undefined ? { lectureTotal:  parsed.data.lectureTotal }  : {}),
        ...(parsed.data.exerciseTotal !== undefined ? { exerciseTotal: parsed.data.exerciseTotal } : {}),
      },
      include: { subject: true, professor: true },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

export default router;
