import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';

export const router = Router();

const courseSchema = z.object({
  subjectId: z.string().min(1),
  professorId: z.string().min(1),
  termId: z.string().min(1),
});

router.get('/', async (req, res) => {
  const { termId } = req.query;
  const where = termId ? { termId } : {};
  const list = await prisma.course.findMany({
    where,
    include: { subject: true, professor: true, term: true },
    orderBy: [{ createdAt: 'desc' }],
  });
  res.json(list);
});

router.post('/', async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  try {
    const created = await prisma.course.create({
      data: parsed.data,
      include: { subject: true, professor: true, term: true },
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: 'DB error', detail: e.message });
  }
});

router.get('/:id', async (req, res) => {
  const item = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: { subject: true, professor: true, term: true },
  });
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: 'Cannot delete', detail: e.message });
  }
});
