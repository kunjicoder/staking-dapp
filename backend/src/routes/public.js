import { Router } from 'express';
import { staking } from '../chain.js';
import { supabase, EVENT_COLUMNS } from '../supabase.js';

export const publicRouter = Router();

async function countByType(type) {
  const { count, error } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', type);
  if (error) throw error;
  return count ?? 0;
}

export async function getTotals() {
  const [tvl, totalClaims, totalStakes, stakerRows] = await Promise.all([
    staking.totalStaked(),
    countByType('claim'),
    countByType('stake'),
    supabase.from('events').select('wallet').eq('event_type', 'stake').limit(10000),
  ]);
  if (stakerRows.error) throw stakerRows.error;
  const totalStakers = new Set(stakerRows.data.map((r) => r.wallet.toLowerCase())).size;
  return { tvl: tvl.toString(), totalStakers, totalClaims, totalStakes };
}

publicRouter.get('/stats', async (_req, res) => {
  try {
    res.json(await getTotals());
  } catch (err) {
    console.error('[api] /stats failed:', err.message ?? err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

publicRouter.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .order('ts', { ascending: false })
      .order('log_index', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ events: data });
  } catch (err) {
    console.error('[api] /activity failed:', err.message ?? err);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});
