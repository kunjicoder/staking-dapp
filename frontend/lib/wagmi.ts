import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    // Falls back to the public Sepolia RPC if unset (fine for local dev,
    // rate-limited in production — set NEXT_PUBLIC_RPC_URL to a dedicated endpoint).
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
});

export { sepolia };
