'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmt, short, timeAgo, txUrl } from '../../lib/format';
import { useMounted } from '../../lib/useMounted';

type Ev = {
  id: number;
  tx_hash: string;
  event_type: 'claim' | 'stake' | 'unstake' | 'reward';
  wallet: string;
  amount: string;
  ts: string;
};

const BADGE: Record<Ev['event_type'], string> = {
  claim: 'bg-sky-100 text-sky-700',
  stake: 'bg-indigo-100 text-indigo-700',
  unstake: 'bg-amber-100 text-amber-700',
  reward: 'bg-green-100 text-green-700',
};

export default function HistoryPage() {
  const mounted = useMounted();
  const { address } = useAccount();
  const { token, wallet } = useAuth();
  const [onlyMine, setOnlyMine] = useState(false);

  const signedIn = !!token && !!wallet && wallet === address?.toLowerCase();

  const { data, isLoading, error } = useQuery<{ events: Ev[] }>({
    queryKey: ['history', signedIn ? wallet : 'global'],
    queryFn: () => (signedIn ? api('/api/me/activity', { token }) : api('/api/activity?limit=50')),
    refetchInterval: 15_000,
  });

  let events = data?.events ?? [];
  if (!signedIn && onlyMine && address) {
    events = events.filter((e) => e.wallet === address.toLowerCase());
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">History</h1>
        <div aria-hidden className="h-40 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">History</h1>
        {signedIn ? (
          <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Showing your activity ({short(wallet)})</span>
        ) : (
          <>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
              Global feed — sign in (top right) for your full history
            </span>
            {address && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
                Only my wallet
              </label>
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">Failed to load history — is the backend running?</p>}
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {!isLoading && !error && events.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No activity yet.</p>
      )}

      {events.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Tx</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={`${ev.tx_hash}-${ev.id}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[ev.event_type]}`}>{ev.event_type}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{short(ev.wallet)}</td>
                  <td className="px-4 py-2">{fmt(ev.amount)} STK</td>
                  <td className="px-4 py-2 text-slate-500">{timeAgo(ev.ts)}</td>
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
    </div>
  );
}
