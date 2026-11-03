'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Users, PhoneCall, CheckCircle2, XCircle, Clock, MessageCircle, PhoneForwarded, Timer, ArrowRight } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useSocketEvent } from '@/lib/socket';
import { Card, CardHeader, Delta, Progress, Spinner, ErrorNote, Badge, EmptyState } from '@/components/ui';
import { DateRangePicker, useDateRange } from '@/components/DateRange';
import { DailyCallsChart, BarList } from '@/components/charts';
import { CallsTable } from '@/components/CallsTable';
import { CallDrawer } from '@/components/CallDrawer';
import { fmtNumber, fmtDuration, delta, STATUS_LABEL } from '@/lib/format';

function Metric({ icon: Icon, label, value, change, sub = 'vs previous period' }) {
  return (
    <div className="min-w-0 flex-1 px-4 py-3">
      <p className="text-[12px] text-ink-3">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Icon className="h-4 w-4 text-ink-3" />
        <span className="text-[20px] font-semibold tabular-nums tracking-tight">{value}</span>
        {change !== undefined && <Delta value={change} />}
      </div>
      <p className="mt-1.5 text-2xs text-ink-4">{sub}</p>
    </div>
  );
}

function MetricGroup({ title, children }) {
  return (
    <Card>
      <div className="border-b border-line px-4 py-2.5 text-[13px] font-medium">{title}</div>
      <div className="flex divide-x divide-line">{children}</div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const dr = useDateRange('7d');
  const { data, error, loading, reloadSoon } = useApi('/analytics/dashboard', dr.range);
  const [openCall, setOpenCall] = useState(null);

  // Refresh aggregates when calls change state or campaigns progress.
  useSocketEvent('campaign:update', () => reloadSoon());
  useSocketEvent('call:update', () => reloadSoon());

  const c = data?.cards;
  const p = data?.previous;
  const liveTotal = data?.live?.reduce((s, x) => s + x.n, 0) || 0;
  const answered = c ? c.total - c.failed : 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold tracking-tight">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-[13px] text-ink-3">Monitor your AI calling campaigns, keypad responses, WhatsApp links and support transfers.</p>
      </div>
      <div className="mb-4">
        <DateRangePicker {...dr} />
      </div>
      <ErrorNote error={error} />

      {!data && loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : c ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricGroup title="Contacts">
              <Metric icon={Users} label="Total contacts" value={fmtNumber(c.totalContacts)} change={delta(c.totalContacts, p.totalContacts)} />
              <Metric icon={Clock} label="Pending calls" value={fmtNumber(c.pendingCalls)} sub="in active campaigns" />
            </MetricGroup>
            <MetricGroup title="Calls">
              <Metric icon={PhoneCall} label="Total calls" value={fmtNumber(c.total)} change={delta(c.total, p.total)} />
              <Metric icon={Timer} label="Avg duration" value={fmtDuration(c.avgDuration)} change={c.avgDuration && p.avgDuration ? delta(c.avgDuration, p.avgDuration) : undefined} />
            </MetricGroup>
            <MetricGroup title="Results">
              <Metric icon={CheckCircle2} label="Successful" value={fmtNumber(c.successful)} change={delta(c.successful, p.successful)} />
              <Metric icon={XCircle} label="Failed" value={fmtNumber(c.failed)} change={delta(c.failed, p.failed)} />
            </MetricGroup>
            <MetricGroup title="Actions">
              <Metric icon={MessageCircle} label="WhatsApp sent" value={fmtNumber(c.whatsappSent)} change={delta(c.whatsappSent, p.whatsappSent)} />
              <Metric icon={PhoneForwarded} label="Transfers" value={fmtNumber(c.transfers)} change={delta(c.transfers, p.transfers)} />
            </MetricGroup>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Daily calling activity" subtitle="Calls placed per day (IST)" />
              <div className="px-2 pb-3 pt-2">
                {data.series.length ? <DailyCallsChart data={data.series} /> : <EmptyState title="No calls in this range" />}
              </div>
            </Card>
            <Card>
              <CardHeader title="Call outcomes" subtitle={c.total ? `${Math.round((answered / c.total) * 100)}% answered or in progress` : 'Success vs failure'} />
              <div className="px-4 pb-4 pt-3">
                <BarList items={data.outcomes.map((o) => ({ label: STATUS_LABEL[o._id] || o._id, value: o.n }))} />
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <Card>
              <CardHeader
                title="Live calling status"
                subtitle={`${liveTotal} call${liveTotal === 1 ? '' : 's'} in progress`}
                action={
                  <Link href="/live" className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:underline">
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              <div className="px-4 pb-4 pt-3">
                {liveTotal ? (
                  <div className="flex flex-wrap gap-2">
                    {data.live.map((l) => (
                      <Badge key={l._id} tone="violet">
                        {STATUS_LABEL[l._id]} · {l.n}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-ink-3">No calls are active right now.</p>
                )}
              </div>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader
                title="Active campaigns"
                action={
                  <Link href="/campaigns" className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:underline">
                    All campaigns <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              <div className="px-4 pb-4 pt-2">
                {data.campaigns.length ? (
                  <ul className="divide-y divide-line">
                    {data.campaigns.map((cmp) => {
                      const done = cmp.stats.total - cmp.stats.pending - cmp.stats.inProgress;
                      const pct = cmp.stats.total ? (done / cmp.stats.total) * 100 : 0;
                      return (
                        <li key={cmp._id} className="py-2.5">
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                            <Link href={`/campaigns/${cmp._id}`} className="truncate font-medium hover:underline">
                              {cmp.name}
                            </Link>
                            <span className="flex shrink-0 items-center gap-2 text-[12px] text-ink-3">
                              {done}/{cmp.stats.total}
                              <Badge tone={cmp.status === 'running' ? 'green' : 'gray'}>{cmp.status}</Badge>
                            </span>
                          </div>
                          <Progress value={pct} />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="py-2 text-[12px] text-ink-3">No campaigns are running. Upload an Excel file to start one.</p>
                )}
              </div>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader
              title="Recent call activity"
              action={
                <Link href="/calls" className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:underline">
                  Call history <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <div className="mt-2">
              <CallsTable calls={data.recent} onOpen={setOpenCall} compact />
            </div>
          </Card>
        </>
      ) : null}
      <CallDrawer callId={openCall} onClose={() => setOpenCall(null)} />
    </div>
  );
}
