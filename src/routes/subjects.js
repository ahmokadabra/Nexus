// src/routes/subjects.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import ExcelJS from "exceljs";

export const router = Router();

const subjectSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  ects: z.number().int().nullable().optional(),
  // lista programYearId-ova na kojima se predmet sluša
  programYearIds: z.array(z.string().min(1)).optional(),
});

// GET /api/subjects
router.get("/", async (_req, res) => {
  const list = await prisma.subject.findMany({
    orderBy: [{ code: "asc" }, { name: "asc" }],
    include: {
      onProgramYears: {
        include: {
          programYear: { include: { program: true } },
        },
      },
    },
  });
  res.json(list);
});

// POST /api/subjects
router.post("/", async (req, res) => {
  const parsed = subjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const { programYearIds = [], ...fields } = parsed.data;
  try {
    const created = await prisma.subject.create({
      data: {
        code: fields.code,
        name: fields.name,
        ects: fields.ects ?? null,
        onProgramYears: programYearIds.length
          ? {
              create: programYearIds.map((pyid) => ({ programYearId: pyid })),
            }
          : undefined,
      },
      include: {
        onProgramYears: {
          include: { programYear: { include: { program: true } } },
        },
      },
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(409).json({ message: "DB error", detail: e.message });
  }
});

// GET /api/subjects/:id
router.get("/:id", async (req, res) => {
  const item = await prisma.subject.findUnique({
    where: { id: req.params.id },
    include: {
      onProgramYears: {
        include: { programYear: { include: { program: true } } },
      },
    },
  });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// PUT /api/subjects/:id
router.put("/:id", async (req, res) => {
  const parsed = subjectSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const { programYearIds, ...fields } = parsed.data;

  try {
    // update osnovnih polja
    const updated = await prisma.subject.update({
      where: { id: req.params.id },
      data: {
        ...(fields.code !== undefined ? { code: fields.code } : {}),
        ...(fields.name !== undefined ? { name: fields.name } : {}),
        ...(fields.ects !== undefined ? { ects: fields.ects ?? null } : {}),
      },
    });

    // ako je poslana lista veza, refresh veza
    if (Array.isArray(programYearIds)) {
      await prisma.subjectOnProgramYear.deleteMany({ where: { subjectId: req.params.id } });
      if (programYearIds.length) {
        await prisma.subjectOnProgramYear.createMany({
          data: programYearIds.map((pyid) => ({
            subjectId: req.params.id,
            programYearId: pyid,
          })),
          skipDuplicates: true,
        });
      }
    }

    const full = await prisma.subject.findUnique({
      where: { id: req.params.id },
      include: {
        onProgramYears: {
          include: { programYear: { include: { program: true } } },
        },
      },
    });

    res.json(full);
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: e.message });
  }
});

// DELETE /api/subjects/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.subjectOnProgramYear.deleteMany({ where: { subjectId: req.params.id } });
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});

// GET /api/subjects/export.xlsx
router.get("/export.xlsx", async (_req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: [{ code: "asc" }, { name: "asc" }],
      include: {
        onProgramYears: {
          include: { programYear: { include: { program: true } } },
        },
      },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Predmeti");

    ws.columns = [
      { header: "Code", key: "code", width: 12 },
      { header: "Name", key: "name", width: 32 },
      { header: "ECTS", key: "ects", width: 8 },
      { header: "Programs/Years", key: "programs", width: 50 },
    ];

    for (const s of subjects) {
      const tags = (s.onProgramYears || [])
        .map((op) => `${op.programYear.program.name} — Year ${op.programYear.yearNumber}`)
        .join(", ");
      ws.addRow({
        code: s.code,
        name: s.name,
        ects: s.ects ?? "",
        programs: tags,
      });
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="predmeti.xlsx"');

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ message: "Export error", detail: e.message });
  }
});
