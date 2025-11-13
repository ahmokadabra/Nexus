// src/routes/subjects.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const semesterEnum = z.enum(["ZIMSKI", "LJETNI"]);

// Zod sheme
const programRefSchema = z.object({
  programId: z.string().min(1),
  yearNumber: z.coerce.number().int().min(1).max(10),
  semester: semesterEnum, // <--- NOVO
});

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().trim().min(1).optional(),
  ects: z.coerce.number().int().optional(),
  programs: z.array(programRefSchema).min(1, "Odaberi bar jedan program"),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().trim().min(1).optional().nullable(),
  ects: z.coerce.number().int().optional().nullable(),
  programs: z.array(programRefSchema).min(1).optional(),
});

// LIST
router.get("/", async (_req, res) => {
  const list = await prisma.subject.findMany({
    orderBy: [{ code: "asc" }, { name: "asc" }],
    include: {
      subjectPrograms: { include: { program: true } },
    },
  });
  res.json(list);
});

// CREATE
router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  const { name, code, ects, programs } = parsed.data;

  // dedupe po (programId, yearNumber, semester)
  const map = new Map();
  for (const p of programs) {
    const key = `${p.programId}:${p.yearNumber}:${p.semester}`;
    map.set(key, { programId: p.programId, yearNumber: Number(p.yearNumber) || 1, semester: p.semester });
  }
  const cleanPrograms = Array.from(map.values());

  try {
    const created = await prisma.$transaction(async (tx) => {
      const subj = await tx.subject.create({
        data: {
          name,
          code: code ?? null,
          ects: typeof ects === "number" ? ects : null,
        },
      });

      await tx.subjectOnProgramYear.createMany({
        data: cleanPrograms.map((p) => ({
          subjectId: subj.id,
          programId: p.programId,
          yearNumber: p.yearNumber,
          semester: p.semester,
        })),
        skipDuplicates: true,
      });

      return tx.subject.findUnique({
        where: { id: subj.id },
        include: { subjectPrograms: { include: { program: true } } },
      });
    });

    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ message: "Program ne postoji (FK)", detail: e.message });
    if (e?.code === "P2002") return res.status(409).json({ message: "Duplikat (subject-program)", detail: e.message });
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

// READ
router.get("/:id", async (req, res) => {
  const item = await prisma.subject.findUnique({
    where: { id: req.params.id },
    include: { subjectPrograms: { include: { program: true } } },
  });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// UPDATE
router.put("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  const { name, code, ects, programs } = parsed.data;

  let cleanPrograms = null;
  if (programs) {
    const map = new Map();
    for (const p of programs) {
      const key = `${p.programId}:${p.yearNumber}:${p.semester}`;
      map.set(key, { programId: p.programId, yearNumber: Number(p.yearNumber) || 1, semester: p.semester });
    }
    cleanPrograms = Array.from(map.values());
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const subj = await tx.subject.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(code !== undefined ? { code } : {}),
          ...(ects !== undefined ? { ects } : {}),
        },
      });

      if (cleanPrograms) {
        await tx.subjectOnProgramYear.deleteMany({ where: { subjectId: subj.id } });
        await tx.subjectOnProgramYear.createMany({
          data: cleanPrograms.map((p) => ({
            subjectId: subj.id,
            programId: p.programId,
            yearNumber: p.yearNumber,
            semester: p.semester,
          })),
          skipDuplicates: true,
        });
      }

      return tx.subject.findUnique({
        where: { id: subj.id },
        include: { subjectPrograms: { include: { program: true } } },
      });
    });

    res.json(updated);
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ message: "Program ne postoji (FK)", detail: e.message });
    if (e?.code === "P2002") return res.status(409).json({ message: "Duplikat (subject-program)", detail: e.message });
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await prisma.subjectOnProgramYear.deleteMany({ where: { subjectId: req.params.id } });
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
