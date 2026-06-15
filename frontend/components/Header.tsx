'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { Layers, Wallet, AlertTriangle, Shield, ChevronDown, Lock, ExternalLink, LogOut } from 'lucide-react';
import { short } from '../lib/format';
import { useAuth, useSignIn } from '../lib/auth';
import { useMounted } from '../lib/useMounted';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/claim', label: 'Claim' },
  { href: '/stake', label: 'Stake' },
  { href: '/history', label: 'History' },
];

function WalletCluster() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { token, wallet, signOut } = useAuth();
  const signIn = useSignIn();
  const [signingIn, setSigningIn] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const wrongNetwork = isConnected && chainId !== sepolia.id;
  const signedIn = !!token && !!wallet && wallet === address?.toLowerCase();

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signIn();
    } catch {
      /* surfaced by the auth flow; keep header quiet */
    } finally {
      setSigningIn(false);
    }
  }

  if (!isConnected) {
    return (
      <button className="btn btn-primary" onClick={() => connect({ connector: connectors[0] })} disabled={connecting || !connectors.length}>
        <Wallet size={16} />
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    );
  }

  if (wrongNetwork) {
    return (
      <button className="btn btn-warning" onClick={() => switchChain({ chainId: sepolia.id })} disabled={switching}>
        <AlertTriangle size={16} />
        {switching ? 'Switching…' : 'Switch to Sepolia'}
      </button>
    );
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      {!signedIn && (
        <button className="btn btn-outline" onClick={handleSignIn} disabled={signingIn}>
          <Shield size={15} />
          {signingIn ? 'Signing…' : 'Sign in'}
        </button>
      )}
      <div style={{ position: 'relative' }} ref={ref}>
        <button className="wallet-pill" onClick={() => setOpen((o) => !o)}>
          <Avatar addr={address} />
          <span>{short(address)}</span>
          {signedIn && <span className="online-dot" title="Signed in" />}
          <ChevronDown size={14} style={{ color: 'var(--dim)' }} />
        </button>
        {open && (
          <div className="pop" style={{ minWidth: 240 }}>
            <div className="row" style={{ gap: 12, padding: '8px 10px' }}>
              <Avatar addr={address} size={34} />
              <div className="col" style={{ gap: 2 }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{short(address)}</span>
                <span className="xs" style={{ color: signedIn ? 'var(--success)' : 'var(--dim)' }}>
                  {signedIn ? 'Signed in (SIWE)' : 'Not signed in'}
                </span>
              </div>
            </div>
            <div className="divider" style={{ margin: '6px 4px' }} />
            {!signedIn && (
              <button className="pop-row" onClick={() => { handleSignIn(); setOpen(false); }}>
                <Shield size={15} /> Sign in with Ethereum
              </button>
            )}
            {signedIn && (
              <button className="pop-row" onClick={() => { signOut(); setOpen(false); }}>
                <Lock size={15} /> Sign out
              </button>
            )}
            <a className="pop-row" href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> View on Etherscan
            </a>
            <button className="pop-row" onClick={() => { disconnect(); setOpen(false); }}>
              <LogOut size={15} /> Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Header() {
  const mounted = useMounted();
  const pathname = usePathname();

  return (
    <header className="hdr">
      <div className="container">
        <div className="hdr-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Layers size={15} style={{ color: 'var(--accent-contrast)' }} />
            </span>
            STK <span className="brand-sub">Staking</span>
          </Link>
          <nav className="nav">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={`nav-link ${pathname === item.href ? 'active' : ''}`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hdr-right">
            <ThemeToggle />
            {mounted ? (
              <WalletCluster />
            ) : (
              <div aria-hidden className="skel" style={{ height: 38, width: 150, borderRadius: 999 }} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
