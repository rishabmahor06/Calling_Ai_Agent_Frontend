'use client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { fmtDay, fmtMs } from '@/lib/format';

// Validated categorical slots 1-3 (dataviz reference palette) on a white surface.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'];
const AXIS = { fontSize: 11, fill: '#71717a' };
const GRID = '#f0f0f2';

function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-lg">
      <p className="mb-1 font-medium text-ink">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-ink">{valueFormatter(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const legendFmt = (v) => <span className="text-[12px] text-ink-2">{v}</span>;

/** Stacked daily bars: successful vs failed calls. */
export function DailyCallsChart({ data }) {
  const rows = (data || []).map((d) => ({ ...d, other: Math.max(0, d.total - d.successful - d.failed) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="_id" tickFormatter={fmtDay} tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<ChartTooltip labelFormatter={fmtDay} />} />
        <Legend iconType="square" iconSize={8} formatter={legendFmt} wrapperStyle={{ paddingTop: 6 }} />
        <Bar dataKey="successful" name="Successful" stackId="a" fill={SERIES[0]} stroke="#fff" strokeWidth={2} />
        <Bar dataKey="failed" name="Failed / no answer" stackId="a" fill={SERIES[1]} stroke="#fff" strokeWidth={2} />
        <Bar dataKey="other" name="In progress" stackId="a" fill={SERIES[2]} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single-series bars (e.g. hourly answer rate). */
export function SimpleBars({ data, dataKey, xKey, xFormatter, valueFormatter, name, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tickFormatter={xFormatter} tick={AXIS} axisLine={false} tickLine={false} minTickGap={8} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={valueFormatter} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<ChartTooltip labelFormatter={xFormatter} valueFormatter={valueFormatter} />} />
        <Bar dataKey={dataKey} name={name} fill={SERIES[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** p50 / p95 latency trend. */
export function LatencyTrend({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="day" tickFormatter={fmtDay} tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={fmtMs} width={52} />
        <Tooltip cursor={{ stroke: '#d4d4d8', strokeDasharray: '3 3' }} content={<ChartTooltip labelFormatter={fmtDay} valueFormatter={fmtMs} />} />
        <Legend iconType="plainline" iconSize={14} formatter={legendFmt} wrapperStyle={{ paddingTop: 6 }} />
        <Line type="monotone" dataKey="p50" name="P50" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
        <Line type="monotone" dataKey="p95" name="P95" stroke={SERIES[1]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Labelled horizontal bars in plain HTML: readable, accessible, no legend needed. */
export function BarList({ items, format = (v) => v.toLocaleString('en-IN') }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-[12px] text-ink-3">No data in this range</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${format(i.value)}`}>
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-ink-2">{i.label}</span>
            <span className="font-medium tabular-nums text-ink">{format(i.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-panel">
            <div className="h-2 rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: SERIES[0] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
