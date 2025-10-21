import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const programSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional()
});

router.get("/", async (_req, res) => {
  const list = await prisma.studyProgram.findMany({ include: { years: true }, orderBy: { name: "asc" } });
  res.json(list);
});

router.post("/", async (req,res) => {
  const parsed = programSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const created = await prisma.studyProgram.create({ data: parsed.data });
    res.status(201).json(created);
  } catch(e) {
    res.status(400).json({ message: "DB error", detail: e.message });
  }
});

router.post("/:id/years", async (req,res) => {
  const yearSchema = z.object({ yearNumber: z.number().int().min(1) });
  const parsed = yearSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const created = await prisma.programYear.create({
      data: { programId: req.params.id, yearNumber: parsed.data.yearNumber }
    });
    res.status(201).json(created);
  } catch(e) {
    res.status(400).json({ message: "DB error", detail: e.message });
  }
});
