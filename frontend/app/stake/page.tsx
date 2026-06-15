'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { Zap, Check } from 'lucide-react';
import { tokenAbi, stakingAbi, TOKEN_ADDRESS, STAKING_ADDRESS } from '../../lib/contracts';
import { fmt } from '../../lib/format';
import { useMounted } from '../../lib/useMounted';
import CountUp from '../../components/CountUp';
import TxButton from '../../components/TxButton';

function parseAmount(value: string): bigint | null {
  if (!value.trim()) return null;
  try {
    return parseUnits(value.trim(), 18);
  } catch {
    return null;
  }
}

function Stepper({ step }: { step: number }) {
  // step: 1 = approve, 2 = stake
  return (
    <div className="stepper">
      <div className={`step ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>
        <div className="step-dot">{step > 1 ? <Check size={14} /> : '1'}</div>
        <div className="step-label">Approve</div>
      </div>
      <div className={`step-line ${step > 1 ? 'filled' : ''}`}>
        <div className="fill" />
      </div>
      <div className={`step ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
        <div className="step-dot">{step > 2 ? <Check size={14} /> : '2'}</div>
        <div className="step-label">Stake</div>
      </div>
    </div>
  );
}

function AmountField({
  value,
  onChange,
  onMax,
  max,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onMax: () => void;
  max?: bigint;
  label: string;
}) {
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row between xs">
        <span className="muted" style={{ fontWeight: 600 }}>{label}</span>
        <span className="dim">
          Balance: <span className="mono">{fmt(max)}</span> STK
        </span>
      </div>
      <div className="amount-box">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="0.0" inputMode="decimal" />
        <button className="btn btn-sm btn-outline" onClick={onMax}>Max</button>
        <span className="amount-suffix">STK</span>
      </div>
    </div>
  );
}

export default function StakePage() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<'stake' | 'unstake'>('stake');
  const [stakeInput, setStakeInput] = useState('');
  const [unstakeInput, setUnstakeInput] = useState('');

  const enabled = { enabled: !!address, refetchInterval: 10_000 };

  const balance = useReadContract({
    address: TOKEN_ADDRESS, abi: tokenAbi, functionName: 'balanceOf',
    args: address ? [address] : undefined, query: enabled,
  });
  const allowance = useReadContract({
    address: TOKEN_ADDRESS, abi: tokenAbi, functionName: 'allowance',
    args: address ? [address, STAKING_ADDRESS] : undefined, query: enabled,
  });
  const staked = useReadContract({
    address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'stakedBalance',
    args: address ? [address] : undefined, query: enabled,
  });
  const rewards = useReadContract({
    address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'pendingRewards',
    args: address ? [address] : undefined, query: enabled,
  });

  if (!mounted) {
    return <div aria-hidden className="skel" style={{ height: 320, borderRadius: 16 }} />;
  }
  if (!isConnected) {
    return (
      <div className="col fade-key" style={{ gap: 24, maxWidth: 460 }}>
        <h1 className="section-title">Stake</h1>
        <div className="empty">
          <div className="empty-icon">
            <Zap size={26} />
          </div>
          <div className="small">Connect your wallet to stake STK.</div>
        </div>
      </div>
    );
  }

  const balanceVal = balance.data as bigint | undefined;
  const allowanceVal = allowance.data as bigint | undefined;
  const stakedVal = staked.data as bigint | undefined;
  const rewardsVal = rewards.data as bigint | undefined;

  const stakeAmount = parseAmount(stakeInput);
  const unstakeAmount = parseAmount(unstakeInput);

  const stakeValid = stakeAmount !== null && stakeAmount > 0n && balanceVal !== undefined && stakeAmount <= balanceVal;
  const needsApproval = stakeValid && allowanceVal !== undefined && allowanceVal < stakeAmount!;
  const unstakeValid = unstakeAmount !== null && unstakeAmount > 0n && stakedVal !== undefined && unstakeAmount <= stakedVal;
  const stepperStep = !stakeValid ? 1 : needsApproval ? 1 : 2;

  const rewardsNum = rewardsVal !== undefined ? Number(formatUnits(rewardsVal, 18)) : 0;
  const stakedNum = stakedVal !== undefined ? Number(formatUnits(stakedVal, 18)) : 0;

  return (
    <div className="col fade-key" style={{ gap: 24 }}>
      <div className="col" style={{ gap: 6 }}>
        <span className="eyebrow">Earn</span>
        <h1 className="section-title">Stake</h1>
      </div>

      <div className="split">
        {/* left: stake/unstake card */}
        <div className="card card-pad col" style={{ gap: 16 }}>
          <div className="seg" style={{ alignSelf: 'flex-start' }}>
            <button className={tab === 'stake' ? 'on' : ''} onClick={() => setTab('stake')}>Stake</button>
            <button className={tab === 'unstake' ? 'on' : ''} onClick={() => setTab('unstake')}>Unstake</button>
          </div>

          {tab === 'stake' ? (
            <div className="col fade-key" style={{ gap: 16 }}>
              <Stepper step={stepperStep} />
              <AmountField value={stakeInput} onChange={setStakeInput} onMax={() => balanceVal !== undefined && setStakeInput(formatUnits(balanceVal, 18))} max={balanceVal} label="Amount to stake" />
              {stakeInput && stakeAmount === null && <div className="xs danger-text">Invalid amount</div>}
              {stakeAmount !== null && balanceVal !== undefined && stakeAmount > balanceVal && (
                <div className="xs danger-text">Amount exceeds balance</div>
              )}
              {needsApproval ? (
                <div className="col" style={{ gap: 8 }}>
                  <TxButton
                    label={`Approve ${stakeInput} STK`}
                    big
                    address={TOKEN_ADDRESS}
                    abi={tokenAbi}
                    functionName="approve"
                    args={[STAKING_ADDRESS, stakeAmount!]}
                  />
                  <div className="xs dim">Step 1 of 2 — approve the staking contract, then Stake unlocks.</div>
                </div>
              ) : (
                <TxButton
                  label="Stake"
                  big
                  address={STAKING_ADDRESS}
                  abi={stakingAbi}
                  functionName="stake"
                  args={stakeAmount !== null ? [stakeAmount] : undefined}
                  disabled={!stakeValid || allowanceVal === undefined}
                  onConfirmed={() => setStakeInput('')}
                />
              )}
            </div>
          ) : (
            <div className="col fade-key" style={{ gap: 16 }}>
              <AmountField value={unstakeInput} onChange={setUnstakeInput} onMax={() => stakedVal !== undefined && setUnstakeInput(formatUnits(stakedVal, 18))} max={stakedVal} label="Amount to unstake" />
              {unstakeAmount !== null && stakedVal !== undefined && unstakeAmount > stakedVal && (
                <div className="xs danger-text">Amount exceeds staked balance</div>
              )}
              <TxButton
                label="Unstake"
                big
                address={STAKING_ADDRESS}
                abi={stakingAbi}
                functionName="unstake"
                args={unstakeAmount !== null ? [unstakeAmount] : undefined}
                disabled={!unstakeValid}
                onConfirmed={() => setUnstakeInput('')}
              />
            </div>
          )}
        </div>

        {/* right: position + rewards */}
        <div className="col" style={{ gap: 16 }}>
          <div className="card card-pad col" style={{ gap: 16 }}>
            <div style={{ fontWeight: 700 }}>Your position</div>
            <div className="col" style={{ gap: 4 }}>
              <span className="stat-label">Staked</span>
              <div className="stat-value mid-num">
                <CountUp value={stakedNum} /> <span className="stat-unit">STK</span>
              </div>
            </div>
            <div className="divider" />
            <div className="col" style={{ gap: 4 }}>
              <div className="row between">
                <span className="stat-label">Pending rewards</span>
                {!!stakedVal && stakedVal > 0n && (
                  <span className="badge success" style={{ fontSize: 10, padding: '2px 7px' }}>
                    <span className="badge-dot" /> Live
                  </span>
                )}
              </div>
              <div className="stat-value mid-num" style={{ color: 'var(--accent)' }}>
                <CountUp value={rewardsNum} decimals={6} /> <span className="stat-unit">STK</span>
              </div>
            </div>
            <TxButton
              label="Claim rewards"
              big
              address={STAKING_ADDRESS}
              abi={stakingAbi}
              functionName="claimRewards"
              disabled={!rewardsVal || rewardsVal === 0n}
            />
          </div>
          <div className="card card-pad col" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 8, fontWeight: 700 }}>
              <Zap size={16} style={{ color: 'var(--accent)' }} /> High-yield demo
            </div>
            <div className="xs muted">Rewards accrue at ~0.006 STK per minute for every 100 STK staked — visible within a minute at 4 decimals.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
