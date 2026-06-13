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
import { useAdminQuery } from '../lib/useAdminQuery';
import { fmt, toNumber } from '../lib/format';

type AdminStats = {
  tvl: string;
  totalStakers: number;
  totalClaims: number;
  totalStakes: number;
  eventsPerDay: { date: string; total: number }[];
  cumulativeStaked: { date: string; staked: string }[];
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function OverviewPage() {
  const { data, isLoading, error } = useAdminQuery<AdminStats>(['admin-stats'], '/api/admin/stats', 30_000);

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error || !data) return <p className="text-red-600">Failed to load stats — is the backend running?</p>;

  const stakedSeries = data.cumulativeStaked.map((p) => ({ date: p.date.slice(5), staked: toNumber(p.staked) }));
  const eventsSeries = data.eventsPerDay.map((p) => ({ ...p, date: p.date.slice(5) }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="TVL" value={`${fmt(data.tvl)} STK`} />
        <StatCard label="Total stakers" value={String(data.totalStakers)} />
        <StatCard label="Total claims" value={String(data.totalClaims)} />
        <StatCard label="Total stakes" value={String(data.totalStakes)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 font-semibold">Events per day (14d)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventsSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="total" fill="#4f46e5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 font-semibold">Cumulative staked (14d)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stakedSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => [`${v} STK`, 'Staked']} />
                <Line type="monotone" dataKey="staked" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
