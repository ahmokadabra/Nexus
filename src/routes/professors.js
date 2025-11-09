// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import ExcelJS from "exceljs";

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

/** Lokalizacija (za Excel i API kad treba) */
const prettyTitle = (t) =>
  ({
    PRACTITIONER: "Stručnjak iz prakse",
    ASSISTANT: "Asistent",
    SENIOR_ASSISTANT: "Viši asistent",
    ASSISTANT_PROFESSOR: "Docent",
    ASSOCIATE_PROFESSOR: "Vanredni profesor",
    FULL_PROFESSOR: "Redovni profesor",
    PROFESSOR_EMERITUS: "Profesor emeritus"
  }[t] || "-");

const prettyEngagement = (e) =>
  ({
    EMPLOYED: "Radni odnos",
    EXTERNAL: "Vanjski saradnik"
  }[e] || "-");

/** Zod schema */
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

/** GET /api/professors?q=&skip=&take= */
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

/** PUT /api/professors/:id */
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

/** GET /api/professors/export.xlsx  -> Excel download */
router.get("/export.xlsx", async (_req, res) => {
  const rows = await prisma.professor.findMany({
    orderBy: { name: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexus";
  wb.created = new Date();

  const ws = wb.addWorksheet("Profesori");

  ws.columns = [
    { header: "ID",            key: "id",          width: 25 },
    { header: "Ime i prezime", key: "name",        width: 30 },
    { header: "Email",         key: "email",       width: 30 },
    { header: "Telefon",       key: "phone",       width: 18 },
    { header: "Zvanje",        key: "title",       width: 24 },
    { header: "Angažman",      key: "engagement",  width: 20 },
    { header: "Kreirano",      key: "createdAt",   width: 22 },
    { header: "Ažurirano",     key: "updatedAt",   width: 22 }
  ];

  // Header bold
  ws.getRow(1).font = { bold: true };

  const fmt = (d) => (d ? new Date(d).toLocaleString("bs-BA") : "");

  rows.forEach((p) => {
    ws.addRow({
      id: p.id,
      name: p.name || "",
      email: p.email || "",
      phone: p.phone || "",
      title: p.title ? prettyTitle(p.title) : "-",
      engagement: p.engagement ? prettyEngagement(p.engagement) : "-",
      createdAt: fmt(p.createdAt),
      updatedAt: fmt(p.updatedAt),
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", 'attachment; filename="profesori.xlsx"');

  await wb.xlsx.write(res);
  res.end();
});
