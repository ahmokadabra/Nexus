// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const titleEnum = z.enum([
  "PRACTITIONER",
  "ASSISTANT",
  "SENIOR_ASSISTANT",
  "DOCENT",
  "ASSOCIATE_PROFESSOR",
  "FULL_PROFESSOR",
  "EMERITUS",
]);

const engagementEnum = z.enum(["EMPLOYED", "EXTERNAL"]); // ⬅️ novo

const baseSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: titleEnum.optional().nullable(),
  engagement: engagementEnum.optional().nullable(), // ⬅️ novo
});

router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  res.json(list);
});

router.post("/", async (req, res) => {
  const cleaned = {
    ...req.body,
    email: req.body?.email ? String(req.body.email).trim() : null,
    phone: req.body?.phone ? String(req.body.phone).trim() : null,
    title: req.body?.title || null,
    engagement: req.body?.engagement || null,
  };
  const parsed = baseSchema.safeParse(cleaned);
  if (!parsed.success)
    return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const created = await prisma.professor.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

router.put("/:id", async (req, res) => {
  const cleaned = {
    ...req.body,
    email: req.body?.email ? String(req.body.email).trim() : null,
    phone: req.body?.phone ? String(req.body.phone).trim() : null,
    title: req.body?.title || null,
    engagement: req.body?.engagement || null,
  };
  const parsed = baseSchema.safeParse(cleaned);
  if (!parsed.success)
    return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const updated = await prisma.professor.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
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
