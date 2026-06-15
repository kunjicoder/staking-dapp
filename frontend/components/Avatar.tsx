'use client';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic gradient identicon from an address. */
export default function Avatar({ addr, size = 22 }: { addr?: string | null; size?: number }) {
  const h = hashStr(addr || '0x0');
  const a = h % 360;
  const b = (h >> 3) % 360;
  return (
    <span
      className="wallet-avatar"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from ${h % 360}deg, oklch(0.7 0.18 ${a}), oklch(0.65 0.17 ${b}), oklch(0.7 0.18 ${a}))`,
      }}
    />
  );
}
