import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// GET /api/posts
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, text, spoiler, likes, created_at, author:users(id, name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/posts  { user_id, text, spoiler }
router.post('/', async (req, res, next) => {
  try {
    const { user_id, text, spoiler } = req.body;
    if (!user_id || !text?.trim()) {
      return res.status(400).json({ error: 'user_id and text are required' });
    }
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id, text: text.trim(), spoiler: !!spoiler })
      .select()
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
