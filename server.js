import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import usersRouter from './src/routes/users.js';
import screeningsRouter from './src/routes/screenings.js';
import groupsRouter from './src/routes/groups.js';
import postsRouter from './src/routes/posts.js';
import moviesRouter from './src/routes/movies.js';
import groupChatRouter from './src/routes/groupChat.js';
import pollsRouter from './src/routes/polls.js';
import adminRouter from './src/routes/admin.js';
import { runScrape } from './src/scraper/index.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/users', usersRouter);
app.use('/api/screenings', screeningsRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/groups', groupChatRouter); // adds /:id/messages
app.use('/api/groups', pollsRouter);     // adds /:id/polls and /polls/:pollId/vote
app.use('/api/posts', postsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'CineCircle API' }));

// Serve the frontend (replace public/ contents with your Stitch-generated UI)
app.use(express.static(path.join(__dirname, 'public')));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Daily showtime scrape — runs every 24h at 03:00 server time while this
// process is alive. Also triggerable on demand from Admin → Showtimes.
cron.schedule('0 3 * * *', () => {
  console.log('[scraper] daily cron run starting…');
  runScrape().catch((err) => console.error('[scraper] daily cron run failed:', err));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🕸️  CineCircle running on http://localhost:${PORT}`));
