import { Router } from 'express';
import { supabase } from '../supabase.js';
import { assertNotBanned } from '../middleware/requireAdmin.js';

const router = Router();

// GET /api/posts?movie_id=1
router.get('/', async (req, res, next) => {
  try {
    let query = supabase
      .from('posts')
      .select('id, text, spoiler, likes, created_at, author:users(id, name), movie:movies(id, title)')
      .order('created_at', { ascending: false });
    if (req.query.movie_id) query = query.eq('movie_id', req.query.movie_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/posts  { user_id, text, spoiler, movie_id }
router.post('/', async (req, res, next) => {
  try {
    const { user_id, text, spoiler, movie_id } = req.body;
    if (!user_id || !text?.trim()) {
      return res.status(400).json({ error: 'user_id and text are required' });
    }
    if (!movie_id) return res.status(400).json({ error: 'movie_id is required' });
    await assertNotBanned(user_id);

    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id, text: text.trim(), spoiler: !!spoiler, movie_id })
      .select('id, text, spoiler, likes, created_at, author:users(id, name), movie:movies(id, title)')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// POST /api/posts/:id/like
router.post('/:id/like', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .rpc('increment_likes', { post_id: req.params.id });
    if (error) throw error;
    res.json({ likes: data });
  } catch (err) { next(err); }
});

export default router;
