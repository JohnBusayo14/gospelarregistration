// AppLayout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-bleed app shell with a vertical sidebar nav for all signed-in /
// dashboard-style routes (everything except Home, Login, and the invite page).
// The sidebar collapses to a slide-out drawer on mobile.
//
// Layout breakdown:
//   - Desktop (lg+): fixed 260px sidebar on the left, content uses the rest.
//   - Mobile:        slim top bar with a hamburger, sidebar appears as an
//                    over-content drawer with a backdrop.
//   - Content area:  full-bleed (no max-width cap). Pages add their own
//                    inner container/padding when they want centered copy.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home, Ticket, LayoutDashboard, ShieldCheck, ScanLine, Menu, X,
  Building2, ChevronDown, LogIn, LogOut, PlusCircle, CalendarCheck,
  LayoutTemplate, Database, User as UserIcon, Bell, Search, HelpCircle,
} from 'lucide-react';
import { useAuth } from '../authContext.jsx';
import { useChurch } from '../churchContext.jsx';
import { useTopBarContext } from '../context/TopBarContext.jsx';

// Fallback title map — used when a page doesn't explicitly register one.
// Pattern order matters: most specific first.
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

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

const ANON_NAV = [
  { to: '/',          label: 'Home',         icon: Home,         end: true },
];

const NORMAL_NAV = [
  { to: '/',              label: 'Home',          icon: Home,         end: true },
  { to: '/tickets',       label: 'Tickets',       icon: Ticket },
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/my-events',     label: 'My Events',     icon: CalendarCheck },
  { to: '/registrations', label: 'Registrations', icon: Database },
  { to: '/templates',     label: 'Templates',     icon: LayoutTemplate },
  { to: '/events/new',    label: 'Create Event',  icon: PlusCircle },
];

const SUPER_ADMIN_NAV = [
  { to: '/',              label: 'Home',          icon: Home,         end: true },
  { to: '/tickets',       label: 'Tickets',       icon: Ticket },
  { to: '/my-events',     label: 'My Events',     icon: CalendarCheck },
  { to: '/registrations', label: 'Registrations', icon: Database },
  { to: '/templates',     label: 'Templates',     icon: LayoutTemplate },
  { to: '/events/new',    label: 'Create Event',  icon: PlusCircle },
];

const ADMIN_NAV = [
  { to: '/admin',          label: 'Overview', icon: ShieldCheck, end: true },
  { to: '/admin/churches', label: 'Churches', icon: Building2 },
  { to: '/check-in',       label: 'Check-In', icon: ScanLine },
];

function ChurchSwitcher() {
  const { church, churches, setCurrent } = useChurch();
  if (churches.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60">
      <span
        className="h-6 w-6 rounded-md flex-shrink-0"
        style={{ backgroundImage: PRIMARY_GRADIENT }}
      />
      <select
        value={church?.id || ''}
        onChange={(e) => setCurrent(e.target.value)}
        className="bg-transparent text-xs font-semibold uppercase tracking-wide focus:outline-none cursor-pointer pr-1 flex-1 truncate text-on-surface"
      >
        {churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" strokeWidth={2.25} />
    </div>
  );
}

function SideNavItem({ to, label, icon: Icon, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
          isActive
            ? 'text-white shadow-glow'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-white/60'
        }`
      }
      style={({ isActive }) =>
        isActive ? { backgroundImage: PRIMARY_GRADIENT } : undefined
      }
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  const { isAuthenticated, isSuperAdmin, isNormalUser, user, signOut } = useAuth();
  const nav = isSuperAdmin
    ? SUPER_ADMIN_NAV
    : isNormalUser
      ? NORMAL_NAV
      : ANON_NAV;

  return (
    <div className="flex flex-col h-full">
      {/* Brand mark */}
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 pt-6 pb-5"
      >
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white font-display font-extrabold text-lg shadow-glow"
          style={{ backgroundImage: PRIMARY_GRADIENT }}
        >
          G
        </span>
        <span className="flex flex-col leading-none min-w-0">
          <span className="font-display font-extrabold tracking-tight text-on-surface text-base">
            Gospelar
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant mt-1">
            Registration
          </span>
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/70">
          Main
        </div>
        {nav.map((n) => (
          <SideNavItem key={n.to} {...n} onNavigate={onNavigate} />
        ))}

        {isSuperAdmin && (
          <>
            <div className="px-3 pt-5 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/70">
              Admin
            </div>
            {ADMIN_NAV.map((n) => (
              <SideNavItem key={n.to} {...n} onNavigate={onNavigate} />
            ))}
            <div className="pt-3 px-1">
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/70">
                Active church
              </div>
              <ChurchSwitcher />
            </div>
          </>
        )}
      </nav>

      {/* Footer — user identity + sign-out */}
      <div className="px-3 pb-4 pt-3 border-t border-outline-variant/30">
        {isAuthenticated ? (
          <button
            onClick={() => { signOut(); onNavigate?.(); }}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-white/60 hover:text-on-surface transition"
            title={user?.email ? `Signed in as ${user.email}` : 'Sign out'}
          >
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-[11px] font-bold shrink-0"
              style={{ backgroundImage: PRIMARY_GRADIENT }}
            >
              {(user?.email || '?')[0].toUpperCase()}
            </span>
            <span className="flex-1 min-w-0 text-left">
              <span className="block text-[11px] uppercase tracking-wider text-on-surface-variant/70 truncate">
                {user?.email || 'Account'}
              </span>
              <span className="text-on-surface inline-flex items-center gap-1.5 mt-0.5">
                <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} /> Sign out
              </span>
            </span>
          </button>
        ) : (
          <Link
            to="/login"
            onClick={onNavigate}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-glow"
            style={{ backgroundImage: PRIMARY_GRADIENT }}
          >
            <LogIn className="h-4 w-4" strokeWidth={2.25} /> Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top bar — sticky on desktop and mobile. Shows the current page title,
// dynamic per-screen action icons (registered via useTopBar), and the
// user-avatar menu on the right. On mobile it also exposes the hamburger
// that opens the sidebar drawer.
// ─────────────────────────────────────────────────────────────────────────────
function TopBar({ onOpenSidebar }) {
  const { title: contextTitle, actions } = useTopBarContext();
  const location = useLocation();
  const fallbackTitle = useMemo(() => deriveTitle(location.pathname), [location.pathname]);
  const title = contextTitle || fallbackTitle;

  return (
    <header className="sticky top-0 z-30 glass-rail print:hidden">
      <div className="px-3 sm:px-4 lg:px-8 h-14 lg:h-16 flex items-center gap-2 sm:gap-3">
        {/* Mobile hamburger — opens the sidebar drawer. Hidden on lg+ where
            the sidebar is permanently visible. */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-white/60 transition"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2.25} />
        </button>

        {/* Brand pip on mobile (the sidebar carries it on desktop) */}
        <Link to="/" className="lg:hidden flex items-center gap-2 min-w-0 mr-1">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white font-display font-extrabold text-sm shadow-glow shrink-0"
            style={{ backgroundImage: PRIMARY_GRADIENT }}
          >
            G
          </span>
        </Link>

        {/* Page title — truncates aggressively so long titles never push the
            action icons off-screen. */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-extrabold tracking-tight text-on-surface text-base sm:text-lg truncate">
            {title || 'Gospelar'}
          </h1>
        </div>

        {/* Dynamic per-screen actions, then static utilities, then user menu. */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {actions.map((a) => (
            <TopBarAction key={a.id || a.label} action={a} />
          ))}
          {actions.length > 0 && (
            <span className="hidden sm:inline-block w-px h-6 bg-outline-variant/30 mx-1" />
          )}
          <TopBarIcon
            label="Help"
            href="https://gospelar.com/help"
            external
            icon={HelpCircle}
            className="hidden sm:inline-flex"
          />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

// One dynamic action button. Renders an icon-only pill on mobile and an
// icon + label on sm+. `primary` adds the brand-gradient fill.
function TopBarAction({ action }) {
  const { icon: Icon, label, onClick, href, primary, badge, disabled } = action;
  const className = primary
    ? 'inline-flex items-center gap-1.5 h-9 sm:h-10 rounded-full px-3 sm:px-4 text-xs font-semibold text-white shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition'
    : 'relative inline-flex items-center gap-1.5 h-9 sm:h-10 rounded-full px-2.5 sm:px-3.5 text-xs font-semibold text-on-surface-variant hover:bg-white/60 hover:text-on-surface disabled:opacity-50 disabled:cursor-not-allowed transition';
  const style = primary ? { backgroundImage: PRIMARY_GRADIENT } : undefined;

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4" strokeWidth={1.6} />}
      <span className="hidden sm:inline">{label}</span>
      {badge != null && badge !== 0 && (
        <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-muted-coral px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={className} style={style} title={label} aria-label={label}>
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
      style={style}
      title={label}
      aria-label={label}
    >
      {content}
    </button>
  );
}

// Small static icon (Help, etc.). Mirrors TopBarAction's hover styling so
// the bar reads as a single coherent row of pills.
function TopBarIcon({ icon: Icon, label, href, external, className = '' }) {
  const base = `inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-white/60 hover:text-on-surface transition ${className}`;
  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={base}
        aria-label={label}
        title={label}
      >
        <Icon className="h-4 w-4" strokeWidth={1.6} />
      </a>
    );
  }
  return (
    <button type="button" className={base} aria-label={label} title={label}>
      <Icon className="h-4 w-4" strokeWidth={1.6} />
    </button>
  );
}

// Avatar button + dropdown menu. Falls back to a Sign-in button for
// anonymous users.
function UserMenu() {
  const { isAuthenticated, user, signOut } = useAuth();
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
        className="inline-flex items-center gap-1.5 h-9 sm:h-10 rounded-full px-3 sm:px-4 text-xs font-semibold text-white shadow-glow"
        style={{ backgroundImage: PRIMARY_GRADIENT }}
      >
        <LogIn className="h-4 w-4" strokeWidth={1.6} />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const initial = (user?.email || user?.full_name || '?')[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full pl-1 pr-1.5 sm:pr-2.5 py-1 hover:bg-white/60 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white text-[12px] font-bold shrink-0"
          style={{ backgroundImage: PRIMARY_GRADIENT }}
        >
          {initial}
        </span>
        <ChevronDown
          className={`hidden sm:block h-3.5 w-3.5 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.6}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-outline-variant/30 shadow-ambient-lg p-2 z-50"
        >
          <div className="flex items-center gap-3 px-3 py-3 border-b border-outline-variant/30">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
              style={{ backgroundImage: PRIMARY_GRADIENT }}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-on-surface truncate">{user?.full_name || 'Signed in'}</div>
              <div className="text-[11px] text-on-surface-variant truncate">{user?.email || ''}</div>
            </div>
          </div>
          <div className="py-1">
            <MenuLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setOpen(false)} />
            <MenuLink to="/my-events" icon={CalendarCheck}   label="My events" onClick={() => setOpen(false)} />
            <MenuLink to="/tickets"   icon={Ticket}          label="Tickets"   onClick={() => setOpen(false)} />
            <MenuLink to="/registrations" icon={Database}    label="Registrations" onClick={() => setOpen(false)} />
          </div>
          <div className="pt-1 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-coral hover:bg-muted-coral/10 transition"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.6} /> Sign out
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
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition"
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const drawerRef = useRef(null);

  // Close drawer on route change.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock background scroll when the drawer is open.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div className="min-h-screen flex bg-surface">
      {/* ── Desktop sidebar (lg+) — sticky, never scrolls with content. ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-surface-container-low/70 backdrop-blur-rail border-r border-outline-variant/30 print:hidden">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer + backdrop ───────────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-on-surface/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        ref={drawerRef}
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-surface-container-low shadow-ambient-lg transform transition-transform duration-300 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>

      {/* ── Main column ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenSidebar={() => setOpen(true)} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <Outlet />
        </main>

        <footer className="px-4 sm:px-6 lg:px-8 py-6 text-xs text-on-surface-variant flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between print:hidden">
          <span className="font-semibold tracking-wide">© {new Date().getFullYear()} Gospelar Registration</span>
          <span className="opacity-70">Built for Christian events, retreats &amp; gatherings</span>
        </footer>
      </div>
    </div>
  );
}
