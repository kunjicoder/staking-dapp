import { formatUnits } from 'viem';

export function fmt(raw?: bigint | string | null, dp = 4): string {
  if (raw === undefined || raw === null) return '—';
  let value: bigint;
  try {
    value = BigInt(raw);
  } catch {
    return '—';
  }
  const s = formatUnits(value, 18);
  const [whole, frac = ''] = s.split('.');
  const trimmed = frac.slice(0, dp).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function toNumber(raw: string): number {
  try {
    return Number(formatUnits(BigInt(raw), 18));
  } catch {
    return 0;
  }
}

export function short(addr?: string | null): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function txUrl(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}
