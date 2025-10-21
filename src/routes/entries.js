// src/routes/entries.js
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

export const router = Router();

const weekTypeEnum = z.enum(["ALL","A","B"]);
const entrySchema = z.object({
  termId: z.string().min(1),
  courseId: z.string().min(1),
  professorId: z.string().min(1),
  roomId: z.string().min(1),
  groupName: z.string().optional(),
  dayOfWeek: z.number().int().min(1).max(7),
  startMin: z.number().int().min(0).max(24*60-1),
  endMin: z.number().int().min(1).max(24*60),
  weekType: weekTypeEnum.optional(),
  isOnline: z.boolean().optional(),
  note: z.string().optional()
}).refine(data => data.endMin > data.startMin, { message: "endMin must be > startMin" });

// helper: returns array of weekTypes in existing entries that conflict with newWeekType
function weekConflictFilter(newWeekType) {
  if (!newWeekType || newWeekType === "ALL") {
    // new is ALL => conflicts with any existing weekType
    return {};
  }
  // new is A => conflict with existing ALL or A
  if (newWeekType === "A") return { weekType: { in: ["ALL","A"] } };
  // new is B => conflict with existing ALL or B
  if (newWeekType === "B") return { weekType: { in: ["ALL","B"] } };
  return {};
}

// interval overlap condition for Prisma: NOT (end <= newStart OR start >= newEnd)
function overlapCondition(startMin, endMin) {
  return {
    NOT: [
      { endMin: { lte: startMin } },
      { startMin: { gte: endMin } }
    ]
  };
}

// POST /api/entries  (create with soft collision checks)
router.post("/", async (req, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const data = parsed.data;
  const weekFilter = weekConflictFilter(data.weekType);

  // base where: same term & same day && overlapping time
  const baseWhere = {
    termId: data.termId,
    dayOfWeek: data.dayOfWeek,
    ...overlapCondition(data.startMin, data.endMin)
  };

  // 1) room conflicts (unless isOnline true)
  let roomConflicts = [];
  if (!data.isOnline) {
    roomConflicts = await prisma.scheduleEntry.findMany({
      where: {
        ...baseWhere,
        ...weekFilter,
        roomId: data.roomId
      },
      include: { course: { include: { subject: true } }, professor: true }
    });
  }

  // 2) professor conflicts
  const profConflicts = await prisma.scheduleEntry.findMany({
    where: {
      ...baseWhere,
      ...weekFilter,
      professorId: data.professorId
    },
    include: { course: { include: { subject: true } }, room: true }
  });

  // 3) group conflicts (only if groupName provided)
  let groupConflicts = [];
  if (data.groupName) {
    groupConflicts = await prisma.scheduleEntry.findMany({
      where: {
        ...baseWhere,
        ...weekFilter,
        groupName: data.groupName
      },
      include: { course: { include: { subject: true } }, room: true, professor: true }
    });
  }

  const hasConflicts = (roomConflicts.length + profConflicts.length + groupConflicts.length) > 0;
  if (hasConflicts) {
    return res.status(409).json({
      message: "Konflikt u rasporedu",
      conflicts: {
        room: roomConflicts,
        professor: profConflicts,
        group: groupConflicts
      }
    });
  }

  // no conflicts -> create entry
  try {
    const created = await prisma.scheduleEntry.create({ data });
    return res.status(201).json(created);
  } catch (e) {
    return res.status(400).json({ message: "DB error creating entry", detail: e.message });
  }
});

// GET /api/entries?termId=&dayOfWeek=
router.get("/", async (req, res) => {
  const { termId, dayOfWeek } = req.query;
  const where = {};
  if (termId) where.termId = termId;
  if (dayOfWeek) where.dayOfWeek = Number(dayOfWeek);
  const list = await prisma.scheduleEntry.findMany({
    where,
    include: { course: { include: { subject: true, professor: true } }, professor: true, room: true },
    orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }]
  });
  res.json(list);
});

// GET /api/entries/:id
router.get("/:id", async (req, res) => {
  const item = await prisma.scheduleEntry.findUnique({ where: { id: req.params.id }, include: { course: { include: { subject: true } }, professor: true, room: true } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// DELETE /api/entries/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.scheduleEntry.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Cannot delete", detail: e.message });
  }
});

export default router;
