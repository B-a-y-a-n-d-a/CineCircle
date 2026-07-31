import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// GET /api/screenings
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('screenings').select('*').order('id');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
