'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { tokenAbi, TOKEN_ADDRESS } from '../../lib/contracts';
import { fmt } from '../../lib/format';
import { useMounted } from '../../lib/useMounted';
import TxButton from '../../components/TxButton';

function hms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function ClaimPage() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const balance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const nextClaim = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'nextClaimTime',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  if (!mounted) {
    return <div aria-hidden className="h-40 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />;
  }
  if (!isConnected) {
    return <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Connect your wallet to claim STK.</p>;
  }

  const target = nextClaim.data !== undefined ? Number(nextClaim.data) * 1000 : null;
  const secondsLeft = target !== null ? Math.max(0, Math.ceil((target - now) / 1000)) : null;
  const canClaim = secondsLeft === 0;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Claim STK</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Your balance</p>
        <p className="mt-1 text-2xl font-semibold">{fmt(balance.data as bigint | undefined)} STK</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        {secondsLeft === null ? (
          <p className="text-slate-500">Loading claim status…</p>
        ) : canClaim ? (
          <TxButton label="Claim 100 STK" address={TOKEN_ADDRESS} abi={tokenAbi} functionName="claim" />
        ) : (
          <div>
            <button disabled className="cursor-not-allowed rounded bg-slate-300 px-4 py-2 font-medium text-slate-600">
              Next claim in {hms(secondsLeft)}
            </button>
            <p className="mt-2 text-xs text-slate-500">The faucet cooldown is enforced on-chain.</p>
          </div>
        )}
      </div>
    </div>
  );
}
