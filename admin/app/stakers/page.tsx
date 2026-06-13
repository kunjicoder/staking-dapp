'use client';

import { useMemo, useState } from 'react';
import { useAdminQuery } from '../../lib/useAdminQuery';
import { fmt, short } from '../../lib/format';

type Staker = {
  wallet: string;
  tokenBalance: string;
  stakedBalance: string;
  pendingRewards: string;
};

type SortKey = keyof Staker;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="ml-1 text-xs text-indigo-600 hover:underline"
      title="Copy address"
    >
      {copied ? 'copied ✓' : 'copy'}
    </button>
  );
}

export default function StakersPage() {
  const { data, isLoading, error } = useAdminQuery<{ stakers: Staker[] }>(['admin-stakers'], '/api/admin/stakers', 60_000);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('stakedBalance');
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    let list = data?.stakers ?? [];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) => s.wallet.includes(q));
    return [...list].sort((a, b) => {
      let cmp: number;
      if (sortKey === 'wallet') {
        cmp = a.wallet.localeCompare(b.wallet);
      } else {
        const av = BigInt(a[sortKey]);
        const bv = BigInt(b[sortKey]);
        cmp = av === bv ? 0 : av < bv ? -1 : 1;
      }
      return sortDesc ? -cmp : cmp;
    });
  }, [data, search, sortKey, sortDesc]);

  function header(key: SortKey, label: string) {
    const active = sortKey === key;
    return (
      <th
        className="cursor-pointer select-none px-4 py-3 hover:text-indigo-700"
        onClick={() => {
          if (active) setSortDesc(!sortDesc);
          else {
            setSortKey(key);
            setSortDesc(true);
          }
        }}
      >
        {label} {active ? (sortDesc ? '↓' : '↑') : ''}
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">Stakers</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address…"
          className="ml-auto w-72 rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {isLoading && <p className="text-slate-500">Loading (reading balances on-chain)…</p>}
      {error && <p className="text-red-600">Failed to load stakers.</p>}
      {!isLoading && !error && rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          {search ? 'No wallets match that search.' : 'No wallets seen yet.'}
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                {header('wallet', 'Address')}
                {header('tokenBalance', 'Token balance')}
                {header('stakedBalance', 'Staked')}
                {header('pendingRewards', 'Pending rewards')}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.wallet} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">
                    <a
                      href={`https://sepolia.etherscan.io/address/${s.wallet}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {short(s.wallet)}
                    </a>
                    <CopyButton text={s.wallet} />
                  </td>
                  <td className="px-4 py-2">{fmt(s.tokenBalance)} STK</td>
                  <td className="px-4 py-2">{fmt(s.stakedBalance)} STK</td>
                  <td className="px-4 py-2 text-green-700">{fmt(s.pendingRewards)} STK</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
