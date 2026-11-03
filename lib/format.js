const TZ = 'Asia/Kolkata';

export const fmtNumber = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));

export function fmtDuration(sec) {
  if (sec === null || sec === undefined || Number.isNaN(sec)) return '—';
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

export const fmtMs = (ms) => (ms === null || ms === undefined ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`);

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export const fmtDay = (iso) => new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' });

export function delta(cur, prev) {
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export const elapsedSince = (d) => (d ? Math.max(0, (Date.now() - new Date(d).getTime()) / 1000) : null);

export const STATUS_LABEL = {
  pending: 'Pending',
  queued: 'Queued',
  calling: 'Calling',
  ringing: 'Ringing',
  connected: 'Connected',
  ivr_processing: 'IVR Processing',
  whatsapp_sent: 'WhatsApp Sent',
  transferred: 'Transferred',
  completed: 'Completed',
  failed: 'Failed',
  no_answer: 'No Answer',
  busy: 'Busy',
  canceled: 'Canceled',
};

export const ACTION_LABEL = {
  whatsapp_link: 'WhatsApp link',
  transfer_support: 'Support transfer',
  opt_out: 'Opt-out',
  repeat: 'Repeat menu',
  end_call: 'End call',
};
