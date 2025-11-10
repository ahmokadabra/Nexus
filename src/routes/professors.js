// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import ExcelJS from "exceljs";

export const router = Router();

/* -------------------------- helpers (Zod & labels) ------------------------- */

// Pretvori "" ili null -> undefined; inače trim string (max 254)
const softString = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "string") return v.trim();
  return v;
}, z.string().max(254)).optional();

// Enum koji prihvata "", null -> undefined
const optionalEnum = (values) =>
  z
    .preprocess((v) => (v === "" || v === null ? undefined : v), z.enum(values))
    .optional();

const titleValues = [
  "PRACTITIONER",
  "ASSISTANT",
  "SENIOR_ASSISTANT",
  "ASSISTANT_PROFESSOR",
  "ASSOCIATE_PROFESSOR",
  "FULL_PROFESSOR",
  "PROFESSOR_EMERITUS",
];

const engagementValues = ["EMPLOYED", "EXTERNAL"];

// Create (mora imati name)
const createSchema = z.object({
  name: z.string().trim().min(1),
  email: softString,
  phone: softString,
  title: optionalEnum(titleValues),
  engagement: optionalEnum(engagementValues),
});

// Update (sve opcionalno; partial update)
const updateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: softString,
    phone: softString,
    title: optionalEnum(titleValues),
    engagement: optionalEnum(engagementValues),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

// mapiranja za Excel (bosanski prikaz)
const TITLE_LABEL = {
  PRACTITIONER: "Stručnjak iz prakse",
  ASSISTANT: "Asistent",
  SENIOR_ASSISTANT: "Viši asistent",
  ASSISTANT_PROFESSOR: "Docent",
  ASSOCIATE_PROFESSOR: "Vanredni profesor",
  FULL_PROFESSOR: "Redovni profesor",
  PROFESSOR_EMERITUS: "Profesor emeritus",
};
const ENGAGEMENT_LABEL = {
  EMPLOYED: "Radni odnos",
  EXTERNAL: "Vanjski saradnik",
};

/* ------------------------------- EXPORT XLSX ------------------------------- */
/* VAŽNO: ova ruta MORA biti prije "/:id" da ne završi kao dinamički parametar! */
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
      title: p.title ? TITLE_LABEL[p.title] ?? p.title : "",
      engagement: p.engagement ? ENGAGEMENT_LABEL[p.engagement] ?? p.engagement : "",
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

/* ---------------------------------- CRUD ----------------------------------- */

router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({ orderBy: { name: "asc" } });
  res.json(list);
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  try {
    const created = await prisma.professor.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Email već postoji (unique)", detail: e.meta?.target });
    }
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

router.put("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
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
