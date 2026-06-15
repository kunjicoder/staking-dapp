import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import Header from '../components/Header';

export const metadata: Metadata = {
  title: 'STK Staking',
  description: 'Stake STK on Sepolia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-accent="iris" suppressHydrationWarning>
      <body>
        <Providers>
          <Header />
          <main className="container" style={{ paddingTop: 48, paddingBottom: 64 }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
