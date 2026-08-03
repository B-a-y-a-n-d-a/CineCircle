import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
router.use(requireAdmin); // every route below requires a verified admin session

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
