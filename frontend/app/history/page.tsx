'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { Shield, History as HistoryIcon } from 'lucide-react';
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
      <div className="col" style={{ gap: 24 }}>
        <h1 className="section-title">History</h1>
        <div className="skel" style={{ height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="col fade-key" style={{ gap: 24 }}>
      <div className="row between wrap" style={{ alignItems: 'flex-end' }}>
        <div className="col" style={{ gap: 6 }}>
          <span className="eyebrow">Activity</span>
          <h1 className="section-title">History</h1>
        </div>
        {signedIn ? (
          <span className="badge success">
            <Shield size={13} /> Your activity · {short(wallet)}
          </span>
        ) : (
          <div className="row wrap" style={{ gap: 12 }}>
            <span className="chip dim">Global feed — sign in for full history</span>
            {address && (
              <label className="row small muted" style={{ gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Only my wallet
              </label>
            )}
          </div>
        )}
      </div>

      {error && <div className="banner danger">Failed to load history — is the backend running?</div>}

      {isLoading ? (
        <div className="tbl-wrap" style={{ padding: 16 }}>
          <div className="col" style={{ gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="row between">
                <div className="skel" style={{ width: 80, height: 22, borderRadius: 999 }} />
                <div className="skel" style={{ width: 120, height: 14 }} />
                <div className="skel" style={{ width: 90, height: 14 }} />
                <div className="skel" style={{ width: 60, height: 14 }} />
                <div className="skel" style={{ width: 70, height: 14 }} />
              </div>
            ))}
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <HistoryIcon size={26} />
          </div>
          <div className="small">No activity yet.</div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {['Type', 'Wallet', 'Amount', 'When', 'Tx'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={`${ev.tx_hash}-${ev.id}`}>
                  <td>
                    <span className={`badge ${ev.event_type}`}>
                      <span className="badge-dot" /> {ev.event_type}
                    </span>
                  </td>
                  <td className="mono xs">{short(ev.wallet)}</td>
                  <td className="td-amt">{fmt(ev.amount)} STK</td>
                  <td className="muted small">{timeAgo(ev.ts)}</td>
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
    </div>
  );
}
