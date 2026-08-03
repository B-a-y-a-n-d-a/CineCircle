import { supabase } from '../supabase.js';

// Protects admin-only routes. The frontend sends the person's Supabase Auth
// access token in the Authorization header; we verify it's real (not just a
// trusted body field, unlike the rest of this MVP's routes) and that the
// account behind it is flagged is_admin in our `users` table.
export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing admin token' });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'Invalid session' });

    const { data: profile, error: profileError } = await supabase
      .from('users').select('*').eq('auth_id', authData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || !profile.is_admin) return res.status(403).json({ error: 'Admin access required' });

    req.adminUser = profile;
    next();
  } catch (err) { next(err); }
}

// Used on regular (non-admin) mutating routes to block banned users.
export async function assertNotBanned(userId) {
  const { data, error } = await supabase.from('users').select('is_banned').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (data?.is_banned) {
    const err = new Error('Your account has been suspended.');
    err.status = 403;
    throw err;
  }
}
