import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// POST /api/users  { auth_id, email, name }
// Called after Supabase Auth sign-in (email/password or Google) to set/update
// the display name on the row Supabase's `on_auth_user_created` trigger already
// created for this auth_id. Upserts so it's safe to call more than once.
router.post('/', async (req, res, next) => {
  try {
    const { auth_id, email, name } = req.body;
    const trimmedName = (name || '').trim();
    if (!auth_id) return res.status(400).json({ error: 'auth_id is required' });
    if (!trimmedName) return res.status(400).json({ error: 'name is required' });

    const { data, error } = await supabase
      .from('users')
      .upsert({ auth_id, email, name: trimmedName }, { onConflict: 'auth_id' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

export default router;
