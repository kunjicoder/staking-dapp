'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, Users, Droplet, Layers } from 'lucide-react';
import { useAdminQuery } from '../lib/useAdminQuery';
import { fmt, toNumber } from '../lib/format';
import CountUp from '../components/CountUp';

type AdminStats = {
  tvl: string;
  totalStakers: number;
  totalClaims: number;
  totalStakes: number;
  eventsPerDay: { date: string; total: number }[];
  cumulativeStaked: { date: string; staked: string }[];
};

const tooltipStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: 12,
  color: 'var(--fg)',
  fontSize: 12,
};

function StatCard({ icon, label, value, decimals = 0, unit }: { icon: React.ReactNode; label: string; value: number; decimals?: number; unit?: string }) {
  return (
    <div className="card card-pad">
      <span className="stat-label">
        {icon} {label}
      </span>
      <div className="stat-value big-num" style={{ marginTop: 8 }}>
        <CountUp value={value} decimals={decimals} />
        {unit && <span className="stat-unit"> {unit}</span>}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { data, isLoading, error } = useAdminQuery<AdminStats>(['admin-stats'], '/api/admin/stats', 30_000);

  if (isLoading) {
    return (
      <div className="grid-x g-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card card-pad">
            <div className="skel" style={{ width: 90, height: 14 }} />
            <div className="skel" style={{ width: 120, height: 30, marginTop: 14 }} />
          </div>
        ))}
      </div>
    );
  }
  if (error || !data) return <div className="banner danger">Failed to load stats — is the backend running?</div>;

  const stakedSeries = data.cumulativeStaked.map((p) => ({ date: p.date.slice(5), staked: toNumber(p.staked) }));
  const eventsSeries = data.eventsPerDay.map((p) => ({ ...p, date: p.date.slice(5) }));

  return (
    <div className="col fade-key" style={{ gap: 24 }}>
      <div className="col" style={{ gap: 6 }}>
        <span className="eyebrow">Console</span>
        <h1 className="section-title">Overview</h1>
      </div>

      <div className="grid-x g-4 stagger">
        <StatCard icon={<TrendingUp size={14} />} label="TVL" value={toNumber(data.tvl)} unit="STK" />
        <StatCard icon={<Users size={14} />} label="Total stakers" value={data.totalStakers} />
        <StatCard icon={<Droplet size={14} />} label="Total claims" value={data.totalClaims} />
        <StatCard icon={<Layers size={14} />} label="Total stakes" value={data.totalStakes} />
      </div>

      <div className="grid-x g-2 admin-charts">
        <div className="card card-pad">
          <div className="row between" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Events per day (14d)</div>
            <span className="legend">
              <span>
                <i style={{ background: 'var(--accent)' }} /> Events
              </span>
            </span>
          </div>
          <div className="chart-h">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventsSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: 'var(--dim)' }} stroke="var(--border)" />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: 'var(--dim)' }} stroke="var(--border)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-3)' }} />
                <Bar dataKey="total" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="row between" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Cumulative staked (14d)</div>
            <span className="legend">
              <span>
                <i style={{ background: 'var(--success)' }} /> Staked STK
              </span>
            </span>
          </div>
          <div className="chart-h">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stakedSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: 'var(--dim)' }} stroke="var(--border)" />
                <YAxis fontSize={11} tick={{ fill: 'var(--dim)' }} stroke="var(--border)" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} STK`, 'Staked']} />
                <Line type="monotone" dataKey="staked" stroke="var(--success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
