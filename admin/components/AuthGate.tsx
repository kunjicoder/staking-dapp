'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { short } from '../lib/format';

function AdminHeader() {
  const { wallet, signOut } = useAuth();
  const router = useRouter();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <span className="text-lg font-bold text-indigo-700">STK Admin</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/" className="text-slate-600 hover:text-indigo-700">Overview</Link>
          <Link href="/stakers" className="text-slate-600 hover:text-indigo-700">Stakers</Link>
          <Link href="/activity" className="text-slate-600 hover:text-indigo-700">Activity</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="font-mono text-slate-500">{short(wallet)}</span>
          <button
            onClick={() => {
              signOut();
              router.replace('/login');
            }}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
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

  if (isLogin) return <main className="mx-auto max-w-md px-4 py-16">{children}</main>;
  if (!ready) return null;
  if (!authed) return null;

  return (
    <>
      <AdminHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
