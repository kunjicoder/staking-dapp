import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import AuthGate from '../components/AuthGate';

export const metadata: Metadata = {
  title: 'STK Staking — Admin',
  description: 'Admin dashboard for the STK staking dApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-accent="iris" suppressHydrationWarning>
      <body>
        <Providers>
          <AuthGate>{children}</AuthGate>
        </Providers>
      </body>
    </html>
  );
}
