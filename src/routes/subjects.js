// src/routes/subjects.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

// Zod sheme
const programRefSchema = z.object({
  programId: z.string().min(1),
  yearNumber: z.coerce.number().int().min(1).max(10), // <-- coerce
});

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().trim().min(1).optional(),
  ects: z.number().int().optional(),
  programs: z.array(programRefSchema).min(1, "Odaberi bar jedan program"),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().trim().min(1).optional().nullable(),
  ects: z.number().int().optional().nullable(),
  programs: z.array(programRefSchema).min(1).optional(),
});

// LIST
router.get("/", async (_req, res) => {
  const list = await prisma.subject.findMany({
    orderBy: [{ code: "asc" }, { name: "asc" }],
    include: {
      subjectPrograms: {
        include: { program: true },
      },
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

  try {
    const created = await prisma.$transaction(async (tx) => {
      const subj = await tx.subject.create({
        data: {
          name,
          code: code ?? null,
          ects: typeof ects === "number" ? ects : null,
        },
      });

      await tx.subjectProgram.createMany({
        data: programs.map((p) => ({
          subjectId: subj.id,
          programId: p.programId,
          yearNumber: p.yearNumber,
        })),
      });

      return tx.subject.findUnique({
        where: { id: subj.id },
        include: { subjectPrograms: { include: { program: true } } },
      });
    });

    res.status(201).json(created);
  } catch (e) {
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

      if (programs) {
        await tx.subjectProgram.deleteMany({ where: { subjectId: subj.id } });
        await tx.subjectProgram.createMany({
          data: programs.map((p) => ({
            subjectId: subj.id,
            programId: p.programId,
            yearNumber: p.yearNumber,
          })),
        });
      }

      return tx.subject.findUnique({
        where: { id: subj.id },
        include: { subjectPrograms: { include: { program: true } } },
      });
    });

    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await prisma.subjectProgram.deleteMany({ where: { subjectId: req.params.id } });
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
