// src/index.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Uvezi Prisma (zbog health check-a i eventualnih pingova)
import { prisma } from "./prisma.js";

// ✅ Uvezi naše routere
import { router as planrealizacijeRouter } from "./routes/planrealizacije.js";
import { router as studyProgramsRouter } from "./routes/study-programs.js";

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  } catch (e) {
    res.status(500).json({ ok: false, db: "down", error: String(e?.message || e) });
  }
});

// ✅ Montiraj routere (nema inline .findMany u index.js!)
app.use("/api/planrealizacije", planrealizacijeRouter);
app.use("/api/programs", studyProgramsRouter);
app.use("/api/study-programs", studyProgramsRouter);

// -- opcionalno serviranje frontenda (drži isključeno na Renderu ako frontend ima svoj servis)
const SERVE_FRONT = process.env.SERVE_FRONT === "1";
if (SERVE_FRONT) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, "..", "frontend", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
} else {
  console.log("Not serving frontend from backend (no dist or SERVE_FRONT not set).");
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
