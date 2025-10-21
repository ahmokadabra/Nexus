import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const termSchema = z.object({
  cycleId: z.string().min(1),
  name: z.string().min(1),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional()
});

router.get("/", async (req, res) => {
  const list = await prisma.term.findMany({ orderBy: { dateStart: "desc" }, include: { cycle: true } });
  res.json(list);
});

router.post("/", async (req, res) => {
  const parsed = termSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  // check cycle exists
  const cycle = await prisma.cycle.findUnique({ where: { id: parsed.data.cycleId } });
  if (!cycle) return res.status(400).json({ message: "cycleId not found" });

  const payload = {
    cycleId: parsed.data.cycleId,
    name: parsed.data.name,
    dateStart: parsed.data.dateStart ? new Date(parsed.data.dateStart) : undefined,
    dateEnd: parsed.data.dateEnd ? new Date(parsed.data.dateEnd) : undefined
  };

  try {
    const created = await prisma.term.create({ data: payload });
    res.status(201).json(created);
  } catch (e) {
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

router.get("/:id", async (req, res) => {
  const t = await prisma.term.findUnique({ where: { id: req.params.id }, include: { cycle: true } });
  if (!t) return res.status(404).json({ message: "Not found" });
  res.json(t);
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.term.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
