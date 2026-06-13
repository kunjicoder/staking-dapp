'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { short } from '../lib/format';
import { useAuth, useSignIn } from '../lib/auth';
import { useMounted } from '../lib/useMounted';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/claim', label: 'Claim' },
  { href: '/stake', label: 'Stake' },
  { href: '/history', label: 'History' },
];

export default function Header() {
  const mounted = useMounted();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { token, wallet, signOut } = useAuth();
  const signIn = useSignIn();
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const wrongNetwork = isConnected && chainId !== sepolia.id;
  const signedIn = !!token && !!wallet && wallet === address?.toLowerCase();

  async function handleSignIn() {
    setSigningIn(true);
    setSignInError(null);
    try {
      await signIn();
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
        <span className="text-lg font-bold text-indigo-700">STK Staking</span>
        <nav className="flex gap-3 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-slate-600 hover:text-indigo-700">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {!mounted && <div aria-hidden className="h-8 w-36 animate-pulse rounded bg-slate-200" />}
          {mounted && wrongNetwork && (
            <button
              onClick={() => switchChain({ chainId: sepolia.id })}
              disabled={switching}
              className="rounded bg-amber-500 px-3 py-1.5 font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {switching ? 'Switching…' : 'Switch to Sepolia'}
            </button>
          )}
          {mounted && isConnected && !signedIn && !wrongNetwork && (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="rounded border border-indigo-600 px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              {signingIn ? 'Signing…' : 'Sign in'}
            </button>
          )}
          {mounted && signedIn && (
            <button onClick={signOut} className="rounded border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50">
              Sign out
            </button>
          )}
          {mounted &&
            (isConnected ? (
              <button
                onClick={() => disconnect()}
                className="rounded bg-slate-800 px-3 py-1.5 font-mono text-white hover:bg-slate-700"
                title="Disconnect"
              >
                {short(address)}
              </button>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                disabled={connecting || !connectors.length}
                className="rounded bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {connecting ? 'Connecting…' : 'Connect wallet'}
              </button>
            ))}
        </div>
        {mounted && signInError && <p className="w-full text-right text-xs text-red-600">{signInError}</p>}
      </div>
    </header>
  );
}
