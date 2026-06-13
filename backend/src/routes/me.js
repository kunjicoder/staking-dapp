import { Router } from 'express';
import { readPosition } from '../chain.js';
import { supabase, EVENT_COLUMNS } from '../supabase.js';
import { requireAuth } from '../auth.js';

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get('/position', async (req, res) => {
  try {
    res.json(await readPosition(req.user.wallet));
  } catch (err) {
    console.error('[api] /me/position failed:', err.message ?? err);
    res.status(500).json({ error: 'Failed to read on-chain position' });
  }
});

meRouter.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('wallet', req.user.wallet)
      .order('ts', { ascending: false })
      .order('log_index', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ events: data });
  } catch (err) {
    console.error('[api] /me/activity failed:', err.message ?? err);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});
