'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  Home,
  Megaphone,
  FileSpreadsheet,
  History,
  Radio,
  Users,
  Bot,
  BookOpen,
  MessageCircle,
  Headset,
  BarChart3,
  Settings,
  Search,
  LogOut,
  PanelLeft,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSocket } from '@/lib/socket';

export const NAV = [
  {
    group: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: '/campaigns', label: 'Bulk Campaigns', icon: Megaphone },
      { href: '/upload', label: 'Upload Excel', icon: FileSpreadsheet },
      { href: '/calls', label: 'Call History', icon: History },
      { href: '/live', label: 'Live Calls', icon: Radio },
      { href: '/contacts', label: 'Contacts', icon: Users },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { href: '/agent', label: 'AI Agent Settings', icon: Bot },
      { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
      { href: '/whatsapp', label: 'WhatsApp Settings', icon: MessageCircle },
      { href: '/support', label: 'Support Executives', icon: Headset },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const COLLAPSE_KEY = 'cp.sidebarCollapsed';
const EASE = 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none';

// Text that fades and slides out as the rail narrows, so labels never wrap mid-animation.
function Fade({ hidden, className, children }) {
  return (
    <span
      className={clsx(
        'overflow-hidden whitespace-nowrap transition-[opacity,max-width]',
        EASE,
        hidden ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100',
        className,
      )}
      aria-hidden={hidden || undefined}
    >
      {children}
    </span>
  );
}

function ToggleButton({ onClick, label, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100', className)}
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
}

function LogoMark() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M4 12a8 8 0 0 1 8-8" />
        <path d="M8 12a4 4 0 0 1 4-4" />
        <circle cx="13" cy="13" r="2" fill="currentColor" stroke="none" />
        <path d="M14.5 14.5 20 20" />
      </svg>
    </span>
  );
}

/**
 * Sidebar body, shared by the desktop rail and the mobile drawer.
 * `collapsed` shrinks it to icons only; `onToggle` is wired to the panel icon.
 */
function SidebarContent({ collapsed = false, onToggle, toggleLabel, onNavigate }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [q, setQ] = useState('');
  const groups = useMemo(
    () => NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) })).filter((g) => g.items.length),
    [q],
  );

  return (
    <div className="flex h-full flex-col">
      <div className={clsx('flex items-center pb-3 pt-4 transition-[padding]', EASE, collapsed ? 'justify-center px-2' : 'justify-between gap-2 px-4')}>
        {collapsed ? (
          // Collapsed rail: the logo holds the toggle's place and turns into it on hover / keyboard focus.
          <button
            type="button"
            onClick={onToggle}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="group relative flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
          >
            <span className="transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
              <LogoMark />
            </span>
            <PanelLeft className="absolute h-4 w-4 text-ink-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
        ) : (
          <>
            <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-2" title="CallPilot">
              <LogoMark />
              <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight">CallPilot</span>
            </Link>
            <ToggleButton onClick={onToggle} label={toggleLabel} />
          </>
        )}
      </div>

      <div className={clsx('pb-2 transition-[padding]', EASE, collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            title="Search"
            aria-label="Expand sidebar to search"
            className="flex h-8 w-full items-center justify-center rounded-lg border border-line-2 bg-white text-ink-4 hover:text-ink"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="input h-8 bg-white pl-8" aria-label="Search menu" />
          </div>
        )}
      </div>

      <nav className={clsx('scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden pb-3 transition-[padding]', EASE, collapsed ? 'px-2' : 'px-3')}>
        {groups.map((g, gi) => (
          <div key={g.group} className="mt-3">
            {collapsed ? (
              gi > 0 && <div className="mx-2 mb-2 border-t border-line" />
            ) : (
              <p className="whitespace-nowrap px-2 pb-1 text-2xs font-medium text-ink-4">{g.group}</p>
            )}
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                  className={clsx(
                    'mb-0.5 flex items-center rounded-lg py-1.5 text-[13px] transition',
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
                    active ? 'bg-white font-medium text-ink shadow-card ring-1 ring-line' : 'text-ink-2 hover:bg-white/70 hover:text-ink',
                  )}
                >
                  <Icon className={clsx('h-4 w-4 shrink-0', active ? 'text-ink' : 'text-ink-3')} />
                  <Fade hidden={collapsed}>{label}</Fade>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={clsx('flex items-center border-t border-line py-3 transition-[padding]', EASE, collapsed ? 'flex-col gap-2 px-2' : 'gap-2.5 px-4')}>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700"
          title={collapsed ? `${user.name} (${user.role})` : undefined}
        >
          {user.name?.slice(0, 2).toUpperCase()}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{user.name}</p>
            <p className="truncate text-2xs capitalize text-ink-3">{user.role}</p>
          </div>
        )}
        <button onClick={logout} className="rounded-md p-1.5 text-ink-3 hover:bg-white hover:text-ink" aria-label="Log out" title="Log out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Shell({ children }) {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail
  const pathname = usePathname();
  const { connected } = useSocket();
  const current = NAV.flatMap((g) => g.items).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const mainRef = useRef(null);

  // Remember the desktop choice (per browser; a missing/blocked storage just means expanded).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  }, []);

  // <main> is the scroll container, so reset it on navigation like a normal page load.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="h-[100dvh] overflow-hidden lg:p-3">
      <div className="flex h-full overflow-hidden bg-white lg:rounded-2xl lg:border lg:border-line lg:shadow-card">
        {/* Desktop: width animates between full sidebar and icon rail. */}
        <aside className={clsx('hidden shrink-0 overflow-hidden border-r border-line bg-panel transition-[width] lg:block', EASE, collapsed ? 'w-[64px]' : 'w-[232px]')}>
          <SidebarContent collapsed={collapsed} onToggle={toggleCollapsed} toggleLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} />
        </aside>

        {/* Mobile / tablet: always mounted so it can slide in and out. */}
        <div className={clsx('fixed inset-0 z-40 lg:hidden', !open && 'pointer-events-none')} inert={!open} aria-hidden={!open}>
          <div className={clsx('absolute inset-0 bg-black/30 transition-opacity', EASE, open ? 'opacity-100' : 'opacity-0')} onClick={() => setOpen(false)} />
          <aside
            className={clsx('absolute left-0 top-0 h-full w-[260px] max-w-[85vw] bg-panel shadow-xl transition-transform will-change-transform', EASE, open ? 'translate-x-0' : '-translate-x-full')}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <SidebarContent onToggle={() => setOpen(false)} toggleLabel="Close sidebar" onNavigate={() => setOpen(false)} />
          </aside>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4">
            <div className="flex min-w-0 items-center gap-2 text-[13px]">
              <ToggleButton onClick={() => setOpen(true)} label="Open sidebar" className="-ml-1.5 text-ink-2 hover:bg-panel lg:hidden" />
              <Home className="hidden h-4 w-4 text-ink-3 sm:block" />
              <ChevronRight className="hidden h-3.5 w-3.5 text-ink-4 sm:block" />
              <span className="truncate font-medium">{current?.label || 'CallPilot'}</span>
            </div>
            <span
              className={clsx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-medium', connected ? 'bg-emerald-50 text-emerald-700' : 'bg-panel text-ink-3')}
              title={connected ? 'Real-time updates connected' : 'Real-time updates disconnected'}
            >
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? 'Live' : 'Offline'}
            </span>
          </header>
          <main ref={mainRef} className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
