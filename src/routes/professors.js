// src/routes/professors.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import ExcelJS from "exceljs";

export const router = Router();

const titleEnum = z.enum([
  "PRACTITIONER",
  "ASSISTANT",
  "SENIOR_ASSISTANT",
  "ASSISTANT_PROFESSOR",
  "ASSOCIATE_PROFESSOR",
  "FULL_PROFESSOR",
  "PROFESSOR_EMERITUS",
]).optional();

const engagementEnum = z.enum(["EMPLOYED", "EXTERNAL"]).optional();

const professorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: titleEnum,
  engagement: engagementEnum,
});

// --- helpers: prikaz na bosanskom/hrv/srp ---
function titleLabel(t) {
  switch (t) {
    case "PRACTITIONER": return "Stručnjak iz prakse";
    case "ASSISTANT": return "Asistent";
    case "SENIOR_ASSISTANT": return "Viši asistent";
    case "ASSISTANT_PROFESSOR": return "Docent";
    case "ASSOCIATE_PROFESSOR": return "Vanredni profesor";
    case "FULL_PROFESSOR": return "Redovni profesor";
    case "PROFESSOR_EMERITUS": return "Profesor emeritus";
    default: return "";
  }
}

function engagementLabel(e) {
  switch (e) {
    case "EMPLOYED": return "Radni odnos";
    case "EXTERNAL": return "Vanjski saradnik";
    default: return "";
  }
}
// --------------------------------------------

router.get("/", async (_req, res) => {
  const list = await prisma.professor.findMany({ orderBy: { name: "asc" } });
  res.json(list);
});

router.post("/", async (req, res) => {
  const parsed = professorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const created = await prisma.professor.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
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
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const updated = await prisma.professor.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(updated);
  } catch (e) {
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

// >>> XLSX export <<<
router.get("/export.xlsx", async (_req, res) => {
  try {
    const list = await prisma.professor.findMany({ orderBy: { name: "asc" } });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Profesori");

    ws.columns = [
      { header: "Ime i prezime", key: "name", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Telefon", key: "phone", width: 20 },
      { header: "Zvanje", key: "title", width: 24 },
      { header: "Angažman", key: "engagement", width: 20 },
    ];

    list.forEach(p => {
      ws.addRow({
        name: p.name,
        email: p.email ?? "",
        phone: p.phone ?? "",
        title: titleLabel(p.title),
        engagement: engagementLabel(p.engagement),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="profesori.xlsx"'
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Export failed", detail: e.message });
  }
});
