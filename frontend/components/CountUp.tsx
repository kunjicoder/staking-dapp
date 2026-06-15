'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
};

/** Eases to `value` with requestAnimationFrame; tabular figures, no width shift. */
export default function CountUp({ value, decimals = 4, duration = 550, className, prefix = '', suffix = '' }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }
    startRef.current = null;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = Number(display).toLocaleString('en-US', {
    minimumFractionDigits: decimals <= 4 ? Math.min(decimals, 2) : 0,
    maximumFractionDigits: decimals,
  });
  return <span className={'num ' + (className || '')}>{prefix + formatted + suffix}</span>;
}
