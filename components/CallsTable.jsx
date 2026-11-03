'use client';
import { Table, StatusPill, OutcomePill, EmptyState } from './ui';
import { fmtDateTime, fmtDuration } from '@/lib/format';
import { PhoneOff } from 'lucide-react';

export function CallsTable({ calls, onOpen, compact }) {
  if (!calls?.length) {
    return (
      <EmptyState icon={PhoneOff} title="No calls yet">
        Calls appear here as soon as a campaign starts dialing.
      </EmptyState>
    );
  }
  return (
    <Table>
      <thead>
        <tr>
          <th className="th">Customer</th>
          <th className="th">Phone</th>
          {!compact && <th className="th">Campaign</th>}
          <th className="th">Start</th>
          {!compact && <th className="th">End</th>}
          <th className="th">Duration</th>
          <th className="th">Status</th>
          <th className="th">Keys</th>
          <th className="th">WhatsApp</th>
          <th className="th">Transfer</th>
        </tr>
      </thead>
      <tbody>
        {calls.map((c) => (
          <tr key={c._id} onClick={() => onOpen?.(c._id)} className="cursor-pointer hover:bg-panel/70">
            <td className="td">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-panel text-2xs font-semibold text-ink-2">
                  {(c.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="font-medium text-ink">{c.name || 'Unknown'}</span>
              </div>
            </td>
            <td className="td tabular-nums">{c.phone}</td>
            {!compact && <td className="td">{c.campaign?.name || c.campaignName || <span className="text-ink-4">Test call</span>}</td>}
            <td className="td">{fmtDateTime(c.answeredAt || c.initiatedAt)}</td>
            {!compact && <td className="td">{fmtDateTime(c.endedAt)}</td>}
            <td className="td tabular-nums">{fmtDuration(c.duration)}</td>
            <td className="td">
              <StatusPill status={c.status} />
            </td>
            <td className="td font-medium tabular-nums text-ink">{c.dtmf?.length ? c.dtmf.map((d) => d.digit).join(', ') : <span className="text-ink-4">—</span>}</td>
            <td className="td">
              <OutcomePill value={c.whatsapp?.status} />
            </td>
            <td className="td">
              <OutcomePill value={c.transfer?.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
