import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const profSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional()
});

router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({ orderBy: { name: "asc" } });
  res.json(list);
});

router.post("/", async (req, res) => {
  const parsed = profSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const created = await prisma.professor.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

router.get("/:id", async (req, res) => {
  const item = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const parsed = profSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const updated = await prisma.professor.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.professor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
