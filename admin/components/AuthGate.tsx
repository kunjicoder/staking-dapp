'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, ArrowUpRight, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { short } from '../lib/format';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/stakers', label: 'Stakers' },
  { href: '/activity', label: 'Activity' },
];

function AdminHeader() {
  const { wallet, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <header className="hdr">
      <div className="container container-admin">
        <div className="hdr-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Shield size={14} style={{ color: 'var(--accent-contrast)' }} />
            </span>
            STK <span className="brand-sub">Admin</span>
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
            <span className="chip">
              <Avatar addr={wallet} size={18} /> {short(wallet)}
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                signOut();
                router.replace('/login');
              }}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, role, ready } = useAuth();
  const isLogin = pathname === '/login';
  const authed = !!token && role === 'admin';

  useEffect(() => {
    if (ready && !isLogin && !authed) router.replace('/login');
  }, [ready, isLogin, authed, router]);

  if (isLogin) return <main>{children}</main>;
  if (!ready) return null;
  if (!authed) return null;

  return (
    <>
      <AdminHeader />
      <main className="container container-admin" style={{ paddingTop: 40, paddingBottom: 64 }}>
        {children}
      </main>
    </>
  );
}
