'use client';

import Link from 'next/link';
import { useAccount, useReadContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { tokenAbi, stakingAbi, TOKEN_ADDRESS, STAKING_ADDRESS } from '../lib/contracts';
import { api } from '../lib/api';
import { fmt } from '../lib/format';
import { useMounted } from '../lib/useMounted';

const POLL = { refetchInterval: 10_000 };

type Stats = { tvl: string; totalStakers: number; totalClaims: number; totalStakes: number };

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {!mounted ? (
        <div aria-hidden className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
      ) : isConnected ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Token balance" value={`${fmt(balance.data as bigint | undefined)} STK`} />
          <StatCard label="Staked" value={`${fmt(staked.data as bigint | undefined)} STK`} />
          <StatCard label="Pending rewards" value={`${fmt(rewards.data as bigint | undefined)} STK`} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Connect your wallet (top right) to see your balances and start staking.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Global TVL" value={stats.data ? `${fmt(stats.data.tvl)} STK` : '…'} />
        <StatCard label="Total stakers" value={stats.data ? String(stats.data.totalStakers) : '…'} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: '/claim', title: 'Claim tokens', desc: 'Get 100 STK from the faucet (cooldown applies).' },
          { href: '/stake', title: 'Stake', desc: 'Stake STK to earn rewards, unstake any time.' },
          { href: '/history', title: 'History', desc: 'Your past claims, stakes and reward claims.' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow"
          >
            <p className="font-semibold text-indigo-700">{card.title} →</p>
            <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
