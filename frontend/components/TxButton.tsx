'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import type { Abi } from 'viem';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
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
  big?: boolean;
};

export default function TxButton({ label, address, abi, functionName, args, disabled, onConfirmed, className, big }: Props) {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const handled = useRef<string | null>(null);
  const errHandled = useRef<unknown>(null);

  useEffect(() => {
    if (isSuccess && hash && handled.current !== hash) {
      handled.current = hash;
      queryClient.invalidateQueries(); // refresh all on-chain reads + API queries
      onConfirmed?.();
      toast.success(`${label} confirmed`, {
        description: 'Your balances are up to date.',
        action: { label: 'View tx', onClick: () => window.open(txUrl(hash), '_blank', 'noopener') },
      });
    }
  }, [isSuccess, hash, queryClient, onConfirmed, label]);

  useEffect(() => {
    if (error && errHandled.current !== error) {
      errHandled.current = error;
      toast.error('Transaction failed', { description: parseError(error) });
    }
  }, [error]);

  const busy = isPending || confirming;
  const cls = className ?? `btn btn-primary${big ? ' btn-lg' : ''}`;

  return (
    <div>
      <button
        onClick={() => {
          reset();
          writeContract({ address, abi, functionName, args });
        }}
        disabled={disabled || busy}
        className={cls}
      >
        {busy && <span className="spin" />}
        {isPending ? (
          'Confirm in wallet…'
        ) : confirming ? (
          'Confirming…'
        ) : isSuccess ? (
          <>
            <Check size={16} /> Confirmed
          </>
        ) : (
          label
        )}
      </button>
      <div className="xs" style={{ minHeight: 18, marginTop: 6 }}>
        {confirming && hash && (
          <span className="dim">
            Mining —{' '}
            <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="link-tx">
              view tx
            </a>
          </span>
        )}
        {isSuccess && hash && (
          <span className="success-text">
            Confirmed ✓{' '}
            <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="link-tx" style={{ color: 'var(--success)' }}>
              view tx
            </a>
          </span>
        )}
        {error && <span className="danger-text">{parseError(error)}</span>}
      </div>
    </div>
  );
}
