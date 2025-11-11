// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import ExcelJS from "exceljs";

export const router = Router();

/* ------------------------------ helpers ------------------------------ */

// mapiraj “legacy” vrijednosti na nove
function normalizeTitle(v) {
  if (v === "" || v == null) return undefined;
  const u = String(v).toUpperCase();
  const alias = {
    DOCENT: "ASSISTANT_PROFESSOR",      // stara vrijednost -> nova
    EMERITUS: "PROFESSOR_EMERITUS",     // stara vrijednost -> nova
  };
  return alias[u] || u;
}

const TITLE_VALUES = [
  "PRACTITIONER",
  "ASSISTANT",
  "SENIOR_ASSISTANT",
  "ASSISTANT_PROFESSOR",
  "ASSOCIATE_PROFESSOR",
  "FULL_PROFESSOR",
  "PROFESSOR_EMERITUS",
];

const ENGAGEMENT_VALUES = ["EMPLOYED", "EXTERNAL"];

const softString = z
  .preprocess((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    if (typeof v === "string") return v.trim();
    return v;
  }, z.string().max(254))
  .optional();

const titleField = z
  .preprocess((v) => normalizeTitle(v), z.enum(TITLE_VALUES))
  .optional();

const engagementField = z
  .preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(ENGAGEMENT_VALUES))
  .optional();

// create: zahtijeva name
const createSchema = z.object({
  name: z.string().trim().min(1),
  email: softString,
  phone: softString,
  title: titleField,
  engagement: engagementField,
});

// update: partial (sve opcionalno)
const updateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: softString,
    phone: softString,
    title: titleField,
    engagement: engagementField,
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

// labeli za Excel
const TITLE_LABEL = {
  PRACTITIONER: "Stručnjak iz prakse",
  ASSISTANT: "Asistent",
  SENIOR_ASSISTANT: "Viši asistent",
  ASSISTANT_PROFESSOR: "Docent",
  ASSOCIATE_PROFESSOR: "Vanredni profesor",
  FULL_PROFESSOR: "Redovni profesor",
  PROFESSOR_EMERITUS: "Profesor emeritus",
  // fallback — ako u bazi još uvijek zatekneš legacy vrijednost:
  DOCENT: "Docent",
  EMERITUS: "Profesor emeritus",
};

const ENGAGEMENT_LABEL = {
  EMPLOYED: "Radni odnos",
  EXTERNAL: "Vanjski saradnik",
};

/* --------------------------- export .xlsx (TOP) --------------------------- */
// Mora ići prije "/:id" rute.
router.get("/export.xlsx", async (_req, res) => {
  const list = await prisma.professor.findMany({ orderBy: { name: "asc" } });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Profesori");

  ws.columns = [
    { header: "Ime i prezime", key: "name", width: 32 },
    { header: "Email", key: "email", width: 32 },
    { header: "Telefon", key: "phone", width: 18 },
    { header: "Zvanje", key: "title", width: 24 },
    { header: "Angažman", key: "engagement", width: 20 },
  ];

  for (const p of list) {
    ws.addRow({
      name: p.name ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      title: p.title ? (TITLE_LABEL[p.title] || p.title) : "",
      engagement: p.engagement ? (ENGAGEMENT_LABEL[p.engagement] || p.engagement) : "",
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", 'attachment; filename="profesori.xlsx"');

  await wb.xlsx.write(res);
  res.end();
});

/* --------------------------------- CRUD --------------------------------- */

router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({ orderBy: { name: "asc" } });
  res.json(list);
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const created = await prisma.professor.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Email već postoji (unique)", detail: e.meta?.target });
    }
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

router.put("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const updated = await prisma.professor.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Email već postoji (unique)", detail: e.meta?.target });
    }
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

router.get("/:id", async (req, res) => {
  const item = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.professor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});
