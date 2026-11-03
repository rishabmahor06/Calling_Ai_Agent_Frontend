'use client';
import { useEffect, useState } from 'react';
import { Save, Send, RotateCw, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { useSocketEvent } from '@/lib/socket';
import { Button, Card, CardHeader, Field, Input, Select, Textarea, Toggle, PageHeader, Spinner, ErrorNote, Table, Pagination, OutcomePill, Badge, EmptyState, useToast } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';

function Copyable({ value }) {
  const toast = useToast();
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-panel px-2 py-1.5 text-[12px]">{value}</code>
      <Button
        size="sm"
        icon={Copy}
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast('Copied');
        }}
      >
        Copy
      </Button>
    </div>
  );
}

function SettingsForm() {
  const toast = useToast();
  const { data, error } = useApi('/settings/whatsapp');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [test, setTest] = useState({ phone: '', busy: false });

  useEffect(() => {
    if (data) setForm({ ...data, accessToken: '' });
  }, [data]);
  if (error) return <ErrorNote error={error} />;
  if (!form) return <Spinner />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { webhookUrl, verifyTokenConfigured, appSecretConfigured, accessTokenSource, accessToken, ...rest } = form;
      const r = await api('/settings/whatsapp', { method: 'PUT', body: { ...rest, maxRetries: Number(rest.maxRetries), ...(accessToken ? { accessToken } : {}) } });
      setForm({ ...r, accessToken: '' });
      toast('WhatsApp settings saved');
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
  };
  const sendTest = async () => {
    setTest((t) => ({ ...t, busy: true }));
    try {
      const r = await api('/settings/whatsapp/test', { method: 'POST', body: { phone: test.phone } });
      toast(r.status === 'sent' ? 'Test message accepted by WhatsApp' : `Failed: ${r.error?.message}`, r.status === 'sent' ? 'success' : 'error');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setTest((t) => ({ ...t, busy: false }));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="WhatsApp Business Cloud API" subtitle="Credentials from Meta for Developers → WhatsApp → API setup" action={<Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Enabled" />} />
        <div className="space-y-4 p-4">
          <ErrorNote error={saveError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone Number ID">
              <Input value={form.phoneNumberId} onChange={set('phoneNumberId')} inputMode="numeric" />
            </Field>
            <Field label="WhatsApp Business Account ID">
              <Input value={form.wabaId} onChange={set('wabaId')} inputMode="numeric" />
            </Field>
          </div>
          <Field
            label="Access token"
            hint={form.accessTokenSource === 'missing' ? 'Not configured' : `Current: ${data.accessToken} (from ${form.accessTokenSource}). Stored encrypted; never shown in full.`}
          >
            <Input type="password" autoComplete="off" value={form.accessToken} placeholder="Paste a new permanent token to replace" onChange={set('accessToken')} />
          </Field>
          <div className="space-y-2">
            <span className="label">Webhook (delivery status)</span>
            <Copyable value={form.webhookUrl} />
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={form.verifyTokenConfigured ? 'green' : 'red'}>Verify token {form.verifyTokenConfigured ? 'set' : 'missing'}</Badge>
              <Badge tone={form.appSecretConfigured ? 'green' : 'red'}>App secret {form.appSecretConfigured ? 'set' : 'missing'}</Badge>
            </div>
            <p className="text-[12px] text-ink-3">Set WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET in the backend .env. Subscribe the webhook to the “messages” field.</p>
          </div>
          <Button variant="primary" icon={Save} loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Message" subtitle="Business-initiated messages need an approved template" />
        <div className="space-y-4 p-4">
          <Field label="Message type">
            <Select value={form.mode} onChange={set('mode')}>
              <option value="template">Approved template (recommended)</option>
              <option value="text">Free-form text (only within 24h of customer message)</option>
            </Select>
          </Field>
          {form.mode === 'template' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Template name">
                  <Input value={form.templateName} onChange={set('templateName')} />
                </Field>
                <Field label="Template language">
                  <Input value={form.templateLanguage} onChange={set('templateLanguage')} placeholder="en / hi / en_US" />
                </Field>
              </div>
              <Field label="Body variables, in order" hint="Tokens: {{name}}, {{website}}, {{company}} — one per line, matching {{1}}, {{2}} … in the template">
                <Textarea rows={3} value={form.templateBodyParams.join('\n')} onChange={(e) => setForm({ ...form, templateBodyParams: e.target.value.split('\n').filter((l) => l.trim()) })} />
              </Field>
            </>
          ) : (
            <Field label="Message text" hint="Tokens: {{name}}, {{website}}, {{company}}">
              <Textarea rows={6} value={form.textMessage} onChange={set('textMessage')} />
            </Field>
          )}
          <Field label="Automatic retries for failed sends">
            <Input type="number" min={0} max={10} value={form.maxRetries} onChange={set('maxRetries')} />
          </Field>
          <div className="rounded-lg bg-panel p-3">
            <span className="label">Send a test to</span>
            <div className="flex gap-2">
              <Input value={test.phone} onChange={(e) => setTest({ ...test, phone: e.target.value })} placeholder="98765 43210" />
              <Button icon={Send} loading={test.busy} disabled={!test.phone} onClick={sendTest}>
                Send
              </Button>
            </div>
            <p className="mt-1 text-[12px] text-ink-3">Uses the saved settings and the website URL from AI agent settings.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MessagesLog({ isAdmin }) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, reloadSoon, reload } = useApi('/settings/whatsapp/messages', { status, page });
  useSocketEvent('whatsapp:update', () => reloadSoon(800));
  const retry = async (id) => {
    try {
      const r = await api(`/settings/whatsapp/messages/${id}/retry`, { method: 'POST' });
      toast(r.status === 'sent' ? 'Resent' : `Still failing: ${r.error?.message}`, r.status === 'sent' ? 'success' : 'error');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <Card className="mt-4">
      <CardHeader
        title="Delivery log"
        action={
          <select className="input h-8 w-auto pr-8 text-[12px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter status">
            <option value="">All</option>
            {['queued', 'sent', 'delivered', 'read', 'failed'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        }
      />
      <div className="mt-2">
        {data?.items?.length ? (
          <Table>
            <thead>
              <tr>
                <th className="th">Sent at</th>
                <th className="th">Phone</th>
                <th className="th">Type</th>
                <th className="th">Status</th>
                <th className="th">Attempts</th>
                <th className="th">Error</th>
                {isAdmin && <th className="th" />}
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m._id}>
                  <td className="td">{fmtDateTime(m.createdAt)}</td>
                  <td className="td tabular-nums">{m.phone}</td>
                  <td className="td">{m.kind === 'template' ? `Template · ${m.templateName}` : 'Text'}</td>
                  <td className="td">
                    <OutcomePill value={m.status} />
                  </td>
                  <td className="td tabular-nums">{m.attempts}</td>
                  <td className="td max-w-[280px] truncate text-red-600" title={m.error?.message}>
                    {m.error?.message || ''}
                  </td>
                  {isAdmin && (
                    <td className="td">
                      {m.status === 'failed' && (
                        <Button size="sm" icon={RotateCw} onClick={() => retry(m._id)}>
                          Retry
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No WhatsApp messages yet">Messages appear when a customer presses 1 during a call.</EmptyState>
        )}
        <Pagination page={page} limit={25} total={data?.total || 0} onPage={setPage} />
      </div>
    </Card>
  );
}

export default function WhatsAppPage() {
  const { isAdmin } = useAuth();
  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="WhatsApp settings" subtitle="When a customer presses 1, the website link is sent to the same number on WhatsApp." />
      {isAdmin ? <SettingsForm /> : <p className="text-[13px] text-ink-3">Only admins can view WhatsApp credentials.</p>}
      <MessagesLog isAdmin={isAdmin} />
    </div>
  );
}
