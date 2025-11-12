// src/routes/study-programs.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

// GET /api/study-programs -> lista
router.get("/", async (_req, res) => {
  const rows = await prisma.studyProgram.findMany({
    orderBy: [{ name: "asc" }],
  });
  res.json(rows);
});

// GET /api/study-programs/:id
router.get("/:id", async (req, res) => {
  const row = await prisma.studyProgram.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!row) return res.status(404).json({ message: "Not found" });
  res.json(row);
});

// POST /api/study-programs
const upsertSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  code: z.string().trim().optional().nullable(), // može null/prazno
});
router.post("/", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  const { name, code } = parsed.data;
  try {
    const created = await prisma.studyProgram.create({
      data: { name, code: code?.trim() || null },
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: "Cannot create", detail: e.message });
  }
});

// PUT /api/study-programs/:id
router.put("/:id", async (req, res) => {
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  const { name, code } = parsed.data;
  try {
    const updated = await prisma.studyProgram.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code: code?.trim() || null } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

// DELETE /api/study-programs/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.studyProgram.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
