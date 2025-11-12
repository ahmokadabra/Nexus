// src/routes/planrealizacije.js
import { Router } from "express";
import { prisma } from "../prisma.js";

export const router = Router();

// Health check
router.get("/health", (_req, res) => {
  res.json({ ok: true, scope: "planrealizacije" });
});

// (opcionalno) Listaj PRN planove, filter po programId/yearNumber
router.get("/", async (req, res) => {
  try {
    const { programId, year } = req.query;
    const where = {};
    if (programId) where.programId = String(programId);
    if (year) where.yearNumber = Number(year);

    const plans = await prisma.pRNPlan.findMany({
      where,
      include: {
        program: true,
        rows: { include: { subject: true, professor: true } },
      },
      orderBy: [{ yearNumber: "asc" }],
    });

    res.json(plans);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

export default router;
