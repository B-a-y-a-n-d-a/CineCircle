import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import usersRouter from './src/routes/users.js';
import screeningsRouter from './src/routes/screenings.js';
import groupsRouter from './src/routes/groups.js';
import postsRouter from './src/routes/posts.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/users', usersRouter);
app.use('/api/screenings', screeningsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/posts', postsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'CineCircle API' }));

// Serve the frontend (replace public/ contents with your Stitch-generated UI)
app.use(express.static(path.join(__dirname, 'public')));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🕸️  CineCircle running on http://localhost:${PORT}`));
