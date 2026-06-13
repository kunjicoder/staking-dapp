'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { tokenAbi, stakingAbi, TOKEN_ADDRESS, STAKING_ADDRESS } from '../../lib/contracts';
import { fmt } from '../../lib/format';
import { useMounted } from '../../lib/useMounted';
import TxButton from '../../components/TxButton';

function parseAmount(value: string): bigint | null {
  if (!value.trim()) return null;
  try {
    return parseUnits(value.trim(), 18);
  } catch {
    return null;
  }
}

export default function StakePage() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
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
    return <div aria-hidden className="h-40 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />;
  }
  if (!isConnected) {
    return <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Connect your wallet to stake STK.</p>;
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

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Stake</h1>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Stake STK</h2>
        <p className="mb-2 text-sm text-slate-500">Balance: {fmt(balanceVal)} STK</p>
        <div className="mb-3 flex gap-2">
          <input
            value={stakeInput}
            onChange={(e) => setStakeInput(e.target.value)}
            placeholder="0.0"
            inputMode="decimal"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <button
            onClick={() => balanceVal !== undefined && setStakeInput(formatUnits(balanceVal, 18))}
            className="rounded border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50"
          >
            Max
          </button>
        </div>
        {stakeInput && stakeAmount === null && <p className="mb-2 text-xs text-red-600">Invalid amount</p>}
        {stakeAmount !== null && balanceVal !== undefined && stakeAmount > balanceVal && (
          <p className="mb-2 text-xs text-red-600">Amount exceeds balance</p>
        )}
        {needsApproval ? (
          <TxButton
            label={`Approve ${stakeInput} STK`}
            address={TOKEN_ADDRESS}
            abi={tokenAbi}
            functionName="approve"
            args={[STAKING_ADDRESS, stakeAmount!]}
          />
        ) : (
          <TxButton
            label="Stake"
            address={STAKING_ADDRESS}
            abi={stakingAbi}
            functionName="stake"
            args={stakeAmount !== null ? [stakeAmount] : undefined}
            disabled={!stakeValid || allowanceVal === undefined}
            onConfirmed={() => setStakeInput('')}
          />
        )}
        {needsApproval && (
          <p className="mt-1 text-xs text-slate-500">Step 1 of 2 — approve the staking contract, then the Stake button unlocks.</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Your position</h2>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Staked</p>
            <p className="text-xl font-semibold">{fmt(stakedVal)} STK</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Pending rewards</p>
            <p className="text-xl font-semibold text-green-600">{fmt(rewardsVal)} STK</p>
          </div>
        </div>
        <TxButton
          label="Claim rewards"
          address={STAKING_ADDRESS}
          abi={stakingAbi}
          functionName="claimRewards"
          disabled={!rewardsVal || rewardsVal === 0n}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Unstake</h2>
        <div className="mb-3 flex gap-2">
          <input
            value={unstakeInput}
            onChange={(e) => setUnstakeInput(e.target.value)}
            placeholder="0.0"
            inputMode="decimal"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <button
            onClick={() => stakedVal !== undefined && setUnstakeInput(formatUnits(stakedVal, 18))}
            className="rounded border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50"
          >
            Max
          </button>
        </div>
        {unstakeAmount !== null && stakedVal !== undefined && unstakeAmount > stakedVal && (
          <p className="mb-2 text-xs text-red-600">Amount exceeds staked balance</p>
        )}
        <TxButton
          label="Unstake"
          address={STAKING_ADDRESS}
          abi={stakingAbi}
          functionName="unstake"
          args={unstakeAmount !== null ? [unstakeAmount] : undefined}
          disabled={!unstakeValid}
          onConfirmed={() => setUnstakeInput('')}
        />
      </section>
    </div>
  );
}
