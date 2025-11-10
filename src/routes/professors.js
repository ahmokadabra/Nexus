// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

/** helper: prazno -> undefined, string -> trim */
const emptyToUndef = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return v;
}, z.string().max(254)).optional();

const titleEnum = z
  .enum([
    "PRACTITIONER",
    "ASSISTANT",
    "SENIOR_ASSISTANT",
    "ASSISTANT_PROFESSOR",
    "ASSOCIATE_PROFESSOR",
    "FULL_PROFESSOR",
    "PROFESSOR_EMERITUS",
  ])
  .optional();

const engagementEnum = z.enum(["EMPLOYED", "EXTERNAL"]).optional();

const professorSchema = z.object({
  name: z.string().trim().min(1),
  // Mekša validacija: prihvati bilo koji ne-prazan string (trim),
  // prazno tretiraj kao undefined. Unique constraint i dalje važi u DB.
  email: emptyToUndef,
  phone: emptyToUndef,
  title: titleEnum,
  engagement: engagementEnum,
});

router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({ orderBy: { name: "asc" } });
  res.json(list);
});

router.post("/", async (req, res) => {
  const parsed = professorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  try {
    const created = await prisma.professor.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
    // P2002 = unique constraint (npr. email postoji)
    if (e?.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Email već postoji (unique)", detail: e.meta?.target });
    }
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

router.get("/:id", async (req, res) => {
  const item = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const parsed = professorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  try {
    const updated = await prisma.professor.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Email već postoji (unique)", detail: e.meta?.target });
    }
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

// (Ako već imaš export XLSX rutu /api/professors/export.xlsx, ostaje kako jeste)
