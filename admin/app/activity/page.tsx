'use client';

import { useState } from 'react';
import { useAdminQuery } from '../../lib/useAdminQuery';
import { fmt, short, timeAgo, txUrl } from '../../lib/format';

const PAGE_SIZE = 50;

type Ev = {
  id: number;
  tx_hash: string;
  event_type: 'claim' | 'stake' | 'unstake' | 'reward';
  wallet: string;
  amount: string;
  block_number: number;
  ts: string;
};

const BADGE: Record<Ev['event_type'], string> = {
  claim: 'bg-sky-100 text-sky-700',
  stake: 'bg-indigo-100 text-indigo-700',
  unstake: 'bg-amber-100 text-amber-700',
  reward: 'bg-green-100 text-green-700',
};

export default function ActivityPage() {
  const [type, setType] = useState('');
  const [wallet, setWallet] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
  if (type) params.set('type', type);
  if (wallet.trim()) params.set('wallet', wallet.trim().toLowerCase());
  if (from) params.set('from', `${from}T00:00:00Z`);
  if (to) params.set('to', `${to}T23:59:59Z`);

  const { data, isLoading, error } = useAdminQuery<{ events: Ev[]; total: number }>(
    ['admin-activity', type, wallet, from, to, page],
    `/api/admin/activity?${params.toString()}`
  );

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function setFilter(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPage(0);
    };
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Activity</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Type</span>
          <select value={type} onChange={(e) => setFilter(setType)(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            <option value="claim">Claim</option>
            <option value="stake">Stake</option>
            <option value="unstake">Unstake</option>
            <option value="reward">Reward</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Wallet</span>
          <input
            value={wallet}
            onChange={(e) => setFilter(setWallet)(e.target.value)}
            placeholder="0x…"
            className="w-64 rounded border border-slate-300 px-2 py-1.5 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">From</span>
          <input type="date" value={from} onChange={(e) => setFilter(setFrom)(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">To</span>
          <input type="date" value={to} onChange={(e) => setFilter(setTo)(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5" />
        </label>
        <span className="ml-auto text-xs text-slate-500">{total} events</span>
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">Failed to load activity.</p>}
      {!isLoading && !error && (data?.events.length ?? 0) === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No events match these filters.</p>
      )}

      {(data?.events.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Block</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Tx</th>
              </tr>
            </thead>
            <tbody>
              {data!.events.map((ev) => (
                <tr key={`${ev.tx_hash}-${ev.id}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[ev.event_type]}`}>{ev.event_type}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{short(ev.wallet)}</td>
                  <td className="px-4 py-2">{fmt(ev.amount)} STK</td>
                  <td className="px-4 py-2 text-slate-500">{ev.block_number}</td>
                  <td className="px-4 py-2 text-slate-500" title={new Date(ev.ts).toLocaleString()}>
                    {timeAgo(ev.ts)}
                  </td>
                  <td className="px-4 py-2">
                    <a href={txUrl(ev.tx_hash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-indigo-600 underline">
                      {short(ev.tx_hash)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-slate-500">
          Page {page + 1} of {pages}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page + 1 >= pages}
          className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
