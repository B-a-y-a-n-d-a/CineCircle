import { Router } from 'express';
import { supabase } from '../supabase.js';
import { assertNotBanned } from '../middleware/requireAdmin.js';

const router = Router();

const GROUP_SELECT = `
  id, name, vibe, max_size, spot, topic, status, created_at,
  screening:screenings(*, movie:movies(*)),
  members:group_members(user:users(id, name))
`;

const shape = (g) => ({
  ...g,
  members: (g.members || []).map((m) => m.user),
});

// GET /api/groups?city=&vibe=&movie_id=  — approved groups only (public listing)
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('groups').select(GROUP_SELECT).eq('status', 'approved').order('created_at', { ascending: false });
    if (req.query.vibe) query = query.eq('vibe', req.query.vibe);
    const { data, error } = await query;
    if (error) throw error;
    let groups = data.map(shape);
    if (req.query.city) groups = groups.filter((g) => g.screening?.city === req.query.city);
    if (req.query.movie_id) groups = groups.filter((g) => String(g.screening?.movie?.id) === String(req.query.movie_id));
    res.json(groups);
  } catch (err) { next(err); }
});

// GET /api/groups/mine?user_id=...  — every group this person belongs to, any status
// (so My Plans can show "pending approval" groups too, not just approved ones).
router.get('/mine', async (req, res, next) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'user_id is required' });

    const { data: memberships, error: mErr } = await supabase
      .from('group_members').select('group_id').eq('user_id', userId);
    if (mErr) throw mErr;
    const groupIds = memberships.map((m) => m.group_id);
    if (groupIds.length === 0) return res.json([]);

    const { data, error } = await supabase
      .from('groups').select(GROUP_SELECT).in('id', groupIds).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(shape));
  } catch (err) { next(err); }
});

// POST /api/groups  { name, screening_id, vibe, max_size, spot, topic, user_id }
// Creates a *request* — status starts as 'pending' until an admin approves it.
router.post('/', async (req, res, next) => {
  try {
    const { name, screening_id, vibe, max_size, spot, topic, user_id } = req.body;
    if (!name || !screening_id || !user_id) {
      return res.status(400).json({ error: 'name, screening_id and user_id are required' });
    }
    await assertNotBanned(user_id);

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        screening_id,
        vibe: vibe || 'Casual',
        max_size: Math.min(Math.max(max_size || 6, 2), 20),
        spot: spot || 'To be decided by the group',
        topic: topic || 'Open discussion',
        created_by: user_id,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;

    // Creator joins immediately; the group just won't show up publicly until approved.
    await supabase.from('group_members').insert({ group_id: group.id, user_id });
    res.status(201).json(group);
  } catch (err) { next(err); }
});

// POST /api/groups/:id/join  { user_id }
router.post('/:id/join', async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    await assertNotBanned(user_id);

    const { data: g, error: gErr } = await supabase
      .from('groups').select('status, max_size, members:group_members(user_id)').eq('id', req.params.id).single();
    if (gErr) throw gErr;
    if (g.status !== 'approved') return res.status(409).json({ error: 'This group is not open yet' });
    if (g.members.length >= g.max_size) return res.status(409).json({ error: 'Group is full' });
    if (g.members.some((m) => m.user_id === user_id)) {
      return res.status(409).json({ error: 'Already a member' });
    }

    const { error } = await supabase
      .from('group_members').insert({ group_id: req.params.id, user_id });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/groups/:id/leave  { user_id }
router.post('/:id/leave', async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const { error } = await supabase
      .from('group_members').delete()
      .eq('group_id', req.params.id).eq('user_id', user_id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
