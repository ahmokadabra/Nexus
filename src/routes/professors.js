// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

/**
 * Mapiranje BOSANSKI_KOD -> ENGLISH_KOD (kanonske vrijednosti u bazi)
 * Ako ti je baza napravljena sa engleskim enum vrijednostima, ovo će upisivati ispravne.
 * Ako ti je baza ipak na bosanskom, vidi ALTERNATIVU ispod (zamijeni mape).
 */
const TITLE_BS_TO_EN = {
  "STRUČNJAK_IZ_PRAKSE": "PRACTITIONER",
  "ASISTENT": "ASSISTANT",
  "VIŠI_ASISTENT": "SENIOR_ASSISTANT",
  "DOCENT": "ASSISTANT_PROFESSOR", // najbliži ekvivalent
  "VANREDNI_PROFESOR": "ASSOCIATE_PROFESSOR",
  "REDOVNI_PROFESOR": "FULL_PROFESSOR",
  "PROFESOR_EMERITUS": "PROFESSOR_EMERITUS",
};

const ENGAGEMENT_BS_TO_EN = {
  "RADNI_ODNOS": "EMPLOYED",
  "VANJSKI_SARADNIK": "EXTERNAL",
};

// Dozvoli i legacy engleske vrijednosti da samo “prođu”
const TITLE_ALLOWED = new Set([
  ...Object.keys(TITLE_BS_TO_EN),
  "PRACTITIONER",
  "ASSISTANT",
  "SENIOR_ASSISTANT",
  "ASSISTANT_PROFESSOR",
  "ASSOCIATE_PROFESSOR",
  "FULL_PROFESSOR",
  "PROFESSOR_EMERITUS",
]);

const ENGAGEMENT_ALLOWED = new Set([
  ...Object.keys(ENGAGEMENT_BS_TO_EN),
  "EMPLOYED",
  "EXTERNAL",
]);

function normalizeTitle(val) {
  if (!val) return undefined;
  if (TITLE_BS_TO_EN[val]) return TITLE_BS_TO_EN[val]; // bosanski -> engleski
  if (TITLE_ALLOWED.has(val)) return val; // već je engleski/legacy
  return undefined; // nepoznato -> ignoriši
}

function normalizeEngagement(val) {
  if (!val) return undefined;
  if (ENGAGEMENT_BS_TO_EN[val]) return ENGAGEMENT_BS_TO_EN[val];
  if (ENGAGEMENT_ALLOWED.has(val)) return val;
  return undefined;
}

const baseSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional().or(z.literal("").transform(() => undefined)),
  title: z.string().optional(),       // prihvati bilo šta, pa normalizuj
  engagement: z.string().optional(),  // prihvati bilo šta, pa normalizuj
});

// LIST
router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

// CREATE
router.post("/", async (req, res) => {
  const parsed = baseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const data = parsed.data;

  const payload = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    title: normalizeTitle(data.title),
    engagement: normalizeEngagement(data.engagement),
  };

  try {
    const created = await prisma.professor.create({ data: payload });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: "DB error", detail: e.message });
  }
});

// READ one
router.get("/:id", async (req, res) => {
  const item = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// UPDATE
router.put("/:id", async (req, res) => {
  const parsed = baseSchema.partial().extend({ name: z.string().min(1).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const data = parsed.data;

  const payload = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.email !== undefined ? { email: data.email || undefined } : {}),
    ...(data.phone !== undefined ? { phone: data.phone || undefined } : {}),
    ...(data.title !== undefined ? { title: normalizeTitle(data.title) } : {}),
    ...(data.engagement !== undefined ? { engagement: normalizeEngagement(data.engagement) } : {}),
  };

  try {
    const updated = await prisma.professor.update({
      where: { id: req.params.id },
      data: payload,
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: "DB error", detail: e.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await prisma.professor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
