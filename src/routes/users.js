// src/routes/users.js
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

export const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// čitanje usera iz Authorization: Bearer token
function getAuthUser(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAdmin(req, res) {
  const u = getAuthUser(req);
  if (!u) {
    res.status(401).json({ message: "Niste prijavljeni" });
    return null;
  }
  if (u.role !== "ADMIN") {
    res.status(403).json({ message: "Nemate administratorska prava" });
    return null;
  }
  return u;
}

function toSafeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    canDB: u.canDB,
    canPlan: u.canPlan,
    canTeacherLoad: u.canTeacherLoad,
    canSchedule: u.canSchedule,
    canLibrary: u.canLibrary,
  };
}

const userCreateSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(4),
  role: z.enum(["ADMIN", "USER"]),
  canDB: z.boolean().optional(),
  canPlan: z.boolean().optional(),
  canTeacherLoad: z.boolean().optional(),
  canSchedule: z.boolean().optional(),
  canLibrary: z.boolean().optional(),
});

const userUpdateSchema = z.object({
  password: z.string().min(4).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  canDB: z.boolean().optional(),
  canPlan: z.boolean().optional(),
  canTeacherLoad: z.boolean().optional(),
  canSchedule: z.boolean().optional(),
  canLibrary: z.boolean().optional(),
});

// GET /api/users – lista korisnika (samo admin)
router.get("/", async (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const users = await prisma.user.findMany({
      orderBy: { username: "asc" },
    });
    res.json(users.map(toSafeUser));
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Users list error",
      detail: String(e?.message || e),
    });
  }
});

// POST /api/users – kreiraj novog korisnika
router.post("/", async (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const parsed = userCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const { username, password, role, ...perms } = parsed.data;

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hash,
        role,
        canDB: perms.canDB ?? true,
        canPlan: perms.canPlan ?? true,
        canTeacherLoad: perms.canTeacherLoad ?? true,
        canSchedule: perms.canSchedule ?? true,
        canLibrary: perms.canLibrary ?? true,
      },
    });
    res.status(201).json(toSafeUser(user));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: "Cannot create user",
      detail: String(e?.message || e),
    });
  }
});

// PUT /api/users/:id – izmjena role, dozvola, lozinke
router.put("/:id", async (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const { password, ...fields } = parsed.data;
  const data = { ...fields };

  try {
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
    });

    res.json(toSafeUser(user));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: "Cannot update user",
      detail: String(e?.message || e),
    });
  }
});

// DELETE /api/users/:id – obriši korisnika (samo admin)
// (ne dozvoljavamo da admin sam sebe obriše)
router.delete("/:id", async (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const id = req.params.id;
  if (admin.userId === id) {
    return res
      .status(400)
      .json({ message: "Ne možete obrisati vlastiti korisnički račun." });
  }

  try {
    await prisma.user.delete({
      where: { id },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: "Cannot delete user",
      detail: String(e?.message || e),
    });
  }
});
