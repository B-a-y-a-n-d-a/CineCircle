import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { runScrape } from '../scraper/index.js';

const router = Router();
router.use(requireAdmin); // every route below requires a verified admin session

// In-memory flag so we can't kick off two scrapes at once (a full run takes a while).
let scrapeInProgress = false;

// POST /api/admin/scrape/run — kicks off a scrape in the background and
// returns immediately; poll GET /api/admin/scrape/status for progress.
router.post('/scrape/run', async (req, res, next) => {
  try {
    if (scrapeInProgress) return res.status(409).json({ error: 'A scrape is already running' });
    scrapeInProgress = true;
    res.json({ ok: true, started: true });

    runScrape({ triggeredBy: req.adminUser.id })
      .catch((err) => console.error('[scraper] run failed:', err))
      .finally(() => { scrapeInProgress = false; });
  } catch (err) { scrapeInProgress = false; next(err); }
});

// GET /api/admin/scrape/status — most recent run + whether one is active right now.
router.get('/scrape/status', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scrape_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    res.json({ running: scrapeInProgress, lastRun: data || null });
  } catch (err) { next(err); }
});

// ---- Manual screenings (fallback for when the scraper malfunctions) ----

// GET /api/admin/screenings — every screening, newest first, with its movie.
router.get('/screenings', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('screenings')
      .select('*, movie:movies(id, title)')
      .order('id', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/admin/screenings — add a showtime by hand. Tagged
// source:'manual' so the scraper's own stale-row cleanup (which only
// touches source:'scraper' rows) never deletes it.
router.post('/screenings', async (req, res, next) => {
  try {
    const { movie_id, cinema, city, show_time, format } = req.body || {};
    if (!movie_id || !cinema || !city || !show_time) {
      return res.status(400).json({ error: 'movie_id, cinema, city, and show_time are required' });
    }
    const { data, error } = await supabase
      .from('screenings')
      .insert({
        movie_id, cinema, city, show_time,
        format: format || '2D',
        source: 'manual',
      })
      .select('*, movie:movies(id, title)')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/admin/screenings/:id — edit any field of an existing showtime.
router.patch('/screenings/:id', async (req, res, next) => {
  try {
    const allowed = ['movie_id', 'cinema', 'city', 'show_time', 'format'];
    const updates = {};
    for (const key of allowed) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });

    const { data, error } = await supabase
      .from('screenings')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, movie:movies(id, title)')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/admin/screenings/:id — refuses if a group is already built on
// it (matching the scraper's own stale-row protection), so a bad delete
// can't silently cascade-wipe a group's members/chat/polls.
router.delete('/screenings/:id', async (req, res, next) => {
  try {
    const { data: dependentGroups, error: groupsErr } = await supabase
      .from('groups').select('id, name').eq('screening_id', req.params.id);
    if (groupsErr) throw groupsErr;
    if (dependentGroups?.length) {
      return res.status(409).json({
        error: `Can't delete — ${dependentGroups.length} group(s) are built on this showtime: ${dependentGroups.map(g => g.name).join(', ')}. Edit it instead, or have those groups disband first.`,
      });
    }
    const { error } = await supabase.from('screenings').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

const GROUP_SELECT = `
  id, name, vibe, max_size, spot, topic, status, created_at,
  creator:users!groups_created_by_fkey(id, name, email),
  screening:screenings(*, movie:movies(*))
`;

// GET /api/admin/groups/pending
router.get('/groups/pending', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('groups').select(GROUP_SELECT).eq('status', 'pending').order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/admin/groups/:id/approve
router.post('/groups/:id/approve', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('groups')
      .update({ status: 'approved', reviewed_by: req.adminUser.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/admin/groups/:id/reject
router.post('/groups/:id/reject', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('groups')
      .update({ status: 'rejected', reviewed_by: req.adminUser.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users').select('id, name, email, is_admin, is_banned, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/ban
router.post('/users/:id/ban', async (req, res, next) => {
  try {
    if (req.params.id === req.adminUser.id) return res.status(400).json({ error: "You can't ban yourself" });
    const { error } = await supabase.from('users').update({ is_banned: true }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/unban
router.post('/users/:id/unban', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_banned: false }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
