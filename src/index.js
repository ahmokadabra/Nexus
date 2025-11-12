// src/index.js
import express from "express";
import cors from "cors";

// postojeće rute
import { router as professorsRouter } from "./routes/professors.js";
import { router as subjectsRouter } from "./routes/subjects.js";
import { router as roomsRouter } from "./routes/rooms.js";
import { router as programsRouter } from "./routes/programs.js";
import { router as cyclesRouter } from "./routes/cycles.js";
import { router as termsRouter } from "./routes/terms.js";
import { router as coursesRouter } from "./routes/courses.js";
import entriesRouter from "./routes/entries.js";

// ✅ PRAVILAN import + naziv varijable (ovo je falilo/različito imenovano)
import { router as planRealizacijeRouter } from "./routes/planrealizacije.js";

const app = express();
app.use(cors());
app.use(express.json());

// health
app.get("/health", (_req, res) => res.json({ ok: true }));

// api mount
app.use("/api/professors", professorsRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/programs", programsRouter);
app.use("/api/cycles", cyclesRouter);
app.use("/api/terms", termsRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/entries", entriesRouter);

// ✅ koristi isti naziv koji si importovao
app.use("/api/planrealizacije", planRealizacijeRouter);

// start
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Nexus API running on port ${PORT}`);
});
