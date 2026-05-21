// AppLayout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// App shell mirroring the churchdashboard design: flat 256px left sidebar on
// zinc-25 with grouped nav sections, sticky h-14 topbar with bg-white/80
// backdrop-blur, brand-600 blue accents, lucide icons at default stroke.
//
// Layout breakdown:
//   - Desktop (md+): fixed 256px sidebar, content uses the rest.
//   - Mobile:        hamburger opens a slide-out drawer with the same nav.
//   - Topbar:        page title (from useTopBarContext) + dynamic actions
//                    registered by pages + user avatar dropdown.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Ticket, LayoutDashboard, ShieldCheck, ScanLine, Menu,
  Building2, LogIn, LogOut, PlusCircle, CalendarCheck,
  LayoutTemplate, Database, HelpCircle, ChevronsUpDown, ChevronDown,
  MoreHorizontal, User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../authContext.jsx';
import { useChurch } from '../churchContext.jsx';
import { useTopBarContext } from '../context/TopBarContext.jsx';

// Fallback title map — used when a page doesn't explicitly register one.
const ROUTE_TITLES = [
  [/^\/dashboard$/,                  'Your dashboard'],
  [/^\/tickets$/,                    'Tickets'],
  [/^\/tickets\/[^/]+\/edit$/,       'Edit registration'],
  [/^\/tickets\/[^/]+\/badge$/,      'Ticket badge'],
  [/^\/tickets\/[^/]+\/email$/,      'Email preview'],
  [/^\/tickets\/[^/]+$/,             'Ticket details'],
  [/^\/my-events$/,                  'My events'],
  [/^\/registrations$/,              'Registrations'],
  [/^\/templates$/,                  'Templates'],
  [/^\/forms$/,                      'Form templates'],
  [/^\/events\/new$/,                'Create event'],
  [/^\/events\/[^/]+\/register$/,    'Register'],
  [/^\/events\/[^/]+$/,              'Event details'],
  [/^\/events$/,                     'Events'],
  [/^\/admin$/,                      'Admin overview'],
  [/^\/admin\/churches$/,            'Churches'],
  [/^\/admin\/events\/[^/]+\/edit$/, 'Edit event'],
  [/^\/admin\/events\/new$/,         'New admin event'],
  [/^\/admin\/events\/[^/]+\/badges$/,'Badges'],
  [/^\/check-in$/,                   'Check-in'],
  [/^\/payments\/callback$/,         'Payment status'],
  [/^\/auth\/magic$/,                'Verifying sign-in'],
];

function deriveTitle(pathname) {
  for (const [re, label] of ROUTE_TITLES) if (re.test(pathname)) return label;
  return '';
}

// Nav structure — grouped sections, mirrors churchdashboard's NAV pattern.
// Role gating happens in SidebarContent.
const ANON_NAV = [
  { section: 'Browse', items: [
    { to: '/',       label: 'Home',   icon: Home, end: true },
  ]},
];

const USER_NAV = [
  { section: 'Overview', items: [
    { to: '/',          label: 'Home',          icon: Home, end: true },
    { to: '/dashboard', label: 'Dashboard',     icon: LayoutDashboard },
  ]},
  { section: 'Events', items: [
    { to: '/my-events',     label: 'My events',     icon: CalendarCheck },
    { to: '/events/new',    label: 'Create event',  icon: PlusCircle },
    { to: '/templates',     label: 'Templates',     icon: LayoutTemplate },
  ]},
  { section: 'People', items: [
    { to: '/tickets',       label: 'Tickets',       icon: Ticket },
    { to: '/registrations', label: 'Registrations', icon: Database },
  ]},
];

const ADMIN_NAV = [
  { section: 'Admin', items: [
    { to: '/admin',          label: 'Overview', icon: ShieldCheck, end: true },
    { to: '/admin/churches', label: 'Churches', icon: Building2 },
    { to: '/check-in',       label: 'Check-in', icon: ScanLine },
  ]},
];

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function ChurchSwitcher() {
  const { church, churches, setCurrent } = useChurch();
  if (!churches || churches.length === 0) return null;
  return (
    <div className="relative">
      <select
        value={church?.id || ''}
        onChange={(e) => setCurrent(e.target.value)}
        className="w-full rounded-md bg-white ring-1 ring-zinc-200 pl-2.5 pr-7 py-1.5 text-[13px] font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none appearance-none"
      >
        {churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  const { isAuthenticated, isSuperAdmin, signOut } = useAuth();
  const sections = isAuthenticated
    ? (isSuperAdmin ? [...USER_NAV, ...ADMIN_NAV] : USER_NAV)
    : ANON_NAV;

  return (
    <div className="flex h-full flex-col">
      {/* Brand row */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 px-2"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-600 text-[13px] font-extrabold text-white">
            G
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-ink">Gospelar</span>
            <span className="block truncate text-[11px] text-zinc-500">Registration</span>
          </span>
        </Link>
        <button
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-150"
          title="Switch"
          type="button"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.section} className="mb-4">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {section.section}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((it) => {
                const Icon = it.icon;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] font-medium transition ' +
                      (isActive
                        ? 'bg-zinc-150 text-ink'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-ink')
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{it.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {isSuperAdmin && (
          <div className="mb-4">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Active church
            </div>
            <div className="px-2">
              <ChurchSwitcher />
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => { signOut(); onNavigate?.(); }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        ) : (
          <Link
            to="/login"
            onClick={onNavigate}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-2 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700 shadow-cta"
          >
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────────────────────────────────────────
function TopBar({ onOpenSidebar }) {
  const { title: contextTitle, actions } = useTopBarContext();
  const location = useLocation();
  const fallbackTitle = useMemo(() => deriveTitle(location.pathname), [location.pathname]);
  const title = contextTitle || fallbackTitle;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur sm:px-5 print:hidden">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">
          {title || 'Gospelar'}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        {actions.map((a) => (
          <TopBarAction key={a.id || a.label} action={a} />
        ))}
        {actions.length > 0 && (
          <span className="mx-1 hidden h-6 w-px bg-zinc-200 sm:inline-block" />
        )}
        <a
          href="https://gospelar.com/help"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Help"
          title="Help"
          className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
        >
          <HelpCircle className="h-4 w-4" />
        </a>
        <UserMenu />
      </div>
    </header>
  );
}

// Action button registered by a page via useTopBar.
function TopBarAction({ action }) {
  const { icon: Icon, label, onClick, href, primary, badge, disabled } = action;
  const base = 'relative inline-flex items-center gap-1.5 h-9 rounded-md px-2.5 text-[13px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const className = primary
    ? `${base} bg-brand-600 text-white hover:bg-brand-700 shadow-cta`
    : `${base} text-zinc-600 hover:bg-zinc-100 hover:text-ink`;

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      <span className="hidden sm:inline">{label}</span>
      {badge != null && badge !== 0 && (
        <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={className} title={label} aria-label={label}>
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={label}
      aria-label={label}
    >
      {content}
    </button>
  );
}

// Avatar + dropdown.
function UserMenu() {
  const { isAuthenticated, isBypass, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="btn-primary h-9"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const displayName = user?.full_name || user?.email || 'Signed in';
  const initial = (user?.full_name || user?.email || '?')[0].toUpperCase();

  function handleSignOut() {
    setOpen(false);
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-md pl-1 pr-1.5 sm:pr-2 py-1 hover:bg-zinc-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-[12px] font-bold text-white">
          {initial}
        </span>
        <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-zinc-500" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 shadow-card z-50"
        >
          <div className="border-b border-zinc-200 px-3 py-3">
            <div className="truncate text-sm font-semibold text-ink">{displayName}</div>
            {user?.email && (
              <div className="truncate text-[11px] text-zinc-500">{user.email}</div>
            )}
            {isBypass && (
              <span className="mt-1 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                Dev mode · bypass
              </span>
            )}
          </div>
          <div className="py-1">
            <MenuLink to="/dashboard"     icon={LayoutDashboard} label="Dashboard"     onClick={() => setOpen(false)} />
            <MenuLink to="/my-events"     icon={CalendarCheck}   label="My events"     onClick={() => setOpen(false)} />
            <MenuLink to="/tickets"       icon={Ticket}          label="Tickets"       onClick={() => setOpen(false)} />
            <MenuLink to="/registrations" icon={Database}        label="Registrations" onClick={() => setOpen(false)} />
          </div>
          <div className="border-t border-zinc-200 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, icon: Icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 hover:text-ink"
    >
      <Icon className="h-4 w-4 text-zinc-500" />
      {label}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:sticky md:top-0 md:h-screen border-r border-zinc-200 bg-zinc-25 print:hidden">
        <SidebarContent />
      </aside>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 border-r border-zinc-200 bg-zinc-25 shadow-card transform transition-transform duration-200 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenSidebar={() => setOpen(true)} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </main>

        <footer className="px-4 sm:px-6 lg:px-8 py-6 text-xs text-zinc-500 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <span className="font-semibold tracking-wide">© {new Date().getFullYear()} Gospelar Registration</span>
          <span className="opacity-70">Built for Christian events, retreats &amp; gatherings</span>
        </footer>
      </div>
    </div>
  );
}
