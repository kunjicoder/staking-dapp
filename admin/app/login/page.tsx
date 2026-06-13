'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useAuth, useSignIn } from '../../lib/auth';
import { short } from '../../lib/format';
import { useMounted } from '../../lib/useMounted';

export default function LoginPage() {
  const mounted = useMounted();
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { token, role, ready } = useAuth();
  const signIn = useSignIn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && token && role === 'admin') router.replace('/');
  }, [ready, token, role, router]);

  const wrongNetwork = isConnected && chainId !== sepolia.id;

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      const res = await signIn();
      if (res.role !== 'admin') {
        setError('Access denied — this wallet is not an admin.');
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8">
      <h1 className="mb-2 text-xl font-bold">STK Admin</h1>
      <p className="mb-6 text-sm text-slate-500">Connect an admin wallet and sign in with Ethereum.</p>

      {!mounted ? (
        <div aria-hidden className="h-10 animate-pulse rounded bg-slate-200" />
      ) : !isConnected ? (
        <button
          onClick={() => connect({ connector: connectors[0] })}
          disabled={connecting || !connectors.length}
          className="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {connecting ? 'Connecting…' : 'Connect wallet'}
        </button>
      ) : wrongNetwork ? (
        <button
          onClick={() => switchChain({ chainId: sepolia.id })}
          disabled={switching}
          className="w-full rounded bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {switching ? 'Switching…' : 'Switch to Sepolia'}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Connected as <span className="font-mono">{short(address)}</span>{' '}
            <button onClick={() => disconnect()} className="text-xs text-indigo-600 underline">
              disconnect
            </button>
          </p>
          <button
            onClick={handleSignIn}
            disabled={busy}
            className="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in with Ethereum'}
          </button>
        </div>
      )}

      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
