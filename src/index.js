// src/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import path, { dirname, join } from 'node:path';
import fs from 'node:fs';

import { router as professorsRouter } from './routes/professors.js';
import { router as subjectsRouter } from './routes/subjects.js';
import { router as roomsRouter } from './routes/rooms.js';
import { router as planrealizacijeRouter } from './routes/planrealizacije.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ---- Health & root (da Render ne gađa index.html) ----
app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'backend', env: process.env.NODE_ENV || 'development' })
);
// root neka vrati info, ne šalji SPA ovdje u produkciji
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'backend', message: 'API is running' });
});

// ---- API rute ----
app.use('/api/professors', professorsRouter);
app.use('/api/subjects',   subjectsRouter);
app.use('/api/rooms',      roomsRouter);
app.use('/api/planrealizacije', planrealizacijeRouter);

// ---- (opcionalno) posluži frontend SAMO kad postoji build ili je traženo SERVE_FRONT ----
const distDir = join(__dirname, '../frontend/dist');
const shouldServeFront =
  process.env.SERVE_FRONT === '1' || process.env.SERVE_FRONT === 'true';

if (shouldServeFront && fs.existsSync(distDir)) {
  console.log('Serving frontend from', distDir);
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(join(distDir, 'index.html'));
  });
} else {
  console.log('Not serving frontend from backend (no dist or SERVE_FRONT not set).');
  // 404 za sve ostalo što nije / ili /health i nije /api/*
  app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
      return res.status(200).json({ ok: true, service: 'backend', route: req.path });
    }
    res.status(404).json({ message: 'Not found' });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
