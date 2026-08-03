import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// GET /api/users/me?auth_id=...
// Looks up the profile already tied to this Supabase Auth account (created by
// the on_auth_user_created trigger). Used so returning users on a new device/
// browser skip the display-name screen instead of being asked again.
router.get('/me', async (req, res, next) => {
  try {
    const auth_id = req.query.auth_id;
    if (!auth_id) return res.status(400).json({ error: 'auth_id is required' });

    const { data, error } = await supabase
      .from('users').select('*').eq('auth_id', auth_id).maybeSingle();
    if (error) throw error;
    if (!data || !data.name) return res.status(404).json({ error: 'No profile yet' });
    res.json(data);
  } catch (err) { next(err); }
});

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
