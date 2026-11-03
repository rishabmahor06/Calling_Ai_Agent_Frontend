'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useSocketEvent } from '@/lib/socket';
import { Card, CardHeader, Progress, Table, Pagination, Spinner, ErrorNote, Badge, OutcomePill, StatusPill, EmptyState } from '@/components/ui';
import { CampaignControls, CampaignStatus, campaignProgress } from '@/components/CampaignControls';
import { CallDrawer } from '@/components/CallDrawer';
import { fmtDateTime, fmtDuration } from '@/lib/format';

const QUEUE_TONE = { pending: 'gray', dialing: 'blue', completed: 'green', failed: 'red', no_answer: 'amber', skipped: 'gray' };
const FILTERS = ['', 'pending', 'dialing', 'completed', 'no_answer', 'failed', 'skipped'];

export default function CampaignDetailPage({ params }) {
  const { id } = use(params);
  const { isAdmin } = useAuth();
  const { data: campaign, error, mutate } = useApi(`/campaigns/${id}`);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const queue = useApi(`/campaigns/${id}/contacts`, { status, page, limit: 25 });
  const [openCall, setOpenCall] = useState(null);

  useSocketEvent('campaign:update', (u) => {
    if (u._id !== id) return;
    mutate((c) => c && { ...c, status: u.status ?? c.status, stats: u.stats ?? c.stats });
    queue.reloadSoon();
  });

  if (error) return <ErrorNote error={error} />;
  if (!campaign) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  const s = campaign.stats;
  const { done, pct } = campaignProgress(s);
  const tiles = [
    ['Total', s.total],
    ['Pending', s.pending],
    ['On call', s.inProgress],
    ['Completed', s.completed],
    ['No answer', s.noAnswer],
    ['Failed', s.failed],
    ['Skipped (DND / opt-out)', s.skipped],
    ['WhatsApp sent', s.whatsappSent],
    ['Transfers', s.transfers],
  ];

  return (
    <div className="mx-auto max-w-[1300px]">
      <Link href="/campaigns" className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
      </Link>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold tracking-tight">{campaign.name}</h1>
            <CampaignStatus status={campaign.status} />
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            Window {campaign.schedule.windowStart}–{campaign.schedule.windowEnd} IST · {campaign.settings.maxConcurrent} concurrent · {campaign.settings.maxRetries} retries ·{' '}
            {campaign.settings.callDelaySec}s between calls
          </p>
        </div>
        {isAdmin && <CampaignControls campaign={campaign} onChange={(c) => mutate((x) => ({ ...x, ...c }))} size="md" />}
      </div>

      <Card className="mb-4 p-4">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="font-medium">Progress</span>
          <span className="tabular-nums text-ink-3">
            {done} of {s.total} contacts processed ({Math.round(pct)}%)
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          {tiles.map(([label, n]) => (
            <div key={label} className="rounded-lg bg-panel px-3 py-2">
              <p className="truncate text-2xs text-ink-3">{label}</p>
              <p className="text-[16px] font-semibold tabular-nums">{n}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Calling queue"
          subtitle="Contacts are dialed in this order"
          action={
            <select
              className="input h-8 w-auto pr-8 text-[12px]"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter queue"
            >
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f ? f.replace('_', ' ') : 'All statuses'}
                </option>
              ))}
            </select>
          }
        />
        <div className="mt-2">
          {queue.data?.items?.length ? (
            <Table>
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">Name</th>
                  <th className="th">Phone</th>
                  <th className="th">Queue status</th>
                  <th className="th">Attempts</th>
                  <th className="th">Last call</th>
                  <th className="th">Duration</th>
                  <th className="th">WhatsApp</th>
                  <th className="th">Transfer</th>
                  <th className="th">Next attempt</th>
                </tr>
              </thead>
              <tbody>
                {queue.data.items.map((r) => (
                  <tr key={r._id} className={r.lastCall ? 'cursor-pointer hover:bg-panel/70' : ''} onClick={() => r.lastCall && setOpenCall(r.lastCall._id)}>
                    <td className="td text-ink-4">{r.order + 1}</td>
                    <td className="td font-medium text-ink">{r.name || '—'}</td>
                    <td className="td tabular-nums">{r.phone}</td>
                    <td className="td">
                      <Badge tone={QUEUE_TONE[r.status]}>{r.status.replace('_', ' ')}</Badge>
                      {r.skipReason && <span className="ml-1 text-2xs text-ink-3">{r.skipReason.replace('_', ' ')}</span>}
                    </td>
                    <td className="td tabular-nums">{r.attempts}</td>
                    <td className="td">{r.lastCall ? <StatusPill status={r.lastCall.status} /> : '—'}</td>
                    <td className="td tabular-nums">{fmtDuration(r.lastCall?.duration)}</td>
                    <td className="td">
                      <OutcomePill value={r.lastCall?.whatsapp?.status} />
                    </td>
                    <td className="td">
                      <OutcomePill value={r.lastCall?.transfer?.status} />
                    </td>
                    <td className="td">{r.status === 'pending' && r.attempts > 0 ? fmtDateTime(r.nextAttemptAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : queue.loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <EmptyState title="No contacts in this view" />
          )}
          <Pagination page={page} limit={25} total={queue.data?.total || 0} onPage={setPage} />
        </div>
      </Card>
      <CallDrawer callId={openCall} onClose={() => setOpenCall(null)} />
    </div>
  );
}
