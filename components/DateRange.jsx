'use client';
import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';

const PRESETS = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', custom: 'Custom' };

const istMidnight = (date) => new Date(`${date}T00:00:00+05:30`);
const toIstDate = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export function rangeFor(preset, custom) {
  const now = new Date();
  if (preset === 'custom' && custom.from && custom.to) {
    return { from: istMidnight(custom.from), to: new Date(istMidnight(custom.to).getTime() + 864e5) };
  }
  if (preset === 'today') return { from: istMidnight(toIstDate(now)), to: now };
  const days = { '7d': 7, '30d': 30, '90d': 90 }[preset] || 7;
  return { from: new Date(now.getTime() - days * 864e5), to: now };
}

/** Preset + optional custom range. Returns stable {from,to} params for useApi. */
export function useDateRange(initial = '7d') {
  const [preset, setPreset] = useState(initial);
  const [custom, setCustom] = useState({ from: '', to: '' });
  // Round "now" to the minute so the params object doesn't change every render.
  // eslint-disable-next-line react-hooks/purity -- reading the clock here is intentional; the value is minute-stable
  const minute = Math.floor(Date.now() / 60000);
  const range = useMemo(() => {
    const r = rangeFor(preset, custom);
    return { from: r.from.toISOString(), to: r.to.toISOString() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, custom.from, custom.to, minute]);
  return { preset, setPreset, custom, setCustom, range };
}

export function DateRangePicker({ preset, setPreset, custom, setCustom }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={preset} onChange={(e) => setPreset(e.target.value)} className="input h-8 w-auto pr-8 text-[12px]" aria-label="Date range">
        {Object.entries(PRESETS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      {preset === 'custom' && (
        <div className="flex items-center gap-1.5 rounded-lg border border-line-2 bg-white px-2 py-1 text-[12px] text-ink-2">
          <CalendarDays className="h-3.5 w-3.5 text-ink-3" />
          <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="bg-transparent outline-none" aria-label="From date" />
          <span className="text-ink-4">—</span>
          <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="bg-transparent outline-none" aria-label="To date" />
        </div>
      )}
    </div>
  );
}
