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
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
