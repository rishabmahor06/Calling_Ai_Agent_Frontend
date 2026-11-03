'use client';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { Plus, Trash2, Save, User, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { Button, Card, CardHeader, Field, Input, Select, Textarea, Toggle, PageHeader, Spinner, ErrorNote, useToast } from '@/components/ui';
import { ACTION_LABEL } from '@/lib/format';

const EDITABLE = [
  'agentName', 'companyName', 'language', 'voiceGender', 'voiceName', 'speakingSpeed', 'model', 'welcomeMessage', 'systemPrompt',
  'businessInfo', 'websiteUrl', 'transferMessage', 'allowQuestions', 'ivrOptions', 'callTimeoutSec', 'maxConversationSec', 'silenceTimeoutSec', 'maxSilencePrompts', 'vad',
];

function Section({ title, subtitle, children }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="space-y-4 p-4">{children}</div>
    </Card>
  );
}

export default function AgentSettingsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data, error } = useApi('/settings/agent');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (data) setForm(Object.fromEntries(EDITABLE.map((k) => [k, data.config[k]])));
  }, [data]);

  if (error) return <ErrorNote error={error} />;
  if (!form) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k) => (e) => set(k, Number(e.target.value));
  const voices = data.voices.filter((v) => v.gender === form.voiceGender);
  const setGender = (g) => setForm((f) => ({ ...f, voiceGender: g, voiceName: data.voices.find((v) => v.gender === g).name }));
  const setIvr = (i, patch) => set('ivrOptions', form.ivrOptions.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const usedDigits = new Set(form.ivrOptions.map((o) => o.digit));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api('/settings/agent', { method: 'PUT', body: form });
      toast('Agent settings saved — applies to the next call');
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="AI agent settings"
        subtitle="How the voice agent sounds, what it says, and what each keypad digit does."
        actions={isAdmin && <Button variant="primary" icon={Save} loading={saving} onClick={save}>Save changes</Button>}
      />
      <ErrorNote error={saveError} />
      <fieldset disabled={!isAdmin} className="mt-2 grid gap-4 lg:grid-cols-2">
        <Section title="Identity & voice">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Agent name">
              <Input value={form.agentName} onChange={(e) => set('agentName', e.target.value)} />
            </Field>
            <Field label="Company name">
              <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            </Field>
          </div>
          <div>
            <span className="label">Agent voice</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['female', 'Female', UserRound],
                ['male', 'Male', User],
              ].map(([g, label, Icon]) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] transition',
                    form.voiceGender === g ? 'border-brand-500 bg-brand-50 font-medium text-brand-700 ring-2 ring-brand-100' : 'border-line-2 text-ink-2 hover:bg-panel',
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Voice">
              <Select value={form.voiceName} onChange={(e) => set('voiceName', e.target.value)}>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} — {v.style}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Speaking speed" hint="Applied through the agent's instructions">
              <Select value={form.speakingSpeed} onChange={(e) => set('speakingSpeed', e.target.value)}>
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </Select>
            </Field>
            <Field label="Language">
              <Select value={form.language} onChange={(e) => set('language', e.target.value)}>
                <option value="hinglish">Hinglish (Hindi + English)</option>
                <option value="hi">Hindi</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field label="Live model" hint={`Empty = ${data.defaultModel}`}>
              <Input value={form.model} placeholder={data.defaultModel} onChange={(e) => set('model', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="What the agent says">
          <div className="rounded-lg bg-panel p-3">
            <Toggle checked={form.allowQuestions !== false} onChange={(v) => set('allowQuestions', v)} label="Customers can ask questions on the call" />
            <p className="mt-1.5 text-[12px] text-ink-3">
              Answers come from Business information below and the{' '}
              <Link href="/knowledge" className="font-medium text-brand-600 hover:underline">
                Knowledge base
              </Link>
              . Unknown answers → the agent offers a support executive.
            </p>
          </div>
          <Field label="Welcome message" hint="Spoken as soon as the customer answers">
            <Textarea rows={4} value={form.welcomeMessage} onChange={(e) => set('welcomeMessage', e.target.value)} />
          </Field>
          <Field label="Transfer message" hint="Spoken before connecting to a support executive">
            <Textarea rows={2} value={form.transferMessage} onChange={(e) => set('transferMessage', e.target.value)} />
          </Field>
          <Field label="Website URL" hint="Sent on WhatsApp when the customer presses 1">
            <Input type="url" value={form.websiteUrl} placeholder="https://yourwebsite.com" onChange={(e) => set('websiteUrl', e.target.value)} />
          </Field>
        </Section>

        <Section title="Keypad (IVR) options" subtitle="Each digit maps to a deterministic action — no AI reasoning involved.">
          <div className="space-y-2">
            {form.ivrOptions.map((o, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2 sm:flex-nowrap">
                <Select className="h-8 w-[72px] pl-3 pr-7 font-semibold" value={o.digit} onChange={(e) => setIvr(i, { digit: e.target.value })} aria-label="Digit">
                  {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'].map((d) => (
                    <option key={d} value={d} disabled={d !== o.digit && usedDigits.has(d)}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Select className="h-8 flex-1" value={o.action} onChange={(e) => setIvr(i, { action: e.target.value })} aria-label="Action">
                  {data.actions.map((a) => (
                    <option key={a} value={a}>
                      {ACTION_LABEL[a]}
                    </option>
                  ))}
                </Select>
                <Toggle checked={o.enabled} onChange={(v) => setIvr(i, { enabled: v })} />
                <button type="button" className="rounded p-1.5 text-ink-3 hover:bg-panel hover:text-red-600" onClick={() => set('ivrOptions', form.ivrOptions.filter((_, j) => j !== i))} aria-label="Remove option">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            icon={Plus}
            disabled={usedDigits.size >= 12}
            onClick={() => {
              const free = ['2', '3', '4', '5', '6', '7', '8', '#', '0', '1', '9', '*'].find((d) => !usedDigits.has(d));
              set('ivrOptions', [...form.ivrOptions, { digit: free, action: 'repeat', enabled: true }]);
            }}
          >
            Add option
          </Button>
        </Section>

        <Section title="Timing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ring timeout (sec)">
              <Input type="number" min={15} max={60} value={form.callTimeoutSec} onChange={num('callTimeoutSec')} />
            </Field>
            <Field label="Max conversation (sec)">
              <Input type="number" min={30} max={3000} value={form.maxConversationSec} onChange={num('maxConversationSec')} />
            </Field>
            <Field label="Silence timeout (sec)" hint="Agent re-prompts after this much silence">
              <Input type="number" min={3} max={60} value={form.silenceTimeoutSec} onChange={num('silenceTimeoutSec')} />
            </Field>
            <Field label="Silence re-prompts before hanging up">
              <Input type="number" min={0} max={5} value={form.maxSilencePrompts} onChange={num('maxSilencePrompts')} />
            </Field>
          </div>
          <div className="rounded-lg bg-panel p-3">
            <p className="mb-3 text-[12px] font-medium text-ink-2">Turn detection (Gemini VAD) — lower silence = faster replies, but may cut off slow speakers</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="End-of-speech silence (ms)">
                <Input type="number" min={100} max={2000} step={50} value={form.vad.silenceDurationMs} onChange={(e) => set('vad', { ...form.vad, silenceDurationMs: Number(e.target.value) })} />
              </Field>
              <Field label="End-of-speech sensitivity">
                <Select value={form.vad.endSensitivity} onChange={(e) => set('vad', { ...form.vad, endSensitivity: e.target.value })}>
                  <option value="high">High (respond sooner)</option>
                  <option value="low">Low (wait longer)</option>
                </Select>
              </Field>
              <Field label="Start-of-speech sensitivity">
                <Select value={form.vad.startSensitivity} onChange={(e) => set('vad', { ...form.vad, startSensitivity: e.target.value })}>
                  <option value="high">High (easier barge-in)</option>
                  <option value="low">Low (ignore noise)</option>
                </Select>
              </Field>
              <Field label="Prefix padding (ms)">
                <Input type="number" min={0} max={1000} step={20} value={form.vad.prefixPaddingMs} onChange={(e) => set('vad', { ...form.vad, prefixPaddingMs: Number(e.target.value) })} />
              </Field>
            </div>
          </div>
        </Section>

        <div className="lg:col-span-2">
          <Section title="Knowledge & instructions" subtitle="Kept in the system prompt (no retrieval step) so answers stay low-latency.">
            <Field label="Business information" hint="Products, pricing, timings, FAQs the agent may answer">
              <Textarea rows={6} value={form.businessInfo} onChange={(e) => set('businessInfo', e.target.value)} />
            </Field>
            <Field label="Additional system prompt">
              <Textarea rows={5} value={form.systemPrompt} onChange={(e) => set('systemPrompt', e.target.value)} placeholder="e.g. Never discuss competitors. If asked about refunds, offer a transfer to support." />
            </Field>
          </Section>
        </div>
      </fieldset>
    </div>
  );
}
