'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { wagmiConfig } from '../lib/wagmi';
import { AuthProvider } from '../lib/auth';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>{children}</AuthProvider>
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'var(--surface-2)',
                color: 'var(--fg)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-sans)',
              },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
