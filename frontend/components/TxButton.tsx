'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import type { Abi } from 'viem';
import { txUrl } from '../lib/format';

function parseError(err: unknown): string {
  const e = err as { shortMessage?: string; message?: string };
  return e?.shortMessage ?? e?.message?.split('\n')[0] ?? 'Transaction failed';
}

type Props = {
  label: string;
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  disabled?: boolean;
  onConfirmed?: () => void;
  className?: string;
};

export default function TxButton({ label, address, abi, functionName, args, disabled, onConfirmed, className }: Props) {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (isSuccess && hash && handled.current !== hash) {
      handled.current = hash;
      queryClient.invalidateQueries(); // refresh all on-chain reads + API queries
      onConfirmed?.();
    }
  }, [isSuccess, hash, queryClient, onConfirmed]);

  const busy = isPending || confirming;

  return (
    <div>
      <button
        onClick={() => {
          reset();
          writeContract({ address, abi, functionName, args });
        }}
        disabled={disabled || busy}
        className={
          className ??
          'rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
        }
      >
        {busy && (
          <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent align-middle" />
        )}
        {isPending ? 'Confirm in wallet…' : confirming ? 'Confirming…' : label}
      </button>
      <div className="mt-1 min-h-5 text-xs">
        {confirming && hash && (
          <span className="text-slate-500">
            Waiting for confirmation —{' '}
            <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
              view tx
            </a>
          </span>
        )}
        {isSuccess && hash && (
          <span className="text-green-600">
            Confirmed ✓{' '}
            <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="underline">
              view tx
            </a>
          </span>
        )}
        {error && <span className="text-red-600">{parseError(error)}</span>}
      </div>
    </div>
  );
}
