import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// GET /api/screenings?movie_id=1
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('screenings').select('*').order('id');
    if (req.query.movie_id) query = query.eq('movie_id', req.query.movie_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
