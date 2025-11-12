// src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "./prisma.js";

// API routers
import { router as professorsRouter } from "./routes/professors.js";
import { router as subjectsRouter } from "./routes/subjects.js";
import { router as roomsRouter } from "./routes/rooms.js";
import { router as programsRouter } from "./routes/programs.js";
import { router as cyclesRouter } from "./routes/cycles.js";
import { router as termsRouter } from "./routes/terms.js";
import { router as prnRouter } from "./routes/prn-routes.js";      // ✅ novo, umjesto prn.js
import { router as planRealizacijeRouter } from "./routes/planrealizacije.js"; // ✅ IMPORT SA ISTIM IMENOM

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// REST routes
app.use("/api/professors", professorsRouter);
app.use("/api/subjects",   subjectsRouter);
app.use("/api/rooms",      roomsRouter);
app.use("/api/programs",   programsRouter);
app.use("/api/cycles",     cyclesRouter);
app.use("/api/terms",      termsRouter);

// PRN (Plan realizacije)
app.use("/api/prn",                 prnRouter);              // ✅ koristi prn-routes.js
app.use("/api/planrealizacije",     planRealizacijeRouter);  // ✅ koristi planrealizacije.js

// Serve Vite build (ako postoji)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, "../frontend/dist");
app.use(express.static(clientDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
