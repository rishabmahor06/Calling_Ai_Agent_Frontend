'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Copy, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { Button, Card, CardHeader, Field, Input, Select, Toggle, PageHeader, Spinner, ErrorNote, Table, Badge, Modal, useToast } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';

function Status({ ok, label, hint }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 text-red-500" />}
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[12px] text-ink-3">{ok ? 'Configured' : hint}</p>
      </div>
    </div>
  );
}

function CopyRow({ label, value }) {
  const toast = useToast();
  return (
    <div className="py-2">
      <p className="mb-1 text-[12px] font-medium text-ink-2">{label}</p>
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
    </div>
  );
}

function Users() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, reload } = useApi('/settings/users');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [error, setError] = useState(null);

  const create = async () => {
    setError(null);
    try {
      await api('/settings/users', { method: 'POST', body: form });
      setOpen(false);
      setForm({ name: '', email: '', password: '', role: 'viewer' });
      reload();
      toast('User created');
    } catch (e) {
      setError(e);
    }
  };
  const patch = async (id, body) => {
    try {
      await api(`/settings/users/${id}`, { method: 'PATCH', body });
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Users" subtitle="Viewers see masked phone numbers and cannot change settings" action={<Button size="sm" icon={UserPlus} onClick={() => setOpen(true)}>Add user</Button>} />
      <div className="mt-2">
        <Table>
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Last login</th>
              <th className="th">Active</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((u) => (
              <tr key={u._id}>
                <td className="td font-medium text-ink">{u.name}</td>
                <td className="td">{u.email}</td>
                <td className="td">
                  <select className="input h-8 w-28 text-[12px]" value={u.role} disabled={u._id === user._id} onChange={(e) => patch(u._id, { role: e.target.value })} aria-label="Role">
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="td">{fmtDateTime(u.lastLoginAt)}</td>
                <td className="td">
                  <Toggle checked={u.isActive} disabled={u._id === user._id} onChange={(v) => patch(u._id, { isActive: v })} ariaLabel={`Active: ${u.email}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add user"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={create}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ErrorNote error={error} />
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password" hint="At least 10 characters">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </Card>
  );
}

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data, error } = useApi('/settings/system');
  const [compliance, setCompliance] = useState(null);
  useEffect(() => {
    if (data) setCompliance(data.compliance);
  }, [data]);

  const saveCompliance = async (next) => {
    setCompliance(next);
    try {
      await api('/settings/compliance', { method: 'PUT', body: next });
      toast('Compliance settings saved');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (error) return <ErrorNote error={error} />;
  if (!data || !compliance) return <Spinner />;
  const i = data.integrations;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Settings" subtitle="Integrations, Exotel call-flow wiring, compliance and team access." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Integrations" subtitle="Secrets live in the backend .env — never in the browser" />
          <div className="divide-y divide-line px-4 pb-2">
            {data.provider === 'twilio' ? (
              <Status ok={i.twilio} label={`Twilio calling${data.twilio.phoneNumber ? ` (${data.twilio.phoneNumber})` : ''}`} hint="Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER" />
            ) : (
              <Status ok={i.exotel} label="Exotel calling" hint="Set EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID, EXOTEL_CALLER_ID, EXOTEL_FLOW_ID" />
            )}
            <Status ok={i.gemini} label={`Gemini Live (${data.models.live})`} hint="Set GEMINI_API_KEY" />
            <Status ok={i.whatsapp} label="WhatsApp Business" hint="Configure on the WhatsApp settings page" />
            <Status ok={i.publicUrl} label="Public HTTPS URL" hint="PUBLIC_BASE_URL must be https:// so Exotel and Meta can reach the webhooks" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Compliance (TRAI / DLT)" />
          <div className="space-y-4 p-4">
            <Toggle checked={compliance.respectDnd} disabled={!isAdmin} onChange={(v) => saveCompliance({ ...compliance, respectDnd: v })} label="Check DND registry before every call (Exotel number lookup)" />
            <Toggle checked={compliance.requireConsent} disabled={!isAdmin} onChange={(v) => saveCompliance({ ...compliance, requireConsent: v })} label="Only call contacts with recorded consent" />
            <ul className="list-disc space-y-1 pl-5 text-[12px] text-ink-3">
              <li>Campaign windows are restricted to 09:00–21:00 IST.</li>
              <li>Keypad 0 (configurable) and the agent&apos;s opt_out tool permanently stop calls to a number.</li>
              <li>Register your ExoPhone header and content templates on the DLT platform for promotional traffic.</li>
            </ul>
          </div>
        </Card>

        {data.provider === 'twilio' && (
          <Card className="lg:col-span-2 p-4 text-[13px] text-ink-2">
            <p className="font-medium text-ink">Calling via Twilio</p>
            <p className="mt-1 text-[12px] text-ink-3">
              No console setup needed: each call carries its own TwiML (media stream, transfer and status webhooks under PUBLIC_BASE_URL). DND lookup is Exotel-only, so with Twilio
              only consent and opt-out are enforced. Set CALL_PROVIDER=exotel to switch back.
            </p>
          </Card>
        )}

        {isAdmin && data.flowUrls && data.provider !== 'twilio' && (
          <Card className="lg:col-span-2">
            <CardHeader title="Exotel call flow wiring" subtitle={`Build this flow in Exotel App Bazaar, then put its id in EXOTEL_FLOW_ID (current: ${data.exotel.flowId || 'not set'})`} />
            <div className="grid gap-x-6 px-4 pb-4 lg:grid-cols-2">
              <div className="min-w-0 py-2 text-[13px] text-ink-2">
                <ol className="list-decimal space-y-1.5 pl-5">
                  <li>
                    <b>Voicebot</b> applet → URL below (bidirectional stream, {data.exotel.sampleRate} Hz).
                  </li>
                  <li>
                    <b>Passthru</b> (after bot) → 200 OK goes to Connect, otherwise to Hangup.
                  </li>
                  <li>
                    <b>Connect</b> → “Dial whom: URL”. Both outcomes → Passthru (transfer result).
                  </li>
                  <li>
                    If nobody answers → <b>Greeting</b> (“Our executive will call you back”) → Hangup.
                  </li>
                  <li>
                    Status callback is passed automatically on every API call.
                  </li>
                </ol>
                <p className="mt-3 text-[12px] text-ink-3">These URLs contain your webhook secret. Do not share them.</p>
              </div>
              <div className="min-w-0">
                <CopyRow label="1 · Voicebot WSS URL" value={data.flowUrls.voicebot} />
                <CopyRow label="2 · Passthru (after bot)" value={data.flowUrls.passthruAfterBot} />
                <CopyRow label="3 · Connect — dial whom URL" value={data.flowUrls.connect} />
                <CopyRow label="4 · Passthru (transfer result)" value={data.flowUrls.transferResult} />
              </div>
            </div>
          </Card>
        )}

        {isAdmin && <Users />}

        <Card className="lg:col-span-2 p-4 text-[12px] text-ink-3">
          Caller ID {data.exotel.callerId || '—'} · Exotel cluster {data.exotel.subdomain} · Summary model {data.models.text} · Warm Gemini sessions:{' '}
          <Badge>{data.warmSessions}</Badge>
        </Card>
      </div>
    </div>
  );
}
