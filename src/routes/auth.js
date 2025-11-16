// src/routes/auth.js
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

export const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// šta šaljemo frontendu o useru
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

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  const { username, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Neispravno korisničko ime ili lozinka" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res
        .status(401)
        .json({ message: "Neispravno korisničko ime ili lozinka" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: toSafeUser(user),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Login error",
      detail: String(e?.message || e),
    });
  }
});

// helper handler za seed-admin
async function seedAdminHandler(_req, res) {
  try {
    const existing = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    if (existing) {
      return res.json({
        ok: true,
        message: "Admin korisnik već postoji",
        user: toSafeUser(existing),
      });
    }

    const password = "admin123";
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: hash,
        role: "ADMIN",
        canDB: true,
        canPlan: true,
        canTeacherLoad: true,
        canSchedule: true,
        canLibrary: true,
      },
    });

    res.json({
      ok: true,
      message: "Admin korisnik kreiran",
      user: toSafeUser(user),
      initialPassword: password,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Seed admin error",
      detail: String(e?.message || e),
    });
  }
}

// /api/auth/seed-admin – možeš pozvati GET-om iz browsera
router.get("/seed-admin", seedAdminHandler);
// ili POST ako hoćeš
router.post("/seed-admin", seedAdminHandler);

export default router;
