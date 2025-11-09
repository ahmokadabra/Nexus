// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

/** Helpers */
const cleanStr = (v) => (typeof v === "string" ? v.trim() : v);
const undefIfEmpty = (v) => {
  const s = cleanStr(v);
  return s === "" || s === undefined ? undefined : s;
};

/** Enumi iz Prisma sheme */
const TITLE_VALUES = [
  "PRACTITIONER",
  "ASSISTANT",
  "SENIOR_ASSISTANT",
  "ASSISTANT_PROFESSOR", // Docent
  "ASSOCIATE_PROFESSOR",
  "FULL_PROFESSOR",
  "PROFESSOR_EMERITUS",
];
const ENGAGEMENT_VALUES = ["EMPLOYED", "EXTERNAL"];

/** Zod schema (dozvoljava prazno -> undefined) */
const professorSchema = z.object({
  name: z.string().transform(cleanStr).refine((s) => !!s, "Name is required"),
  email: z
    .string()
    .transform(undefIfEmpty)
    .optional()
    .refine((v) => v === undefined || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: "Invalid email",
    }),
  phone: z.string().transform(undefIfEmpty).optional(),
  title: z.enum(TITLE_VALUES).optional(),
  engagement: z.enum(ENGAGEMENT_VALUES).optional(),
});

/** GET /api/professors?q=&skip=&take=  (q = name/email/phone contains, case-insensitive) */
router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const skip = Number.isFinite(Number(req.query.skip)) ? Number(req.query.skip) : 0;
  const takeRaw = Number.isFinite(Number(req.query.take)) ? Number(req.query.take) : undefined;
  const take = takeRaw && takeRaw > 0 && takeRaw <= 200 ? takeRaw : undefined;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const list = await prisma.professor.findMany({
    where,
    orderBy: { name: "asc" },
    ...(skip ? { skip } : {}),
    ...(take ? { take } : {}),
  });
  res.json(list);
});

/** POST /api/professors */
router.post("/", async (req, res) => {
  const parsed = professorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  try {
    const created = await prisma.professor.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
    if (e && e.code === "P2002") {
      // unique constraint (najčešće email)
      return res.status(409).json({ message: "Email je već zauzet." });
    }
    return res.status(409).json({ message: "DB error", detail: e.message });
  }
});

/** GET /api/professors/:id */
router.get("/:id", async (req, res) => {
  const item = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

/** PUT /api/professors/:id  (partial safe update — prazno -> undefined) */
router.put("/:id", async (req, res) => {
  const parsed = professorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  const data = parsed.data;

  try {
    const updated = await prisma.professor.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (e) {
    if (e && e.code === "P2002") {
      return res.status(409).json({ message: "Email je već zauzet." });
    }
    if (e && e.code === "P2025") {
      return res.status(404).json({ message: "Not found" });
    }
    return res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

/** DELETE /api/professors/:id */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.professor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e && e.code === "P2025") {
      return res.status(404).json({ message: "Not found" });
    }
    return res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
