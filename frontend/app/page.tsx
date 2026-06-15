'use client';

import Link from 'next/link';
import { useAccount, useReadContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { Wallet, Layers, Gift, TrendingUp, Droplet, Zap, History, ArrowUpRight, RefreshCw } from 'lucide-react';
import { tokenAbi, stakingAbi, TOKEN_ADDRESS, STAKING_ADDRESS } from '../lib/contracts';
import { api } from '../lib/api';
import { useMounted } from '../lib/useMounted';
import CountUp from '../components/CountUp';

const POLL = { refetchInterval: 10_000 };

type Stats = { tvl: string; totalStakers: number; totalClaims: number; totalStakes: number };

const num = (v?: bigint) => (v === undefined ? 0 : Number(formatUnits(v, 18)));

function StatCard({
  icon,
  label,
  value,
  unit,
  decimals = 4,
  accent,
  live,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  accent?: boolean;
  live?: boolean;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="card card-pad card-hover">
      <div className="row between">
        <span className="stat-label">
          {icon} {label}
        </span>
        {live && (
          <span className="badge success" style={{ fontSize: 10, padding: '2px 7px' }}>
            <span className="badge-dot" /> Live
          </span>
        )}
      </div>
      {loading ? (
        <div className="skel" style={{ width: 140, height: 30, marginTop: 12 }} />
      ) : (
        <div className="stat-value big-num" style={accent ? { color: 'var(--accent)' } : undefined}>
          <CountUp value={value} decimals={decimals} />
          {unit && <span className="stat-unit"> {unit}</span>}
        </div>
      )}
      {sub && <div className="xs dim" style={{ marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();

  const balance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, ...POLL },
  });
  const staked = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: 'stakedBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address, ...POLL },
  });
  const rewards = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: 'pendingRewards',
    args: address ? [address] : undefined,
    query: { enabled: !!address, ...POLL },
  });

  const stats = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => api<Stats>('/api/stats'),
    refetchInterval: 15_000,
  });

  const balanceVal = balance.data as bigint | undefined;
  const stakedVal = staked.data as bigint | undefined;
  const rewardsVal = rewards.data as bigint | undefined;
  const statsLoading = !stats.data;

  return (
    <div className="col fade-key" style={{ gap: 24 }}>
      <div className="row between wrap" style={{ alignItems: 'flex-end' }}>
        <div className="col" style={{ gap: 6 }}>
          <span className="eyebrow">STK Protocol</span>
          <h1 className="section-title">Dashboard</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="chip">
            <span className="online-dot" /> Sepolia testnet
          </span>
          <span className="chip dim">
            <RefreshCw size={13} /> Auto · 10s
          </span>
        </div>
      </div>

      {!mounted ? (
        <div className="grid-x g-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card card-pad">
              <div className="skel" style={{ width: 120, height: 14 }} />
              <div className="skel" style={{ width: 150, height: 30, marginTop: 14 }} />
            </div>
          ))}
        </div>
      ) : isConnected ? (
        <div className="grid-x g-3 stagger">
          <StatCard icon={<Wallet size={14} />} label="Available balance" value={num(balanceVal)} unit="STK" loading={balanceVal === undefined} />
          <StatCard icon={<Layers size={14} />} label="Staked" value={num(stakedVal)} unit="STK" loading={stakedVal === undefined} />
          <StatCard
            icon={<Gift size={14} />}
            label="Pending rewards"
            value={num(rewardsVal)}
            unit="STK"
            decimals={6}
            accent
            live={!!stakedVal && stakedVal > 0n}
            sub="≈ 3,154% APR · accrues every second"
            loading={rewardsVal === undefined}
          />
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">
            <Wallet size={26} />
          </div>
          <div className="col" style={{ gap: 4, alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg)' }}>Connect your wallet to get started</div>
            <div className="small">See your balances, claim from the faucet, and start earning rewards.</div>
          </div>
        </div>
      )}

      {/* protocol strip */}
      <div className="card card-pad">
        <div className="row between wrap" style={{ gap: 24 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="stat-label">
              <TrendingUp size={14} /> Protocol TVL
            </span>
            <div className="stat-value hero-num">
              {statsLoading ? (
                <span className="dim">—</span>
              ) : (
                <CountUp value={num(stats.data ? BigInt(stats.data.tvl) : undefined)} decimals={0} />
              )}
              <span className="stat-unit"> STK</span>
            </div>
          </div>
          <div className="row wrap" style={{ gap: 24 }}>
            {([
              ['Total stakers', stats.data?.totalStakers],
              ['Total stakes', stats.data?.totalStakes],
              ['Total claims', stats.data?.totalClaims],
            ] as const).map(([label, v]) => (
              <div key={label} className="col" style={{ gap: 4 }}>
                <span className="stat-label">{label}</span>
                <div className="stat-value mid-num">{statsLoading ? <span className="dim">—</span> : <CountUp value={Number(v ?? 0)} decimals={0} />}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div className="grid-x g-3 stagger">
        {[
          { href: '/claim', icon: <Droplet size={20} />, title: 'Claim from faucet', desc: 'Get 100 STK to test with. 6h cooldown.' },
          { href: '/stake', icon: <Zap size={20} />, title: 'Stake & earn', desc: 'Stake STK to accrue rewards every second.' },
          { href: '/history', icon: <History size={20} />, title: 'Activity history', desc: 'Your claims, stakes and reward claims.' },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="card card-pad card-hover card-link">
            <div className="row between">
              <span className="empty-icon" style={{ width: 40, height: 40, borderRadius: 12, color: 'var(--accent)', background: 'var(--accent-soft)' }}>
                {c.icon}
              </span>
              <ArrowUpRight size={18} style={{ color: 'var(--dim)' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 14 }}>{c.title}</div>
            <div className="small muted" style={{ marginTop: 8 }}>{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
