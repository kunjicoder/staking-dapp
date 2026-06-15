'use client';

import { useMemo, useState } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import { useAdminQuery } from '../../lib/useAdminQuery';
import { fmt, short } from '../../lib/format';
import Avatar from '../../components/Avatar';

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
      className="btn btn-ghost btn-sm"
      style={{ height: 24, padding: '0 6px', color: 'var(--dim)' }}
      title="Copy address"
    >
      {copied ? <Check size={13} className="success-text" /> : <Copy size={13} />}
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
        className="sortable"
        onClick={() => {
          if (active) setSortDesc(!sortDesc);
          else {
            setSortKey(key);
            setSortDesc(true);
          }
        }}
      >
        {label}
        {active && <span className="sort-ind">{sortDesc ? '↓' : '↑'}</span>}
      </th>
    );
  }

  return (
    <div className="col fade-key" style={{ gap: 24 }}>
      <div className="row between wrap" style={{ alignItems: 'flex-end' }}>
        <div className="col" style={{ gap: 6 }}>
          <span className="eyebrow">Console</span>
          <h1 className="section-title">Stakers</h1>
        </div>
        <div style={{ position: 'relative', width: 'min(320px, 100%)' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--dim)' }} />
          <input
            className="input input-sm"
            style={{ paddingLeft: 36 }}
            placeholder="Search address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="row xs dim" style={{ gap: 12 }}>
        <span>{rows.length} wallets</span>
        <span>· balances read on-chain</span>
      </div>

      {error && <div className="banner danger">Failed to load stakers.</div>}

      {isLoading ? (
        <div className="tbl-wrap" style={{ padding: 16 }}>
          <div className="col" style={{ gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 18 }} />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty">
          <div className="small">{search ? 'No wallets match that search.' : 'No wallets seen yet.'}</div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {header('wallet', 'Address')}
                {header('tokenBalance', 'Token balance')}
                {header('stakedBalance', 'Staked')}
                {header('pendingRewards', 'Pending rewards')}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.wallet}>
                  <td>
                    <span className="row" style={{ gap: 8 }}>
                      <Avatar addr={s.wallet} size={20} />
                      <a className="mono xs" style={{ textDecoration: 'none' }} href={`https://sepolia.etherscan.io/address/${s.wallet}`} target="_blank" rel="noreferrer">
                        {short(s.wallet)}
                      </a>
                      <CopyButton text={s.wallet} />
                    </span>
                  </td>
                  <td className="td-amt">{fmt(s.tokenBalance)} STK</td>
                  <td className="td-amt">{fmt(s.stakedBalance)} STK</td>
                  <td className="td-amt success-text">{fmt(s.pendingRewards, 6)} STK</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
