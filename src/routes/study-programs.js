// src/routes/study-programs.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

// GET /api/programs
router.get("/", async (_req, res) => {
  const rows = await prisma.studyProgram.findMany({
    orderBy: [{ name: "asc" }],
  });
  res.json(rows);
});

const upsertSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  code: z.string().trim().optional().nullable(),
});

// POST /api/programs
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
    res.json(created);
  } catch (e) {
    res.status(400).json({ message: "Cannot create", detail: String(e?.message || e) });
  }
});

// PUT /api/programs/:id
router.put("/:id", async (req, res) => {
  const parsed = upsertSchema.partial().extend({
    name: z.string().min(1).optional(),
    code: z.string().trim().optional().nullable(),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const updated = await prisma.studyProgram.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: String(e?.message || e) });
  }
});

// DELETE /api/programs/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.studyProgram.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: String(e?.message || e) });
  }
});
