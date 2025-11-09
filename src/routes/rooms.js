// src/routes/rooms.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const roomSchema = z.object({
  name: z.string().min(1),
  shortCode: z.string().trim().min(1).optional(), // ⬅️ NOVO
  capacity: z
    .union([z.number().int(), z.string().trim()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
  isOnline: z.boolean().optional(),
});

router.get("/", async (_req, res) => {
  try {
    const list = await prisma.room.findMany({ orderBy: { name: "asc" } });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

router.post("/", async (req, res) => {
  const parsed = roomSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const created = await prisma.room.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

router.get("/:id", async (req, res) => {
  const item = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const parsed = roomSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const updated = await prisma.room.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.room.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
