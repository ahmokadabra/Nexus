// src/index.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./prisma.js";

import { router as professorsRouter } from "./routes/professors.js";
import { router as subjectsRouter } from "./routes/subjects.js";
import { router as roomsRouter } from "./routes/rooms.js";
import { router as planRealizacijeRouter } from "./routes/planrealizacije.js";
import { router as studyProgramsRouter } from "./routes/study-programs.js";

const app = express();

// ✅ CORS + preflight
app.use(cors({ origin: true, credentials: false }));
app.options("*", cors({ origin: true, credentials: false }));

app.use(express.json());

// ✅ Health (i /api/health radi)
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ✅ API rute
app.use("/api/professors", professorsRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/planrealizacije", planRealizacijeRouter);

// Studijski programi – obje putanje rade
app.use("/api/programs", studyProgramsRouter);
app.use("/api/study-programs", studyProgramsRouter);

// (Opcionalno) serviraj frontend iz backenda ako želiš
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (process.env.SERVE_FRONT && process.env.SERVE_FRONT !== "0") {
  const distDir = path.join(__dirname, "../frontend/dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
} else {
  console.log("Not serving frontend from backend (no dist or SERVE_FRONT not set).");
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
