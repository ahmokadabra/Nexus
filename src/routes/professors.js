// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const profSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

// GET /api/professors
router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  res.json(list);
});

// GET /api/professors/:id
router.get("/:id", async (req, res) => {
  const item = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// POST /api/professors
router.post("/", async (req, res) => {
  const parsed = profSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  // Normalizuj prazne stringove u undefined (zbog optional polja)
  const data = {
    name: parsed.data.name,
    email: parsed.data.email?.trim() || undefined,
    phone: parsed.data.phone?.trim() || undefined,
  };

  try {
    const created = await prisma.professor.create({ data });
    res.status(201).json(created);
  } catch (e) {
    // Prisma unique constraint
    if (e.code === "P2002") {
      return res.status(409).json({ code: e.code, message: "Email already exists." });
    }
    res.status(400).json({ message: "DB error", detail: e.message });
  }
});

// PUT /api/professors/:id
router.put("/:id", async (req, res) => {
  const parsed = profSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const data = {
    name: parsed.data.name,
    email: parsed.data.email?.trim() || undefined,
    phone: parsed.data.phone?.trim() || undefined,
  };

  try {
    const updated = await prisma.professor.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ code: e.code, message: "Email already exists." });
    }
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

// DELETE /api/professors/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.professor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
