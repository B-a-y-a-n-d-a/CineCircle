import { Router } from 'express';
import { supabase } from '../supabase.js';
import { assertNotBanned } from '../middleware/requireAdmin.js';

const router = Router();

async function assertMember(groupId, userId) {
  const { data, error } = await supabase
    .from('group_members').select('user_id').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const err = new Error('You must be a member of this group.');
    err.status = 403;
    throw err;
  }
}

// GET /api/groups/:id/messages
router.get('/:id/messages', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .select('id, text, created_at, author:users(id, name)')
      .eq('group_id', req.params.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/groups/:id/messages  { user_id, text }
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { user_id, text } = req.body;
    if (!user_id || !text?.trim()) return res.status(400).json({ error: 'user_id and text are required' });
    await assertNotBanned(user_id);
    await assertMember(req.params.id, user_id);

    const { data, error } = await supabase
      .from('group_messages')
      .insert({ group_id: req.params.id, user_id, text: text.trim() })
      .select('id, text, created_at, author:users(id, name)')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

export default router;
