'use client';

import { useEffect, useState } from 'react';

/**
 * False during SSR and the first client render, true after mount.
 * Gate wallet-dependent UI on this so server and client HTML match
 * (wagmi reconnects and localStorage reads only happen client-side).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
