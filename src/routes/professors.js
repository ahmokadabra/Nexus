import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const router = Router();
const prisma = new PrismaClient();

const bodySchema = z.object({
  name: z.string().min(1),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
});

// GET /api/professors
router.get("/", async (_req, res, next) => {
  try {
    const data = await prisma.professor.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/professors
router.post("/", async (req, res, next) => {
  try {
    const data = bodySchema.parse(req.body);
    const created = await prisma.professor.create({ data });
    res.status(201).json(created);
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Email već postoji" });
    }
    next(err);
  }
});

// DELETE /api/professors/:id (opcionalno)
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.professor.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
