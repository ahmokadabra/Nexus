import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

// Helper: trim + prazno => undefined
const normalize = (s) => {
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t.length ? t : undefined;
};

const professorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

// GET /api/professors
router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

// POST /api/professors
router.post("/", async (req, res) => {
  const parsed = professorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const data = {
    name: req.body.name?.trim(),
    email: normalize(req.body.email), // "" -> undefined
    phone: normalize(req.body.phone), // "" -> undefined
  };

  try {
    const created = await prisma.professor.create({ data });
    return res.status(201).json(created);
  } catch (e) {
    // Prisma unique constraint
    if (e && e.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }
    return res.status(400).json({ message: "DB error", detail: e?.message });
  }
});

// PUT /api/professors/:id
router.put("/:id", async (req, res) => {
  const parsed = professorSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const data = {
    ...(req.body.name != null ? { name: req.body.name.trim() } : {}),
    ...(req.body.email != null ? { email: normalize(req.body.email) } : {}),
    ...(req.body.phone != null ? { phone: normalize(req.body.phone) } : {}),
  };

  try {
    const updated = await prisma.professor.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (e) {
    if (e && e.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }
    return res.status(400).json({ message: "Cannot update", detail: e?.message });
  }
});

// GET /api/professors/:id
router.get("/:id", async (req, res) => {
  const item = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// DELETE /api/professors/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.professor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e?.message });
  }
});
