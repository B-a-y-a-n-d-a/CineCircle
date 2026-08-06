import { Router } from 'express';
import { supabase } from '../supabase.js';
import { isUpcoming } from '../utils/dates.js';

const router = Router();

// GET /api/screenings?movie_id=1
//
// Public-facing (used by watch_groups.html's Venue/Chain filters and
// create_group.html's screening picker) — deliberately excludes anything
// already in the past, so nobody can request a group for, or see venues
// only offering, a showtime that's already happened. Admins managing raw
// screening data (including past ones, for cleanup) use the separate
// unfiltered GET /api/admin/screenings instead.
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('screenings').select('*').order('id');
    if (req.query.movie_id) query = query.eq('movie_id', req.query.movie_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.filter((s) => isUpcoming(s.screening_date)));
  } catch (err) { next(err); }
});

export default router;
