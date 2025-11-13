// src/routes/study-programs.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

/**
 * GET /api/programs
 * Vraća sve programe + njihove godine (asc).
 */
router.get("/", async (_req, res) => {
  const rows = await prisma.studyProgram.findMany({
    orderBy: [{ name: "asc" }],
    include: { years: { orderBy: { yearNumber: "asc" } } },
  });
  res.json(rows);
});

const upsertSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  code: z.string().trim().optional().nullable(),
});

/**
 * POST /api/programs
 * Kreira program (ako je code dat i postoji -> upsert po code).
 */
router.post("/", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const data = parsed.data;
    let created;
    if (data.code) {
      created = await prisma.studyProgram.upsert({
        where: { code: data.code },
        update: { name: data.name },
        create: { name: data.name, code: data.code },
      });
    } else {
      created = await prisma.studyProgram.create({ data: { name: data.name } });
    }
    // vrati i years da UI odmah vidi stanje
    const withYears = await prisma.studyProgram.findUnique({
      where: { id: created.id },
      include: { years: { orderBy: { yearNumber: "asc" } } },
    });
    res.json(withYears);
  } catch (e) {
    res.status(400).json({ message: "Cannot create", detail: String(e?.message || e) });
  }
});

/**
 * PUT /api/programs/:id
 * Update imena/koda.
 */
router.put("/:id", async (req, res) => {
  const schema = upsertSchema.partial().extend({
    name: z.string().min(1).optional(),
    code: z.string().trim().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    await prisma.studyProgram.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    const withYears = await prisma.studyProgram.findUnique({
      where: { id: req.params.id },
      include: { years: { orderBy: { yearNumber: "asc" } } },
    });
    res.json(withYears);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: String(e?.message || e) });
  }
});

/**
 * DELETE /api/programs/:id
 * Napomena: ako postoje zavisni redovi (ProgramYear, SubjectOnProgramYear, PRNPlan),
 * ovo može pasti zbog FK ograničenja. Ostavljen je osnovni delete kao i ranije.
 */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.studyProgram.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: String(e?.message || e) });
  }
});

/**
 * POST /api/programs/:id/years
 * Dodaje godinu programu (1..10), sprječava duplikat.
 */
router.post("/:id/years", async (req, res) => {
  const schema = z.object({ yearNumber: z.coerce.number().int().min(1).max(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const programId = req.params.id;
  const { yearNumber } = parsed.data;

  const prog = await prisma.studyProgram.findUnique({ where: { id: programId } });
  if (!prog) return res.status(404).json({ message: "Program not found" });

  const exists = await prisma.programYear.findFirst({ where: { programId, yearNumber } });
  if (exists) return res.status(409).json({ message: "Year already exists for this program" });

  const created = await prisma.programYear.create({ data: { programId, yearNumber } });
  res.status(201).json(created);
});

/**
 * DELETE /api/programs/:id/years/:yearNumber
 * Briše godinu po broju.
 */
router.delete("/:id/years/:yearNumber", async (req, res) => {
  const programId = req.params.id;
  const yearNumber = Number(req.params.yearNumber);
  await prisma.programYear.deleteMany({ where: { programId, yearNumber } });
  res.json({ ok: true });
});

/**
 * (Opcionalno) GET /api/programs/:id
 * Ako ti zatreba u UI-ju.
 */
router.get("/:id", async (req, res) => {
  const row = await prisma.studyProgram.findUnique({
    where: { id: req.params.id },
    include: { years: { orderBy: { yearNumber: "asc" } } },
  });
  if (!row) return res.status(404).json({ message: "Not found" });
  res.json(row);
});
