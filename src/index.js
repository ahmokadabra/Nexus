import "dotenv/config";
import express from "express";
import cors from "cors";

import entriesRouter from "./routes/entries.js";
import { router as subjectsRouter } from "./routes/subjects.js";
import { router as professorsRouter } from "./routes/professors.js";
import { router as roomsRouter } from "./routes/rooms.js";
import { router as cyclesRouter } from "./routes/cycles.js";
import { router as programsRouter } from "./routes/programs.js";
import { router as coursesRouter } from "./routes/courses.js";

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint — Render koristi ovo da vidi da li je app online
app.get("/api/health", (_req, res) => 
  res.json({ ok: true, ts: new Date().toISOString(), app: "Nexus" })
);

// Routes
app.use("/api/subjects", subjectsRouter);
app.use("/api/professors", professorsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/cycles", cyclesRouter);
app.use("/api/programs", programsRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/entries", entriesRouter);

// Listen on all interfaces, not just localhost
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Nexus API running on port ${PORT}`);
});

