'use client';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Radio, Mic, Volume2, Ear, PhoneCall } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useSocketEvent, useSocket } from '@/lib/socket';
import { Card, PageHeader, StatusPill, OutcomePill, Table, EmptyState, Spinner, Badge, Button, Field, Input, Modal, useToast, ErrorNote } from '@/components/ui';
import { CallDrawer } from '@/components/CallDrawer';
import { fmtDuration, elapsedSince, ACTION_LABEL } from '@/lib/format';

const TERMINAL = ['completed', 'failed', 'no_answer', 'busy', 'canceled'];
const AGENT = {
  speaking: [Volume2, 'Speaking', 'text-brand-600'],
  listening: [Ear, 'Listening', 'text-emerald-600'],
  thinking: [Mic, 'Thinking', 'text-amber-600'],
  idle: [Mic, 'Idle', 'text-ink-3'],
  ended: [Mic, 'Ended', 'text-ink-4'],
};

function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

function TestCallModal({ open, onClose }) {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await api('/calls/test', { method: 'POST', body: { phone, name } });
      if (c.status === 'failed') setError(new Error(c.error || 'Call failed'));
      else {
        toast('Test call placed');
        onClose();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Place a test call"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!phone} onClick={submit}>
            Call now
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] text-ink-3">Places a real call through Exotel with the current agent settings — use your own number to test the IVR (press 1 / 9).</p>
        <ErrorNote error={error} />
        <Field label="Mobile number">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
        </Field>
        <Field label="Name (optional)">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export default function LiveCallsPage() {
  useTick();
  const { isAdmin } = useAuth();
  const { connected } = useSocket();
  const { data, loading, mutate } = useApi('/calls/live');
  const [openCall, setOpenCall] = useState(null);
  const [testOpen, setTestOpen] = useState(false);
  const [recent, setRecent] = useState([]);

  useSocketEvent('call:update', (c) => {
    if (TERMINAL.includes(c.status)) {
      const prev = data?.items?.find((x) => x._id === c._id);
      if (prev) setRecent((r) => [{ ...prev, ...c }, ...r.filter((x) => x._id !== c._id)].slice(0, 8));
    }
    mutate((d) => {
      const items = d?.items || [];
      const idx = items.findIndex((x) => x._id === c._id);
      if (TERMINAL.includes(c.status)) return { items: items.filter((x) => x._id !== c._id) };
      if (idx >= 0) return { items: items.map((x, i) => (i === idx ? { ...x, ...c } : x)) };
      return { items: [c, ...items] };
    });
  });

  const items = data?.items || [];
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Live calls"
        subtitle="Real-time view of calls being dialed and handled by the AI agent."
        actions={
          <>
            <Badge tone={connected ? 'green' : 'gray'} icon={Radio}>
              {connected ? 'Streaming updates' : 'Reconnecting…'}
            </Badge>
            {isAdmin && (
              <Button icon={PhoneCall} onClick={() => setTestOpen(true)}>
                Test call
              </Button>
            )}
          </>
        }
      />
      <Card>
        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : items.length ? (
          <Table>
            <thead>
              <tr>
                <th className="th">Customer</th>
                <th className="th">Mobile</th>
                <th className="th">Campaign</th>
                <th className="th">Status</th>
                <th className="th">Agent</th>
                <th className="th">Duration</th>
                <th className="th">IVR selection</th>
                <th className="th">WhatsApp</th>
                <th className="th">Transfer</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const [Icon, label, color] = AGENT[c.agentState] || AGENT.idle;
                const live = c.answeredAt ? elapsedSince(c.answeredAt) : null;
                return (
                  <tr key={c._id} className="cursor-pointer hover:bg-panel/70" onClick={() => setOpenCall(c._id)}>
                    <td className="td font-medium text-ink">{c.name || 'Unknown'}</td>
                    <td className="td tabular-nums">{c.phoneMasked || c.phone}</td>
                    <td className="td">{c.campaign?.name || c.campaignName || 'Test call'}</td>
                    <td className="td">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="td">
                      <span className={clsx('inline-flex items-center gap-1 text-[12px] font-medium', color)}>
                        <Icon className={clsx('h-3.5 w-3.5', c.agentState === 'speaking' && 'animate-pulse')} /> {label}
                      </span>
                    </td>
                    <td className="td tabular-nums">{live !== null ? fmtDuration(live) : <span className="text-ink-4">ringing {fmtDuration(elapsedSince(c.initiatedAt))}</span>}</td>
                    <td className="td">
                      {c.selection ? (
                        <Badge tone="violet">
                          {c.dtmf?.at?.(-1)?.digit ? `${c.dtmf.at(-1).digit} · ` : ''}
                          {ACTION_LABEL[c.selection]}
                        </Badge>
                      ) : (
                        <span className="text-ink-4">—</span>
                      )}
                    </td>
                    <td className="td">
                      <OutcomePill value={c.whatsapp?.status} />
                    </td>
                    <td className="td">
                      <OutcomePill value={c.transfer?.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={Radio} title="No live calls">
            Start a campaign or place a test call. Calls appear here instantly.
          </EmptyState>
        )}
      </Card>

      {recent.length > 0 && (
        <Card className="mt-4">
          <div className="border-b border-line px-4 py-2.5 text-[13px] font-medium">Just finished</div>
          <ul className="divide-y divide-line">
            {recent.map((c) => (
              <li key={`${c._id}-${c.status}`} className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-[13px] hover:bg-panel/70" onClick={() => setOpenCall(c._id)}>
                <span className="truncate">
                  {c.name || 'Unknown'} <span className="text-ink-3">{c.phoneMasked || c.phone}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-ink-3">{fmtDuration(c.duration)}</span>
                  <StatusPill status={c.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <TestCallModal open={testOpen} onClose={() => setTestOpen(false)} />
      <CallDrawer callId={openCall} onClose={() => setOpenCall(null)} />
    </div>
  );
}
