import { Router } from 'express';
import { readPosition } from '../chain.js';
import { supabase, EVENT_COLUMNS } from '../supabase.js';
import { requireAdmin } from '../auth.js';
import { getTotals } from './public.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const ADDRESS_RE = /^0x[0-9a-f]{40}$/i;
const CHUNK_SIZE = 10;
const STAKERS_CACHE_MS = 30_000;
let stakersCache = { at: 0, data: null };

async function distinctWallets() {
  const { data, error } = await supabase.from('events').select('wallet').limit(20000);
  if (error) throw error;
  return [...new Set(data.map((r) => r.wallet.toLowerCase()))];
}

adminRouter.get('/stakers', async (_req, res) => {
  try {
    if (stakersCache.data && Date.now() - stakersCache.at < STAKERS_CACHE_MS) {
      return res.json({ stakers: stakersCache.data, cached: true });
    }
    const wallets = await distinctWallets();
    const stakers = [];
    for (let i = 0; i < wallets.length; i += CHUNK_SIZE) {
      const chunk = wallets.slice(i, i + CHUNK_SIZE);
      stakers.push(...(await Promise.all(chunk.map(readPosition))));
    }
    stakersCache = { at: Date.now(), data: stakers };
    res.json({ stakers, cached: false });
  } catch (err) {
    console.error('[api] /admin/stakers failed:', err.message ?? err);
    res.status(500).json({ error: 'Failed to load stakers' });
  }
});

adminRouter.get('/activity', async (req, res) => {
  try {
    const { type, wallet, from, to } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let query = supabase
      .from('events')
      .select(EVENT_COLUMNS, { count: 'exact' })
      .order('ts', { ascending: false })
      .order('log_index', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('event_type', String(type));
    if (wallet) query = query.eq('wallet', String(wallet).toLowerCase());
    if (from) query = query.gte('ts', new Date(String(from)).toISOString());
    if (to) query = query.lte('ts', new Date(String(to)).toISOString());

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ events: data, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error('[api] /admin/activity failed:', err.message ?? err);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

adminRouter.get('/stats', async (_req, res) => {
  try {
    const DAYS = 14;
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const windowStart = new Date(dayStart.getTime() - (DAYS - 1) * 86_400_000);

    const [totals, recent, stakeFlows] = await Promise.all([
      getTotals(),
      supabase
        .from('events')
        .select('event_type, ts')
        .gte('ts', windowStart.toISOString())
        .limit(20000),
      supabase
        .from('events')
        .select('event_type, amount::text, ts')
        .in('event_type', ['stake', 'unstake'])
        .order('ts', { ascending: true })
        .limit(20000),
    ]);
    if (recent.error) throw recent.error;
    if (stakeFlows.error) throw stakeFlows.error;

    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(windowStart.getTime() + i * 86_400_000);
      return d.toISOString().slice(0, 10);
    });

    const eventsPerDay = days.map((date) => {
      const counts = { date, claim: 0, stake: 0, unstake: 0, reward: 0, total: 0 };
      for (const ev of recent.data) {
        if (ev.ts.slice(0, 10) === date) {
          counts[ev.event_type] = (counts[ev.event_type] ?? 0) + 1;
          counts.total += 1;
        }
      }
      return counts;
    });

    // cumulative net staked at the end of each day, from full stake/unstake history
    const cumulativeStaked = [];
    let running = 0n;
    let idx = 0;
    const flows = stakeFlows.data;
    for (const date of days) {
      const dayEnd = `${date}T23:59:59.999Z`;
      while (idx < flows.length && flows[idx].ts <= dayEnd) {
        const amt = BigInt(flows[idx].amount);
        running += flows[idx].event_type === 'stake' ? amt : -amt;
        idx += 1;
      }
      cumulativeStaked.push({ date, staked: running.toString() });
    }

    res.json({ ...totals, eventsPerDay, cumulativeStaked });
  } catch (err) {
    console.error('[api] /admin/stats failed:', err.message ?? err);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

adminRouter.get('/wallet/:address', async (req, res) => {
  try {
    const address = String(req.params.address).toLowerCase();
    if (!ADDRESS_RE.test(address)) return res.status(400).json({ error: 'Invalid address' });

    const [position, activity] = await Promise.all([
      readPosition(address),
      supabase
        .from('events')
        .select(EVENT_COLUMNS)
        .eq('wallet', address)
        .order('ts', { ascending: false })
        .limit(200),
    ]);
    if (activity.error) throw activity.error;
    res.json({ position, events: activity.data });
  } catch (err) {
    console.error('[api] /admin/wallet failed:', err.message ?? err);
    res.status(500).json({ error: 'Failed to load wallet detail' });
  }
});
