'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  PhoneCall,
  PhoneIncoming,
  PhoneForwarded,
  PhoneMissed,
  MessageCircle,
  Loader2,
  Ban,
  Radio,
  Inbox,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { STATUS_LABEL } from '@/lib/format';

export function Button({ variant = 'secondary', size = 'md', className, loading, icon: Icon, children, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-3.5 text-[13px]',
        variant === 'primary' && 'bg-brand-500 text-white shadow-card hover:bg-brand-600',
        variant === 'secondary' && 'border border-line-2 bg-white text-ink shadow-card hover:bg-panel',
        variant === 'ghost' && 'text-ink-2 hover:bg-panel hover:text-ink',
        variant === 'danger' && 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

export function Card({ className, children, ...props }) {
  return (
    // min-w-0 lets cards shrink inside grid/flex parents so wide tables scroll inside the card.
    <div className={clsx('min-w-0 rounded-xl border border-line bg-white shadow-card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 px-4 pt-3.5', className)}>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-[12px] text-red-600">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const Input = ({ className, ...p }) => <input className={clsx('input', className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={clsx('input h-auto py-2', className)} {...p} />;
export const Select = ({ className, children, ...p }) => (
  <select className={clsx('input pr-8', className)} {...p}>
    {children}
  </select>
);

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[13px] text-ink-2 disabled:opacity-50"
    >
      <span className={clsx('relative h-5 w-9 rounded-full transition', checked ? 'bg-brand-500' : 'bg-line-2')}>
        <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  );
}

const TONES = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  gray: 'border-line-2 bg-panel text-ink-2',
};

export function Badge({ tone = 'gray', icon: Icon, children, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[12px] font-medium', TONES[tone], className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

const STATUS_STYLE = {
  pending: ['gray', Clock],
  queued: ['gray', Clock],
  calling: ['blue', PhoneCall],
  ringing: ['blue', Radio],
  connected: ['violet', PhoneIncoming],
  ivr_processing: ['violet', Loader2],
  whatsapp_sent: ['green', MessageCircle],
  transferred: ['amber', PhoneForwarded],
  completed: ['green', CheckCircle2],
  failed: ['red', XCircle],
  no_answer: ['gray', PhoneMissed],
  busy: ['amber', PhoneMissed],
  canceled: ['gray', Ban],
};

export function StatusPill({ status }) {
  const [tone, Icon] = STATUS_STYLE[status] || ['gray', Clock];
  return (
    <Badge tone={tone} icon={Icon}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

const SIMPLE = {
  none: ['gray', '—'],
  queued: ['gray', 'Queued'],
  sent: ['blue', 'Sent'],
  delivered: ['green', 'Delivered'],
  read: ['green', 'Read'],
  failed: ['red', 'Failed'],
  requested: ['amber', 'Requested'],
  dialing: ['blue', 'Dialing'],
  connected: ['violet', 'Connected'],
  completed: ['green', 'Connected'],
  no_answer: ['gray', 'No answer'],
  busy: ['amber', 'Busy'],
  canceled: ['gray', 'Canceled'],
};

export function OutcomePill({ value }) {
  if (!value || value === 'none') return <span className="text-ink-4">—</span>;
  const [tone, label] = SIMPLE[value] || ['gray', value];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Delta({ value }) {
  if (value === null || value === undefined) return <span className="text-[12px] text-ink-4">new</span>;
  const up = value >= 0;
  return (
    <span className={clsx('inline-flex items-center gap-0.5 rounded px-1 text-[11px] font-medium', up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

export function Progress({ value, className }) {
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}>
      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={clsx('h-4 w-4 animate-spin text-ink-3', className)} />;
}

export function EmptyState({ icon: Icon = Inbox, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-panel p-3">
        <Icon className="h-5 w-5 text-ink-3" />
      </div>
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[12px] text-ink-3">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error.message || String(error)}</div>;
}

export function Table({ children, className }) {
  return (
    <div className={clsx('scrollbar-thin overflow-x-auto', className)}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function Pagination({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-3 text-[12px] text-ink-3">
      <span>
        {total ? `${(page - 1) * limit + 1}–${Math.min(total, page * limit)} of ${total.toLocaleString('en-IN')}` : '0 results'}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="px-2 text-ink-2">
          {page} / {pages}
        </span>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={clsx('max-h-[92vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-panel" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-panel px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30" onMouseDown={onClose}>
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="truncate text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-panel" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const fn = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
}

// ---------------------------------------------------------------- toasts

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex items-start gap-2 rounded-lg border bg-white px-3 py-2.5 text-[13px] shadow-lg',
              t.tone === 'error' ? 'border-red-200 text-red-700' : 'border-line text-ink',
            )}
          >
            {t.tone === 'error' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
