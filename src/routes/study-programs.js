// src/routes/study-programs.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const ProgramSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  code: z.string().trim().min(1, "Šifra je obavezna").max(16).optional().nullable(),
});

// Health
router.get("/health", (_req, res) => res.json({ ok: true, scope: "programs" }));

// GET /api/programs  -> lista studijskih programa
router.get("/", async (_req, res) => {
  const programs = await prisma.studyProgram.findMany({
    orderBy: [{ name: "asc" }],
  });
  res.json(programs);
});

// POST /api/programs -> kreiraj program
router.post("/", async (req, res) => {
  const parsed = ProgramSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const created = await prisma.studyProgram.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code ?? null,
      },
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: "Ne mogu kreirati program", detail: e.message });
  }
});

// PUT /api/programs/:id -> izmijeni program
router.put("/:id", async (req, res) => {
  const parsed = ProgramSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const updated = await prisma.studyProgram.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.code !== undefined ? { code: parsed.data.code ?? null } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "Ne mogu ažurirati program", detail: e.message });
  }
});

// DELETE /api/programs/:id -> obriši program
router.delete("/:id", async (req, res) => {
  try {
    await prisma.studyProgram.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    res.status(400).json({
      message: "Ne mogu obrisati program (postoje povezani podaci?)",
      detail: e.message,
    });
  }
});

// POST /api/programs/seed-defaults -> ubaci 5 standardnih programa (idempotentno)
router.post("/seed-defaults", async (_req, res) => {
  const DEFAULTS = [
    { code: "FIR",  name: "Finansije i računovodstvo" },
    { code: "SMDP", name: "Strateški menadžment i digitalno poslovanje" },
    { code: "RI",   name: "Računarstvo i informatika" },
    { code: "TUG",  name: "Turizam, ugostiteljstvo i gastronomija" },
    { code: "EP",   name: "Ekološko poljoprivredarstvo" },
  ];

  const results = [];
  for (const p of DEFAULTS) {
    const up = await prisma.studyProgram.upsert({
      where: { code: p.code },
      update: { name: p.name },
      create: { code: p.code, name: p.name },
    });
    results.push(up);
  }
  res.json({ ok: true, count: results.length, programs: results });
});
