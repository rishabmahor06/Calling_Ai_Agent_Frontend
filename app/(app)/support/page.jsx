'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, PhoneForwarded, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { Button, Card, CardHeader, Field, Input, Textarea, Toggle, PageHeader, Spinner, ErrorNote, Table, Badge, Modal, EmptyState, useToast } from '@/components/ui';

const EMPTY = { name: '', phone: '', priority: 1, isActive: true, isFallback: false, notes: '' };

function ExecModal({ exec, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(exec?._id ? { ...EMPTY, ...exec } : EMPTY), [exec]);
  if (!exec) return null;
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { name: form.name, phone: form.phone, priority: Number(form.priority), isActive: form.isActive, isFallback: form.isFallback, notes: form.notes || undefined };
      await api(exec._id ? `/settings/support/${exec._id}` : '/settings/support', { method: exec._id ? 'PUT' : 'POST', body });
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={exec._id ? 'Edit support number' : 'Add support number'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ErrorNote error={error} />
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Support desk – Delhi" />
        </Field>
        <Field label="Landline or mobile" hint="e.g. +91-11-41815099 or 98765 43210">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Priority" hint="Lower numbers are dialed first">
          <Input type="number" min={1} max={999} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-5">
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Active" />
          <Toggle checked={form.isFallback} onChange={(v) => setForm({ ...form, isFallback: v })} label="Fallback (dialed last)" />
        </div>
        <Field label="Notes">
          <Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function TransferSettings({ settings, isAdmin }) {
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api('/settings/support-settings', {
        method: 'PUT',
        body: { ...form, ringTimeoutSec: Number(form.ringTimeoutSec), maxTransferSec: Number(form.maxTransferSec) },
      });
      toast('Transfer settings saved');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader title="Transfer behaviour" subtitle="Sent to Exotel's Connect applet when a customer presses 9" />
      <fieldset disabled={!isAdmin} className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ring each number for (sec)">
            <Input type="number" min={10} max={60} value={form.ringTimeoutSec} onChange={(e) => setForm({ ...form, ringTimeoutSec: e.target.value })} />
          </Field>
          <Field label="Max transfer length (sec)">
            <Input type="number" min={60} max={4500} value={form.maxTransferSec} onChange={(e) => setForm({ ...form, maxTransferSec: e.target.value })} />
          </Field>
        </div>
        <Field label="Whisper to executive" hint="Played to the executive before the customer is connected">
          <Input value={form.calleeWhisper} onChange={(e) => setForm({ ...form, calleeWhisper: e.target.value })} />
        </Field>
        <Toggle checked={form.recordTransfers} onChange={(v) => setForm({ ...form, recordTransfers: v })} label="Record transferred calls (inform callers; check local law)" />
        <Button variant="primary" icon={Save} loading={busy} onClick={save}>
          Save
        </Button>
      </fieldset>
    </Card>
  );
}

export default function SupportPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data, error, reload } = useApi('/settings/support');
  const [editing, setEditing] = useState(null);

  const remove = async (e) => {
    if (!window.confirm(`Remove ${e.name}?`)) return;
    try {
      await api(`/settings/support/${e._id}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Support executives"
        subtitle="When a customer presses 9, the same call is bridged to these numbers in order. If the first doesn't answer, the next (fallback) is tried."
        actions={isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>Add number</Button>}
      />
      <ErrorNote error={error} />
      {!data ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader title="Dial order" />
            <div className="mt-2">
              {data.items.length ? (
                <Table>
                  <thead>
                    <tr>
                      <th className="th">#</th>
                      <th className="th">Name</th>
                      <th className="th">Number</th>
                      <th className="th">Status</th>
                      {isAdmin && <th className="th" />}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((e, i) => (
                      <tr key={e._id}>
                        <td className="td text-ink-4">{i + 1}</td>
                        <td className="td font-medium text-ink">{e.name}</td>
                        <td className="td tabular-nums">{e.phone}</td>
                        <td className="td">
                          <div className="flex gap-1">
                            <Badge tone={e.isActive ? 'green' : 'gray'}>{e.isActive ? 'Active' : 'Inactive'}</Badge>
                            {e.isFallback && <Badge tone="amber">Fallback</Badge>}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="td">
                            <div className="flex justify-end gap-1">
                              <button className="rounded p-1 text-ink-3 hover:bg-panel hover:text-ink" onClick={() => setEditing(e)} aria-label="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button className="rounded p-1 text-ink-3 hover:bg-panel hover:text-red-600" onClick={() => remove(e)} aria-label="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <EmptyState icon={PhoneForwarded} title="No support numbers">
                  Without an active number, pressing 9 registers a callback request instead of transferring.
                </EmptyState>
              )}
            </div>
          </Card>
          <div className="lg:col-span-2">
            <TransferSettings settings={data.settings} isAdmin={isAdmin} />
          </div>
        </div>
      )}
      <ExecModal
        exec={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
          toast('Saved');
        }}
      />
    </div>
  );
}
