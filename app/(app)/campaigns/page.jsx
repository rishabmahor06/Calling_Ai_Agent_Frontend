'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Megaphone } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useSocketEvent } from '@/lib/socket';
import { Button, Card, Field, Input, Select, Textarea, Modal, PageHeader, Progress, Table, EmptyState, ErrorNote, Spinner, useToast } from '@/components/ui';
import { CampaignControls, CampaignStatus, campaignProgress } from '@/components/CampaignControls';
import { fmtDate } from '@/lib/format';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function NewCampaignModal({ open, onClose, initialBatch, onCreated }) {
  const toast = useToast();
  const { data: batches } = useApi(open ? '/contacts/batches' : null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      name: '',
      description: '',
      sourceType: initialBatch ? 'batch' : 'all',
      batchId: initialBatch || '',
      startAt: '',
      windowStart: '10:00',
      windowEnd: '19:00',
      days: [1, 2, 3, 4, 5, 6],
      maxConcurrent: 1,
      maxRetries: 1,
      retryDelayMin: 15,
      callDelaySec: 3,
      ringTimeoutSec: 40,
      startNow: true,
    });
  }, [open, initialBatch]);

  useEffect(() => {
    if (form && form.sourceType === 'batch' && !form.batchId && batches?.items?.[0]) setForm((f) => ({ ...f, batchId: batches.items[0]._id }));
  }, [batches, form]);

  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const c = await api('/campaigns', {
        method: 'POST',
        body: {
          name: form.name,
          description: form.description || undefined,
          source: form.sourceType === 'batch' ? { type: 'batch', batchIds: [form.batchId] } : { type: 'all' },
          schedule: {
            startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
            windowStart: form.windowStart,
            windowEnd: form.windowEnd,
            days: form.days,
          },
          settings: {
            maxConcurrent: form.maxConcurrent,
            maxRetries: form.maxRetries,
            retryDelaySec: form.retryDelayMin * 60,
            callDelaySec: form.callDelaySec,
            ringTimeoutSec: form.ringTimeoutSec,
          },
          startNow: form.startNow,
        },
      });
      toast(`Campaign created with ${c.stats.total} contacts`);
      onCreated(c);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="New bulk campaign"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} disabled={!form.name || (form.sourceType === 'batch' && !form.batchId)} onClick={submit}>
            {form.startNow ? 'Create & start' : 'Create as draft'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <ErrorNote error={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Campaign name">
            <Input value={form.name} onChange={set('name')} placeholder="e.g. Website launch – Delhi leads" autoFocus />
          </Field>
          <Field label="Contacts">
            <Select value={form.sourceType} onChange={set('sourceType')}>
              <option value="batch">From an Excel upload</option>
              <option value="all">All contacts (excluding opted-out)</option>
            </Select>
          </Field>
          {form.sourceType === 'batch' && (
            <Field label="Upload batch" className="sm:col-span-2">
              <Select value={form.batchId} onChange={set('batchId')}>
                {!batches?.items?.length && <option value="">No uploads yet</option>}
                {batches?.items?.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b._id} · {b.count} contacts
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Description (optional)" className="sm:col-span-2">
            <Textarea rows={2} value={form.description} onChange={set('description')} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold">Schedule</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Start at (optional)" hint="Leave empty to start immediately">
              <Input type="datetime-local" value={form.startAt} onChange={set('startAt')} />
            </Field>
            <Field label="Daily window start (IST)">
              <Input type="time" min="09:00" max="21:00" value={form.windowStart} onChange={set('windowStart')} />
            </Field>
            <Field label="Daily window end (IST)" hint="TRAI allows 09:00–21:00">
              <Input type="time" min="09:00" max="21:00" value={form.windowEnd} onChange={set('windowEnd')} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const on = form.days.includes(i + 1);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, days: on ? f.days.filter((x) => x !== i + 1) : [...f.days, i + 1].sort() }))}
                  className={`rounded-md border px-2.5 py-1 text-[12px] font-medium ${on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line-2 text-ink-3'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold">Dialing</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Max concurrent calls" hint="1 = strictly one by one">
              <Input type="number" min={1} max={20} value={form.maxConcurrent} onChange={set('maxConcurrent')} />
            </Field>
            <Field label="Delay between calls (sec)">
              <Input type="number" min={0} max={600} value={form.callDelaySec} onChange={set('callDelaySec')} />
            </Field>
            <Field label="Ring timeout (sec)">
              <Input type="number" min={15} max={60} value={form.ringTimeoutSec} onChange={set('ringTimeoutSec')} />
            </Field>
            <Field label="Retry attempts" hint="For no-answer / busy">
              <Input type="number" min={0} max={5} value={form.maxRetries} onChange={set('maxRetries')} />
            </Field>
            <Field label="Retry after (minutes)">
              <Input type="number" min={1} max={1440} value={form.retryDelayMin} onChange={set('retryDelayMin')} />
            </Field>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={form.startNow} onChange={set('startNow')} />
          Start dialing as soon as it is created
        </label>
      </div>
    </Modal>
  );
}

function CampaignsContent() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { data, error, loading, mutate, reloadSoon } = useApi('/campaigns');
  const [modal, setModal] = useState(params.get('new') === '1');

  useSocketEvent('campaign:update', (u) =>
    mutate((d) => (d ? { ...d, items: d.items.map((c) => (c._id === u._id ? { ...c, status: u.status ?? c.status, stats: u.stats ?? c.stats } : c)) } : d)),
  );
  const replace = (c) => mutate((d) => ({ ...d, items: d.items.map((x) => (x._id === c._id ? c : x)) }));

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Bulk campaigns"
        subtitle="Each campaign calls its contacts one by one and waits for every call to finish before dialing the next."
        actions={isAdmin && <Button variant="primary" icon={Plus} onClick={() => setModal(true)}>New campaign</Button>}
      />
      <ErrorNote error={error} />
      <Card>
        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : data?.items?.length ? (
          <Table>
            <thead>
              <tr>
                <th className="th">Campaign</th>
                <th className="th">Status</th>
                <th className="th min-w-[180px]">Progress</th>
                <th className="th">Completed</th>
                <th className="th">No answer</th>
                <th className="th">WhatsApp</th>
                <th className="th">Transfers</th>
                <th className="th">Created</th>
                {isAdmin && <th className="th" />}
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => {
                const { done, pct } = campaignProgress(c.stats);
                return (
                  <tr key={c._id} className="cursor-pointer hover:bg-panel/70" onClick={() => router.push(`/campaigns/${c._id}`)}>
                    <td className="td">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-2xs text-ink-3">
                        {c.schedule.windowStart}–{c.schedule.windowEnd} IST · {c.settings.maxConcurrent} at a time
                      </p>
                    </td>
                    <td className="td">
                      <CampaignStatus status={c.status} />
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="w-28" />
                        <span className="tabular-nums text-[12px]">
                          {done}/{c.stats.total}
                        </span>
                      </div>
                    </td>
                    <td className="td tabular-nums">{c.stats.completed}</td>
                    <td className="td tabular-nums">{c.stats.noAnswer}</td>
                    <td className="td tabular-nums">{c.stats.whatsappSent}</td>
                    <td className="td tabular-nums">{c.stats.transfers}</td>
                    <td className="td">{fmtDate(c.createdAt)}</td>
                    {isAdmin && (
                      <td className="td">
                        <CampaignControls campaign={c} onChange={replace} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={Megaphone} title="No campaigns yet">
            Upload an Excel file with mobile numbers, then create a campaign from it.
          </EmptyState>
        )}
      </Card>
      <NewCampaignModal
        open={modal}
        initialBatch={params.get('batch')}
        onClose={() => {
          setModal(false);
          router.replace('/campaigns');
        }}
        onCreated={(c) => {
          setModal(false);
          reloadSoon(0);
          router.push(`/campaigns/${c._id}`);
        }}
      />
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense>
      <CampaignsContent />
    </Suspense>
  );
}
