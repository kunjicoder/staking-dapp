'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Settings, Moon, Sun, Check } from 'lucide-react';
import { useMounted } from '../lib/useMounted';

const ACCENTS = [
  { id: 'iris', label: 'Iris', c: 'oklch(0.66 0.165 277)' },
  { id: 'emerald', label: 'Emerald', c: 'oklch(0.72 0.16 158)' },
  { id: 'cyan', label: 'Cyan', c: 'oklch(0.74 0.13 220)' },
  { id: 'amber', label: 'Amber', c: 'oklch(0.80 0.15 72)' },
];

export default function ThemeToggle() {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState('iris');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = document.documentElement.dataset.accent;
    if (a) setAccent(a);
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function pickAccent(id: string) {
    document.documentElement.dataset.accent = id;
    setAccent(id);
  }

  if (!mounted) {
    return (
      <button className="btn btn-ghost btn-icon" aria-label="Theme settings">
        <Settings size={18} />
      </button>
    );
  }

  const dark = theme !== 'light';
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn btn-ghost btn-icon" onClick={() => setOpen((o) => !o)} aria-label="Theme settings" title="Theme & accent">
        <Settings size={18} />
      </button>
      {open && (
        <div className="pop">
          <div className="pop-label">Theme</div>
          <button className={`pop-row ${dark ? 'on' : ''}`} onClick={() => setTheme('dark')}>
            <Moon size={16} /> Dark
            {dark && <Check size={15} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
          </button>
          <button className={`pop-row ${!dark ? 'on' : ''}`} onClick={() => setTheme('light')}>
            <Sun size={16} /> Light
            {!dark && <Check size={15} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
          </button>
          <div className="pop-label">Accent</div>
          {ACCENTS.map((a) => (
            <button key={a.id} className={`pop-row ${accent === a.id ? 'on' : ''}`} onClick={() => pickAccent(a.id)}>
              <span className="swatch" style={{ background: a.c }} /> {a.label}
              {accent === a.id && <Check size={15} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
