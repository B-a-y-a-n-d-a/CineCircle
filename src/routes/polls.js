import { Router } from 'express';
import { supabase } from '../supabase.js';
import { assertNotBanned } from '../middleware/requireAdmin.js';

const router = Router();

async function assertMember(groupId, userId) {
  const { data, error } = await supabase
    .from('group_members').select('user_id').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const err = new Error('You must be a member of this group.');
    err.status = 403;
    throw err;
  }
}

function shapePoll(poll) {
  const options = (poll.options || []).map((o) => ({
    id: o.id,
    label: o.label,
    votes: (o.votes || []).length,
  }));
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  return { id: poll.id, question: poll.question, created_at: poll.created_at, author: poll.author, options, totalVotes };
}

// GET /api/groups/:id/polls
router.get('/:id/polls', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('group_polls')
      .select('id, question, created_at, author:users(id, name), options:group_poll_options(id, label, votes:group_poll_votes(user_id))')
      .eq('group_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(shapePoll));
  } catch (err) { next(err); }
});

// POST /api/groups/:id/polls  { user_id, question, options: string[] }
router.post('/:id/polls', async (req, res, next) => {
  try {
    const { user_id, question, options } = req.body;
    if (!user_id || !question?.trim()) return res.status(400).json({ error: 'user_id and question are required' });
    const cleanOptions = (options || []).map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) return res.status(400).json({ error: 'Provide at least 2 options' });

    await assertNotBanned(user_id);
    await assertMember(req.params.id, user_id);

    const { data: poll, error: pollError } = await supabase
      .from('group_polls')
      .insert({ group_id: req.params.id, created_by: user_id, question: question.trim() })
      .select()
      .single();
    if (pollError) throw pollError;

    const rows = cleanOptions.map((label, i) => ({ poll_id: poll.id, label, position: i }));
    const { error: optError } = await supabase.from('group_poll_options').insert(rows);
    if (optError) throw optError;

    res.status(201).json({ ok: true, poll_id: poll.id });
  } catch (err) { next(err); }
});

// POST /api/polls/:pollId/vote  { user_id, option_id }
router.post('/polls/:pollId/vote', async (req, res, next) => {
  try {
    const { user_id, option_id } = req.body;
    if (!user_id || !option_id) return res.status(400).json({ error: 'user_id and option_id are required' });
    await assertNotBanned(user_id);

    // One vote per person per poll: replace any previous vote.
    await supabase.from('group_poll_votes').delete().eq('poll_id', req.params.pollId).eq('user_id', user_id);
    const { error } = await supabase
      .from('group_poll_votes').insert({ poll_id: req.params.pollId, option_id, user_id });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
