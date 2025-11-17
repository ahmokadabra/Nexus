// src/routes/planrealizacije.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const planQuerySchema = z.object({
  programId: z.string().min(1),
  year: z.coerce.number().int().min(1).max(10),
});

// Header fakulteta po kodu programa
const FACULTY_BY_CODE = {
  FIR: "Ekonomski fakultet",
  SMDP: "Ekonomski fakultet",
  RI: "Tehnički fakultet",
  TUG: "Fakultet turizma, ugostiteljstva i gastronomije",
  EP: "Biotehnički fakultet",
};

const TITLE_MAP = {
  PRACTITIONER: "Stručnjak iz prakse",
  ASSISTANT: "Asistent",
  SENIOR_ASSISTANT: "Viši asistent",
  ASSISTANT_PROFESSOR: "Docent",
  ASSOCIATE_PROFESSOR: "Vanr. prof.",
  FULL_PROFESSOR: "Red. prof.",
  PROFESSOR_EMERITUS: "Prof. emeritus",
};
const ENG_MAP = {
  EMPLOYED: "RO",   // radni odnos
  EXTERNAL: "VS",   // vanjski saradnik
};

// Semestar (ZIMSKI/LJETNI) + godina -> rimski broj
function mapSemesterToRoman(yearNumber, semEnum) {
  const y = Number(yearNumber || 0);
  const zimski = semEnum === "ZIMSKI";
  switch (y) {
    case 1: return zimski ? "I" : "II";
    case 2: return zimski ? "III" : "IV";
    case 3: return zimski ? "V" : "VI";
    case 4: return zimski ? "VII" : "VIII";
    default: return "";
  }
}

router.get("/health", (_req, res) => res.json({ ok: true, scope: "planrealizacije" }));

// Idempotent seed standardnih programa
router.post("/seed-programs", async (_req, res) => {
  const data = [
    { code: "FIR", name: "Finansije i računovodstvo" },
    { code: "SMDP", name: "Strateški menadžment i digitalni poslovni modeli" },
    { code: "RI",  name: "Računarstvo i informatika" },
    { code: "TUG", name: "Turizam, ugostiteljstvo i gastronomija" },
    { code: "EP",  name: "Ekološko poljoprivredarstvo" },
  ];
  try {
    for (const p of data) {
      await prisma.studyProgram.upsert({
        where: { code: p.code },
        update: { name: p.name },
        create: { code: p.code, name: p.name },
      });
    }
    const all = await prisma.studyProgram.findMany({ orderBy: { name: "asc" } });
    res.json({ ok: true, count: all.length, programs: all });
  } catch (e) {
    res.status(500).json({ message: "Seed failed", detail: String(e?.message || e) });
  }
});

// Programi za tabove
router.get("/programs", async (_req, res) => {
  const programs = await prisma.studyProgram.findMany({ orderBy: { name: "asc" } });
  res.json(programs);
});

/** Osiguraj redove u planu prema SubjectOnProgramYear (dodaj nedostajuće; opciono počisti višak)
 *  i uskladi SVE redove za te predmete u ovom planu sa globalnim "kanonskim" redom.
 */
async function ensurePlanRows({ programId, yearNumber, planId, prune = false }) {
  const links = await prisma.subjectOnProgramYear.findMany({
    where: { programId, yearNumber },
    select: { subjectId: true },
  });
  const linkIds = new Set(links.map((l) => l.subjectId));
  const linkIdsArr = [...linkIds];

  if (linkIdsArr.length === 0) {
    if (prune) {
      await prisma.pRNRow.deleteMany({ where: { planId } });
    }
    return;
  }

  const existing = await prisma.pRNRow.findMany({
    where: { planId },
    select: { subjectId: true },
  });
  const existingIds = new Set(existing.map((r) => r.subjectId));

  const toCreate = linkIdsArr.filter((id) => !existingIds.has(id));

  // ⬇️ kanonski red za svaki subjectId: najnoviji updatedAt u CIJELOJ bazi
  const templates = await prisma.pRNRow.findMany({
    where: { subjectId: { in: linkIdsArr } },
    orderBy: { updatedAt: "desc" },
  });

  const templateBySubject = new Map();
  for (const t of templates) {
    if (!templateBySubject.has(t.subjectId)) {
      templateBySubject.set(t.subjectId, t);
    }
  }

  // 1) Kreiraj nedostajuće redove prema kanonskom šablonu
  if (toCreate.length) {
    const dataToCreate = toCreate.map((sid) => {
      const t = templateBySubject.get(sid);
      return {
        planId,
        subjectId: sid,
        lectureHours: t?.lectureHours ?? 0,
        exerciseHours: t?.exerciseHours ?? 0,
        professorId: t?.professorId ?? null,
      };
    });

    await prisma.pRNRow.createMany({
      data: dataToCreate,
      skipDuplicates: true, // ako postoji unique constraint
    });
  }

  // 2) Uskladi SVE postojeće redove u ovom planu sa kanonskim vrijednostima
  const existingRows = await prisma.pRNRow.findMany({
    where: { planId, subjectId: { in: linkIdsArr } },
  });

  const updates = [];
  for (const row of existingRows) {
    const t = templateBySubject.get(row.subjectId);
    if (!t) continue;

    const needsUpdate =
      row.professorId !== t.professorId ||
      (row.lectureHours ?? 0) !== (t.lectureHours ?? 0) ||
      (row.exerciseHours ?? 0) !== (t.exerciseHours ?? 0);

    if (needsUpdate) {
      updates.push(
        prisma.pRNRow.update({
          where: { id: row.id },
          data: {
            professorId: t.professorId ?? null,
            lectureHours: t.lectureHours ?? 0,
            exerciseHours: t.exerciseHours ?? 0,
          },
        })
      );
    }
  }

  if (updates.length) {
    await prisma.$transaction(updates);
  }

  if (prune) {
    await prisma.pRNRow.deleteMany({
      where: {
        planId,
        NOT: { subjectId: { in: linkIdsArr } },
      },
    });
  }
}

// GET /api/planrealizacije/plan?programId=&year=
// Kreira plan ako ne postoji, i SVAKE PUTA dosjeme nedostajuće redove.
router.get("/plan", async (req, res) => {
  const parsed = planQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const { programId, year } = parsed.data;

  try {
    const program = await prisma.studyProgram.findUnique({ where: { id: programId } });
    if (!program) return res.status(404).json({ message: "Program not found" });

    let plan = await prisma.pRNPlan.findUnique({
      where: { uniq_plan_per_program_year: { programId, yearNumber: year } },
    });
    if (!plan) {
      plan = await prisma.pRNPlan.create({ data: { programId, yearNumber: year } });
    }

    await ensurePlanRows({ programId, yearNumber: year, planId: plan.id, prune: false });

    const full = await prisma.pRNPlan.findUnique({
      where: { id: plan.id },
      include: {
        program: true,
        rows: {
          include: {
            subject: { include: { subjectPrograms: { include: { program: true } } } },
            professor: true,
          },
          orderBy: [{ subject: { code: "asc" } }, { subject: { name: "asc" } }],
        },
      },
    });

    const facultyName = FACULTY_BY_CODE[full?.program?.code || ""] || "";

    // mapiraj na nazive koje UI očekuje
    const mappedRows = (full.rows || []).map((r) => ({
      ...r,
      lectureTotal: r.lectureHours ?? 0,
      exerciseTotal: r.exerciseHours ?? 0,
    }));

    res.json({
      plan: { id: full.id, program: full.program, facultyName, yearNumber: full.yearNumber },
      rows: mappedRows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "PRN plan error", detail: String(e?.message || e) });
  }
});

// Ručni sync redova (opciono prune)
router.post("/plan/seed-rows", async (req, res) => {
  const bodySchema = planQuerySchema.extend({ prune: z.boolean().optional() });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const { programId, year, prune = false } = parsed.data;

  try {
    const plan = await prisma.pRNPlan.upsert({
      where: { uniq_plan_per_program_year: { programId, yearNumber: year } },
      update: {},
      create: { programId, yearNumber: year },
    });

    await ensurePlanRows({ programId, yearNumber: year, planId: plan.id, prune });

    const full = await prisma.pRNPlan.findUnique({
      where: { id: plan.id },
      include: {
        program: true,
        rows: {
          include: {
            subject: { include: { subjectPrograms: { include: { program: true } } } },
            professor: true,
          },
          orderBy: [{ subject: { code: "asc" } }, { subject: { name: "asc" } }],
        },
      },
    });

    const mappedRows = (full.rows || []).map((r) => ({
      ...r,
      lectureTotal: r.lectureHours ?? 0,
      exerciseTotal: r.exerciseHours ?? 0,
    }));

    res.json({
      ok: true,
      plan: { id: full.id, program: full.program, yearNumber: full.yearNumber },
      rows: mappedRows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Seed rows error", detail: String(e?.message || e) });
  }
});

// UPDATE jednog reda (profesor/sati)
const rowUpdateSchema = z.object({
  professorId: z.string().min(1).nullable().optional(),
  lectureTotal: z.coerce.number().int().min(0).optional(),
  exerciseTotal: z.coerce.number().int().min(0).optional(),
});

router.put("/rows/:id", async (req, res) => {
  const parsed = rowUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const data = {};
    if (parsed.data.professorId !== undefined) data.professorId = parsed.data.professorId || null;
    if (parsed.data.lectureTotal !== undefined) data.lectureHours = parsed.data.lectureTotal;
    if (parsed.data.exerciseTotal !== undefined) data.exerciseHours = parsed.data.exerciseTotal;

    const updated = await prisma.pRNRow.update({
      where: { id: req.params.id },
      data,
      include: { subject: true, professor: true },
    });

    // ⬇️ NOVO: propagiraj izmjene na SVE redove za isti predmet u svim planovima
    try {
      if (updated.subjectId) {
        const propagateData = {};
        const hasProf = parsed.data.professorId !== undefined;
        const hasL = parsed.data.lectureTotal !== undefined;
        const hasE = parsed.data.exerciseTotal !== undefined;

        if (hasProf) propagateData.professorId = updated.professorId || null;
        if (hasL) propagateData.lectureHours = updated.lectureHours ?? 0;
        if (hasE) propagateData.exerciseHours = updated.exerciseHours ?? 0;

        if (Object.keys(propagateData).length > 0) {
          await prisma.pRNRow.updateMany({
            where: {
              subjectId: updated.subjectId,
              id: { not: updated.id },
            },
            data: propagateData,
          });
        }
      }
    } catch (e) {
      console.error("PRN propagate error:", e);
      // ne rušimo glavni update ako propagacija pukne
    }

    res.json({
      ...updated,
      lectureTotal: updated.lectureHours ?? 0,
      exerciseTotal: updated.exerciseHours ?? 0,
    });
  } catch (e) {
    res.status(400).json({ message: "Cannot update", detail: String(e?.message || e) });
  }
});

// POST /api/planrealizacije/rows  -> kreira novi red za postojeći plan + subject
router.post("/rows", async (req, res) => {
  const schema = z.object({
    planId: z.string().min(1),
    subjectId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const { planId, subjectId } = parsed.data;

  try {
    // kreiraj prazan red (professorId null, sati 0)
    const created = await prisma.pRNRow.create({
      data: {
        planId,
        subjectId,
        // ako koristiš lectureTotal/exerciseTotal kolone:
        lectureTotal: 0,
        exerciseTotal: 0,
        // ako koristiš lectureHours/exerciseHours u bazi, zamijeni gore sa lectureHours/exerciseHours
      },
      include: {
        subject: { include: { subjectPrograms: { include: { program: true } } } },
        professor: true,
      },
    });

    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: "Cannot create row", detail: String(e?.message || e) });
  }
});

// DODAJ NASTAVNIKA (novi red za isti predmet u istom planu)
const addRowSchema = z.object({
  planId: z.string().min(1),
  subjectId: z.string().min(1),
});

// ⬇️ OVDJE JE BITNA IZMJENA: putanja je /rows/add-teacher umjesto /rows
router.post("/rows/add-teacher", async (req, res) => {
  const parsed = addRowSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const { planId, subjectId } = parsed.data;

  try {
    // provjera da plan postoji
    const plan = await prisma.pRNPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // kreiraj novi red bez profesora, sati 0
    const created = await prisma.pRNRow.create({
      data: {
        planId,
        subjectId,
        lectureHours: 0,   // <- u shemi su lectureHours/exerciseHours
        exerciseHours: 0,
        professorId: null,
      },
      include: {
        subject: { include: { subjectPrograms: { include: { program: true } } } },
        professor: true,
      },
    });

    // mapiranje na nazive koje UI očekuje
    res.status(201).json({
      ...created,
      lectureTotal: created.lectureHours ?? 0,
      exerciseTotal: created.exerciseHours ?? 0,
    });
  } catch (e) {
    res.status(400).json({ message: "Cannot add teacher row", detail: String(e?.message || e) });
  }
});

// (opcionalno) lista planova
router.get("/", async (req, res) => {
  const { programId, year } = req.query;
  const where = {};
  if (programId) where.programId = String(programId);
  if (year) where.yearNumber = Number(year);

  const plans = await prisma.pRNPlan.findMany({
    where,
    include: { program: true, rows: { include: { subject: true, professor: true } } },
    orderBy: [{ yearNumber: "asc" }],
  });

  res.json(plans);
});

router.get("/teacher-load", async (_req, res) => {
  try {
    // Uzimamo samo redove gdje je profesor dodijeljen
    const rows = await prisma.pRNRow.findMany({
      where: { professorId: { not: null } },
      include: {
        professor: true,
        subject: {
          include: {
            subjectPrograms: true, // SubjectOnProgramYear[]
          },
        },
        plan: {
          include: {
            program: true, // StudyProgram
          },
        },
      },
    });

    const mapped = rows.map((r) => {
      const prof = r.professor;
      const program = r.plan?.program;
      const yearNumber = r.plan?.yearNumber;

      // pronađi SubjectOnProgramYear za taj program + godinu
      const spLink = r.subject.subjectPrograms.find(
        (sp) => sp.programId === program?.id && sp.yearNumber === yearNumber
      );

      const semEnum = spLink?.semester || "ZIMSKI"; // fallback
      const semRoman = mapSemesterToRoman(yearNumber, semEnum);

      const lecture = Number(r.lectureHours ?? 0);
      const exercise = Number(r.exerciseHours ?? 0);

      const totalPV = lecture + exercise;                 // P + V
      const totalWeighted = lecture + exercise * 0.5;     // P + 0.5*V
      const weekly = totalWeighted / 15;                  // sedmično

      const programCode = program?.code || "";

      return {
        rowId: r.id,
        professorId: prof?.id || null,
        professorName: prof?.name || "",
        professorTitle: prof?.title || null,
        professorTitleLabel: prof?.title ? (TITLE_MAP[prof.title] || prof.title) : "",
        engagement: prof?.engagement || null,
        engagementLabel: prof?.engagement ? (ENG_MAP[prof.engagement] || prof.engagement) : "",
        subjectName: r.subject.name,
        subjectCode: r.subject.code || null,

        programCode,
        spFIR: programCode === "FIR" ? "x" : "",
        spRI:  programCode === "RI"  ? "x" : "",
        spTUG: programCode === "TUG" ? "x" : "",
        spSMDP: programCode === "SMDP" ? "x" : "",
        spEP:  programCode === "EP"  ? "x" : "",

        yearNumber,
        semester: semRoman,
        lectureHours: lecture,
        exerciseHours: exercise,
        totalPV,
        totalWeighted,
        weekly,

        // ovdje kasnije možeš ugraditi računanje prema normi, kad definišeš norme po profesoru
        opterecenjePremaNormama: null,
      };
    });

    // sortiranje: prvo po imenu nastavnika, pa programu, godini, semestru, predmetu
    mapped.sort((a, b) => {
      const nameCmp = (a.professorName || "").localeCompare(b.professorName || "", "bs");
      if (nameCmp !== 0) return nameCmp;
      const progCmp = (a.programCode || "").localeCompare(b.programCode || "");
      if (progCmp !== 0) return progCmp;
      if (a.yearNumber !== b.yearNumber) return (a.yearNumber || 0) - (b.yearNumber || 0);
      const semCmp = (a.semester || "").localeCompare(b.semester || "");
      if (semCmp !== 0) return semCmp;
      return (a.subjectName || "").localeCompare(b.subjectName || "", "bs");
    });

    res.json({ rows: mapped });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Teacher load error",
      detail: String(e?.message || e),
    });
  }
});
