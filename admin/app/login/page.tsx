'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { Shield, Wallet, AlertTriangle } from 'lucide-react';
import { useAuth, useSignIn } from '../../lib/auth';
import { short } from '../../lib/format';
import { useMounted } from '../../lib/useMounted';
import Avatar from '../../components/Avatar';

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
    <div className="col" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '64px 16px' }}>
      <div className="card card-pad fade-key" style={{ width: 'min(420px, 100%)' }}>
        <div className="row" style={{ gap: 12, marginBottom: 6 }}>
          <span className="brand-mark" style={{ width: 36, height: 36 }}>
            <Shield size={18} style={{ color: 'var(--accent-contrast)' }} />
          </span>
          <div className="col" style={{ gap: 2 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>STK Admin</div>
            <div className="xs dim">Internal protocol console</div>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 14 }}>
          Connect an admin wallet and sign in with Ethereum. Access is gated to allowlisted wallets.
        </p>

        <div className="col" style={{ gap: 12, marginTop: 16 }}>
          {!mounted ? (
            <div aria-hidden className="skel" style={{ height: 48, borderRadius: 12 }} />
          ) : !isConnected ? (
            <button className="btn btn-primary btn-lg" onClick={() => connect({ connector: connectors[0] })} disabled={connecting || !connectors.length}>
              <Wallet size={16} /> {connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          ) : wrongNetwork ? (
            <button className="btn btn-warning btn-lg" onClick={() => switchChain({ chainId: sepolia.id })} disabled={switching}>
              <AlertTriangle size={16} /> {switching ? 'Switching…' : 'Switch to Sepolia'}
            </button>
          ) : (
            <>
              <div className="row between chip" style={{ padding: '10px 12px' }}>
                <span className="row" style={{ gap: 8 }}>
                  <Avatar addr={address} size={20} /> Connected {short(address)}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => disconnect()}>Disconnect</button>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleSignIn} disabled={busy}>
                {busy && <span className="spin" />} {busy ? 'Signing in…' : 'Sign in with Ethereum'}
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="banner danger" style={{ marginTop: 16 }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
