import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// GET /api/movies — every currently-screening movie (used by the watch groups
// carousel, create-group screening picker, and the discussion board filter).
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('movies').select('*').eq('status', 'active').order('id');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/movies — admin only. { title, genre, runtime_minutes, poster_url, trailer_url }
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { title, genre, runtime_minutes, poster_url, trailer_url } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

    const { data, error } = await supabase
      .from('movies')
      .insert({
        title: title.trim(),
        genre: genre || '',
        runtime_minutes: Number(runtime_minutes) || 0,
        poster_url: poster_url || '',
        trailer_url: trailer_url || '',
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

export default router;
