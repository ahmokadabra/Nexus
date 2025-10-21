import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const cycleSchema = z.object({
  name: z.string().min(1),
  dateStart: z.string().optional(), // ISO date
  dateEnd: z.string().optional()
});

router.get("/", async (_req, res) => {
  const list = await prisma.cycle.findMany({ include: { terms: true }, orderBy: { name: "asc" } });
  res.json(list);
});

router.post("/", async (req, res) => {
  const parsed = cycleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const data = {
    name: parsed.data.name,
    dateStart: parsed.data.dateStart ? new Date(parsed.data.dateStart) : undefined,
    dateEnd: parsed.data.dateEnd ? new Date(parsed.data.dateEnd) : undefined
  };
  try {
    const created = await prisma.cycle.create({ data });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: "DB error", detail: e.message });
  }
});

router.get("/:id", async (req,res) => {
  const item = await prisma.cycle.findUnique({ where: { id: req.params.id }, include: { terms: true } });
  if(!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

router.post("/:id/terms", async (req,res) => {
  const termSchema = z.object({
    name: z.string().min(1),
    dateStart: z.string().optional(),
    dateEnd: z.string().optional()
  });
  const parsed = termSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const created = await prisma.term.create({
      data: {
        cycleId: req.params.id,
        name: parsed.data.name,
        dateStart: parsed.data.dateStart ? new Date(parsed.data.dateStart) : undefined,
        dateEnd: parsed.data.dateEnd ? new Date(parsed.data.dateEnd) : undefined
      }
    });
    res.status(201).json(created);
  } catch(e) {
    res.status(400).json({ message: "DB error", detail: e.message });
  }
});
