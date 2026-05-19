import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Filter, Plus, Bell, Save, Eye, Share2, Download, Camera,
  IdCard, LayoutTemplate, CalendarPlus, ScanLine, RefreshCw,
  User as UserIcon, LogOut, Settings, ChevronDown, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../authContext.jsx';

// Action helpers — each route declares its dynamic icon-buttons here.
// `to` triggers <Link> navigation; `onClick` runs an inline handler.
// Static, no per-page state required — pages don't need to know the TopBar
// exists. Extend by adding another entry to ROUTE_ACTIONS below.
const A = (icon, label, opts) => ({ icon, label, ...opts });

// Page title + actions keyed by URL prefix. Longest-match wins so
// /admin/churches resolves to its own entry before falling back to /admin.
// Each `actions` is an array of A(icon, label, { to | onClick }) tuples
// the TopBar renders as circular icon buttons with a tooltip.
const ROUTE_ACTIONS = [
  {
    prefix: '/admin/churches',
    title:  'Churches',
    actions: (nav) => [
      A(Plus,    'Add church', { onClick: () => nav('/admin/churches?new=1') }),
      A(Filter,  'Filter list'),
    ],
  },
  {
    prefix: '/admin/events',
    title:  'Edit event',
    actions: (nav) => [
      A(Eye,     'Preview event'),
      A(Save,    'Save changes'),
    ],
  },
  {
    prefix: '/admin',
    title:  'Admin',
    actions: (nav) => [
      A(Plus,    'New event',     { to: '/admin/events/new' }),
      A(Filter,  'Filter'),
      A(Bell,    'Notifications'),
    ],
  },
  {
    prefix: '/check-in',
    title:  'Check-in',
    actions: (nav) => [
      A(Camera,  'Scan QR'),
      A(RefreshCw, 'Refresh queue'),
    ],
  },
  {
    prefix: '/tickets/',
    title:  'Ticket',
    actions: (nav) => [
      A(Share2,    'Share ticket'),
      A(Download,  'Download / print', { onClick: () => window.print() }),
    ],
  },
  {
    prefix: '/tickets',
    title:  'My tickets',
    actions: (nav) => [
      A(Search,    'Search tickets'),
      A(Filter,    'Filter'),
      A(IdCard,    'Print badges'),
    ],
  },
  {
    prefix: '/dashboard',
    title:  'Dashboard',
    actions: (nav) => [
      A(Plus,      'New event', { to: '/templates' }),
      A(Bell,      'Notifications'),
    ],
  },
  {
    prefix: '/my-events',
    title:  'My events',
    actions: (nav) => [
      A(Plus,      'Create from template', { to: '/templates' }),
      A(Filter,    'Filter'),
    ],
  },
  {
    prefix: '/events/new',
    title:  'New event',
    actions: (nav) => [
      A(Eye,       'Preview'),
      A(Save,      'Save'),
    ],
  },
  {
    prefix: '/events/',
    title:  'Event',
    actions: (nav) => [
      A(Share2,    'Share event'),
      A(CalendarPlus, 'Register'),
    ],
  },
  {
    prefix: '/events',
    title:  'Events',
    actions: (nav) => [
      A(Search,    'Search events'),
      A(Filter,    'Filter'),
      A(Plus,      'New event', { to: '/templates' }),
    ],
  },
  {
    prefix: '/templates',
    title:  'Templates',
    actions: (nav) => [
      A(Search,    'Search templates'),
    ],
  },
  {
    prefix: '/',
    title:  'Home',
    actions: (nav) => [
      A(LayoutDashboard, 'Open dashboard', { to: '/dashboard' }),
    ],
  },
];

function resolveRoute(pathname) {
  // Longest prefix that matches wins. ROUTE_ACTIONS is already ordered
  // most-specific → least-specific for cases where prefixes overlap.
  for (const entry of ROUTE_ACTIONS) {
    if (entry.prefix === '/' ? pathname === '/' : pathname.startsWith(entry.prefix)) {
      return entry;
    }
  }
  return ROUTE_ACTIONS[ROUTE_ACTIONS.length - 1]; // '/' fallback
}

// Initials from a name for the user avatar — same shape used elsewhere.
function initials(name, email) {
  const src = (name || email || '?').trim();
  return src.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

function ActionIcon({ icon: Icon, label, to, onClick }) {
  const className =
    'h-9 w-9 rounded-full flex items-center justify-center text-on-surface-variant ' +
    'hover:text-on-surface hover:bg-white/70 transition-colors';
  const props = { title: label, 'aria-label': label, className };
  if (to)      return <Link {...props} to={to}><Icon className="h-4 w-4" strokeWidth={1.75} /></Link>;
  return (
    <button type="button" {...props} onClick={onClick || (() => {})}>
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isBypass, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const route = useMemo(() => resolveRoute(location.pathname), [location.pathname]);
  const actions = useMemo(() => route.actions(navigate), [route, navigate]);

  // Close the user dropdown on outside click / Escape — keeps it from
  // staying open after the user clicks Sign out or navigates.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setMenuOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Hide the top bar entirely on the routes that intentionally own their
  // own chrome (the share-invite Register flow uses InviteLayout; the
  // login page is outside the Layout). Belt-and-braces — keeps this
  // component reusable if Layout's mount changes later.
  if (location.pathname.startsWith('/r/') || location.pathname === '/login') return null;

  function handleSignOut() {
    setMenuOpen(false);
    signOut();
    navigate('/login', { replace: true });
  }

  const displayName = user?.full_name || user?.email || (isBypass ? 'Test User' : 'Guest');

  return (
    <header className="sticky top-0 z-20 h-14 sm:h-16 glass-rail border-b border-on-surface-variant/10 px-3 sm:px-6 flex items-center gap-3 print:hidden">
      {/* LEFT — page title for the current route */}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-on-surface truncate">
          {route.title}
        </h1>
      </div>

      {/* CENTER/RIGHT — context-sensitive action icons */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {actions.map((a, i) => (
          <ActionIcon key={i} {...a} />
        ))}
      </div>

      {/* Divider between actions and user menu */}
      {actions.length > 0 && <span className="h-6 w-px bg-on-surface-variant/15" />}

      {/* USER MENU — avatar + dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-white/70 transition-colors"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span
            className="h-8 w-8 rounded-full grid place-items-center text-white text-xs font-extrabold shadow-glow"
            style={{ backgroundImage: PRIMARY_GRADIENT }}
            aria-hidden="true"
          >
            {isAuthenticated ? initials(user?.full_name, user?.email) : <UserIcon className="h-4 w-4" />}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-on-surface max-w-[140px]">
            <span className="truncate">{displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant shrink-0" />
          </span>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-white shadow-ambient-lg ring-1 ring-black/5 overflow-hidden py-1 z-30"
          >
            {/* Account summary */}
            <div className="px-4 py-3 border-b border-zinc-100">
              <div className="text-sm font-bold tracking-tight text-zinc-900 truncate">{displayName}</div>
              {user?.email && (
                <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
              )}
              {isBypass && (
                <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  Dev mode · bypass
                </div>
              )}
            </div>

            {/* Common actions */}
            <MenuLink to="/dashboard"  icon={LayoutDashboard} label="Dashboard"   onClick={() => setMenuOpen(false)} />
            <MenuLink to="/tickets"    icon={IdCard}          label="My tickets"  onClick={() => setMenuOpen(false)} />
            <MenuLink to="/templates"  icon={LayoutTemplate}  label="Templates"   onClick={() => setMenuOpen(false)} />
            <MenuLink to="/check-in"   icon={ScanLine}        label="Check-in"    onClick={() => setMenuOpen(false)} />

            <div className="h-px bg-zinc-100 my-1" />

            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function MenuLink({ to, icon: Icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
    >
      <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
