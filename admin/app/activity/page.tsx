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
    <div className="col fade-key" style={{ gap: 24 }}>
      <div className="col" style={{ gap: 6 }}>
        <span className="eyebrow">Console</span>
        <h1 className="section-title">Activity</h1>
      </div>

      <div className="card card-pad row wrap" style={{ gap: 16, alignItems: 'flex-end' }}>
        <label className="col" style={{ gap: 5 }}>
          <span className="xs dim">Type</span>
          <select className="input input-sm" value={type} onChange={(e) => setFilter(setType)(e.target.value)}>
            <option value="">All</option>
            <option value="claim">Claim</option>
            <option value="stake">Stake</option>
            <option value="unstake">Unstake</option>
            <option value="reward">Reward</option>
          </select>
        </label>
        <label className="col" style={{ gap: 5 }}>
          <span className="xs dim">Wallet</span>
          <input className="input input-sm input-mono" style={{ width: 240 }} placeholder="0x…" value={wallet} onChange={(e) => setFilter(setWallet)(e.target.value)} />
        </label>
        <label className="col" style={{ gap: 5 }}>
          <span className="xs dim">From</span>
          <input type="date" className="input input-sm" style={{ width: 150 }} value={from} onChange={(e) => setFilter(setFrom)(e.target.value)} />
        </label>
        <label className="col" style={{ gap: 5 }}>
          <span className="xs dim">To</span>
          <input type="date" className="input input-sm" style={{ width: 150 }} value={to} onChange={(e) => setFilter(setTo)(e.target.value)} />
        </label>
        <span className="xs dim" style={{ marginLeft: 'auto' }}>{total} events</span>
      </div>

      {error && <div className="banner danger">Failed to load activity.</div>}

      {isLoading ? (
        <div className="tbl-wrap" style={{ padding: 16 }}>
          <div className="col" style={{ gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 18 }} />
            ))}
          </div>
        </div>
      ) : (data?.events.length ?? 0) === 0 ? (
        <div className="empty">
          <div className="small">No events match these filters.</div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {['Type', 'Wallet', 'Amount', 'Block', 'When', 'Tx'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data!.events.map((ev) => (
                <tr key={`${ev.tx_hash}-${ev.id}`}>
                  <td>
                    <span className={`badge ${ev.event_type}`}>
                      <span className="badge-dot" /> {ev.event_type}
                    </span>
                  </td>
                  <td className="mono xs">{short(ev.wallet)}</td>
                  <td className="td-amt">{fmt(ev.amount)} STK</td>
                  <td className="muted mono xs">{ev.block_number}</td>
                  <td className="muted small" title={new Date(ev.ts).toLocaleString()}>
                    {timeAgo(ev.ts)}
                  </td>
                  <td>
                    <a href={txUrl(ev.tx_hash)} target="_blank" rel="noreferrer" className="link-tx">
                      {short(ev.tx_hash)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="row" style={{ gap: 12 }}>
        <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          ← Prev
        </button>
        <span className="small dim">
          Page {page + 1} of {pages}
        </span>
        <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= pages}>
          Next →
        </button>
      </div>
    </div>
  );
}
