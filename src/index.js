import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./prisma.js";

// tvoji routeri
import { router as professorsRouter } from "./routes/professors.js";
import { router as subjectsRouter } from "./routes/subjects.js";
import { router as roomsRouter } from "./routes/rooms.js";
import { router as planRealizacijeRouter } from "./routes/planrealizacije.js";
// studijski programi router – isti za /api/programs i /api/study-programs
import { router as studyProgramsRouter } from "./routes/study-programs.js";

const app = express();
app.use(cors());
app.use(express.json());

// health (Render health checks)
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// API mount
app.use("/api/professors", professorsRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/planrealizacije", planRealizacijeRouter);

// 👇 Novo: oba puta rade za studijske programe (kompatibilnost frontenda)
app.use("/api/programs", studyProgramsRouter);
app.use("/api/study-programs", studyProgramsRouter);

// statički frontend (isključen ako nema dist ili SERVE_FRONT nije set)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (process.env.SERVE_FRONT && process.env.SERVE_FRONT !== "0") {
  const distDir = path.join(__dirname, "../frontend/dist");
  app.use(express.static(distDir));
  app.get("*", (req, res) => res.sendFile(path.join(distDir, "index.html")));
} else {
  console.log("Not serving frontend from backend (no dist or SERVE_FRONT not set).");
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
