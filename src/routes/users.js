import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// POST /api/users  { name }
// MVP "login": creates the user if new, otherwise returns the existing one.
// Upgrade path: replace with Supabase Auth (email/password or magic links).
router.post('/', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { data: existing } = await supabase
      .from('users').select('*').ilike('name', name).maybeSingle();
    if (existing) return res.json(existing);

    const { data, error } = await supabase
      .from('users').insert({ name }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

export default router;
