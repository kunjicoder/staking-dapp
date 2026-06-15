'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Droplet, Wallet, Clock, Check } from 'lucide-react';
import { tokenAbi, TOKEN_ADDRESS } from '../../lib/contracts';
import { useMounted } from '../../lib/useMounted';
import CountUp from '../../components/CountUp';
import TxButton from '../../components/TxButton';

const COOLDOWN = 6 * 3600; // seconds — for the ring proportion only

function hms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function CountdownRing({ secondsLeft, ready }: { secondsLeft: number; ready: boolean }) {
  const R = 86;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, secondsLeft / COOLDOWN));
  const offset = C * (1 - frac);
  return (
    <div className="ring-wrap">
      <svg width={200} height={200} viewBox="0 0 200 200">
        <circle className="ring-track" cx={100} cy={100} r={R} fill="none" strokeWidth={12} />
        <circle className="ring-prog" cx={100} cy={100} r={R} fill="none" strokeWidth={12} strokeDasharray={C} strokeDashoffset={offset} />
      </svg>
      <div className="ring-center">
        {ready ? (
          <>
            <Check size={36} className="success-text" />
            <div className="ring-cap">Ready</div>
          </>
        ) : (
          <>
            <div className="ring-time">{hms(secondsLeft)}</div>
            <div className="ring-cap">until next claim</div>
          </>
        )}
      </div>
    </div>
  );
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
    return <div aria-hidden className="skel" style={{ height: 320, borderRadius: 16 }} />;
  }
  if (!isConnected) {
    return (
      <div className="col fade-key" style={{ gap: 24, maxWidth: 460 }}>
        <h1 className="section-title">Claim STK</h1>
        <div className="empty">
          <div className="empty-icon">
            <Droplet size={26} />
          </div>
          <div className="small">Connect your wallet to claim from the faucet.</div>
        </div>
      </div>
    );
  }

  const balanceVal = balance.data as bigint | undefined;
  const target = nextClaim.data !== undefined ? Number(nextClaim.data) * 1000 : null;
  const secondsLeft = target !== null ? Math.max(0, Math.ceil((target - now) / 1000)) : null;
  const canClaim = secondsLeft === 0;

  return (
    <div className="col fade-key" style={{ gap: 24 }}>
      <div className="col" style={{ gap: 6 }}>
        <span className="eyebrow">Faucet</span>
        <h1 className="section-title">Claim STK</h1>
      </div>

      <div className="split">
        <div className="card card-pad col" style={{ gap: 18, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {secondsLeft === null ? (
            <div className="skel" style={{ width: 200, height: 200, borderRadius: '50%' }} />
          ) : (
            <CountdownRing secondsLeft={secondsLeft} ready={canClaim} />
          )}
          {secondsLeft === null ? (
            <div className="muted small">Loading claim status…</div>
          ) : canClaim ? (
            <div className="col" style={{ gap: 12, width: '100%', maxWidth: 280, alignItems: 'center' }}>
              <div className="muted small">The faucet is ready.</div>
              <TxButton label="Claim 100 STK" big address={TOKEN_ADDRESS} abi={tokenAbi} functionName="claim" />
            </div>
          ) : (
            <div className="col" style={{ gap: 8, alignItems: 'center' }}>
              <button className="btn btn-lg" disabled style={{ maxWidth: 280 }}>
                <Clock size={16} /> On cooldown
              </button>
              <div className="xs dim">Cooldown is enforced on-chain.</div>
            </div>
          )}
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card card-pad">
            <span className="stat-label">
              <Wallet size={14} /> Your balance
            </span>
            <div className="stat-value big-num" style={{ marginTop: 8 }}>
              {balanceVal === undefined ? <span className="dim">—</span> : <CountUp value={Number(formatUnits(balanceVal, 18))} />}
              <span className="stat-unit"> STK</span>
            </div>
          </div>
          <div className="card card-pad col" style={{ gap: 14 }}>
            <div style={{ fontWeight: 700 }}>How the faucet works</div>
            {([
              ['Each claim mints', '100 STK'],
              ['Cooldown', '6 hours / wallet'],
              ['Brand-new wallet', 'Can claim immediately'],
            ] as const).map(([l, v]) => (
              <div key={l} className="row between small">
                <span className="muted">{l}</span>
                <span className="mono" style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div className="xs dim">STK has no real value — it&apos;s a testnet token for trying staking.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
