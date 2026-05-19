import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Home, Ticket, LayoutDashboard, ShieldCheck,
  ScanLine, Menu, X, Building2, ChevronDown, LogIn, LogOut, PlusCircle,
  CalendarCheck, LayoutTemplate,
} from 'lucide-react';
import { useChurch } from '../churchContext.jsx';
import { useAuth } from '../authContext.jsx';
import TopBar from './TopBar.jsx';

// Three nav tiers, matching the user's role model:
//   ANON      — Home only. /events is still reachable via the Home page CTA.
//   NORMAL    — Home + Tickets + Dashboard + My Events + Create Event.
//   SUPER_ADMIN — Home + Tickets + My Events + Create Event + Admin ▾.
//                 The Admin dropdown holds the SaaS-console tools (overview,
//                 churches, check-in, active-church selector).
const ANON_NAV = [
  { to: '/',          label: 'Home',         icon: Home,         end: true },
];

const NORMAL_NAV = [
  { to: '/',            label: 'Home',         icon: Home,         end: true },
  { to: '/tickets',     label: 'Tickets',      icon: Ticket },
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/my-events',   label: 'My Events',    icon: CalendarCheck },
  { to: '/templates',   label: 'Templates',    icon: LayoutTemplate },
  { to: '/events/new',  label: 'Create Event', icon: PlusCircle },
];

const SUPER_ADMIN_NAV = [
  { to: '/',            label: 'Home',         icon: Home,         end: true },
  { to: '/tickets',     label: 'Tickets',      icon: Ticket },
  { to: '/my-events',   label: 'My Events',    icon: CalendarCheck },
  { to: '/templates',   label: 'Templates',    icon: LayoutTemplate },
  { to: '/events/new',  label: 'Create Event', icon: PlusCircle },
];

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

function ChurchSwitcher() {
  const { church, churches, setCurrent } = useChurch();
  if (churches.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-variant/40">
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

function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
          isActive
            ? 'text-white shadow-glow'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-white/60'
        }`
      }
      style={({ isActive }) =>
        isActive ? { backgroundImage: PRIMARY_GRADIENT } : undefined
      }
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
      {label}
    </NavLink>
  );
}

// Dropdown item — same look as a NavItem chip but block-level so it stacks
// neatly inside the popover.
function DropdownLink({ to, icon: Icon, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${
          isActive
            ? 'text-white shadow-glow'
            : 'text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface'
        }`
      }
      style={({ isActive }) =>
        isActive ? { backgroundImage: PRIMARY_GRADIENT } : undefined
      }
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
      {label}
    </NavLink>
  );
}

// Click-to-open popover anchored to the Admin chip. Houses every super-admin
// SaaS-console destination plus the active-church selector. Closes on outside
// click, Esc, route change, or clicking any link inside.
function AdminMenu({ inAdmin }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
          inAdmin
            ? 'text-white shadow-glow'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-white/60'
        }`}
        style={inAdmin ? { backgroundImage: PRIMARY_GRADIENT } : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
        Admin
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2.25}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-outline-variant/30 shadow-ambient-lg p-3 space-y-1 z-50"
        >
          <DropdownLink to="/admin"          icon={ShieldCheck} label="Admin dashboard" end onClick={close} />
          <DropdownLink to="/admin/churches" icon={Building2}   label="Churches"           onClick={close} />
          <DropdownLink to="/check-in"       icon={ScanLine}    label="Check-In"           onClick={close} />
          <div className="pt-3 mt-2 border-t border-outline-variant/30">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              Active church
            </div>
            <ChurchSwitcher />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isSuperAdmin, isNormalUser, user, signOut } = useAuth();
  const inAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/check-in');

  const nav = isSuperAdmin
    ? SUPER_ADMIN_NAV
    : isNormalUser
      ? NORMAL_NAV
      : ANON_NAV;

  useEffect(() => { setOpen(false); }, [location.pathname]);

  function handleSignOut() {
    signOut();
    setOpen(false);
    // Send the user to the sign-in page so the act of signing out has
    // visible feedback — otherwise they'd silently stay on the same page
    // and only the sidebar nav would change.
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="sticky top-0 z-30 glass-rail print:hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white font-display font-extrabold text-base shadow-glow"
              style={{ backgroundImage: PRIMARY_GRADIENT }}
            >
              G
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display font-extrabold tracking-tight text-on-surface text-base">
                Gospelar
              </span>
              <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant mt-1">
                Registration
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {nav.map((n) => <NavItem key={n.to} {...n} />)}
            {isSuperAdmin && <AdminMenu inAdmin={inAdmin} />}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                className="hidden md:inline-flex btn-ghost h-10 items-center gap-1.5"
                title={user?.email ? `Signed in as ${user.email}` : 'Sign out'}
              >
                <LogOut className="h-4 w-4" strokeWidth={2.25} />
                <span className="text-xs font-semibold uppercase tracking-wider">Sign out</span>
              </button>
            ) : (
              <Link to="/login" className="hidden md:inline-flex btn-soft h-10 items-center gap-1.5">
                <LogIn className="h-4 w-4" strokeWidth={2.25} />
                <span className="text-xs font-semibold uppercase tracking-wider">Sign in</span>
              </Link>
            )}
            <button
              className="md:hidden btn-ghost h-10 w-10 !p-0"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open
                ? <X className="h-4 w-4" strokeWidth={2.25} />
                : <Menu className="h-4 w-4" strokeWidth={2.25} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden glass">
            <nav className="mx-auto max-w-6xl px-4 py-4 grid grid-cols-2 gap-2">
              {nav.map((n) => (
                <NavItem key={n.to} {...n} onClick={() => setOpen(false)} />
              ))}
              {isSuperAdmin && (
                <>
                  <NavItem to="/admin"          label="Admin"    icon={ShieldCheck} end onClick={() => setOpen(false)} />
                  <NavItem to="/admin/churches" label="Churches" icon={Building2}      onClick={() => setOpen(false)} />
                  <NavItem to="/check-in"       label="Check-In" icon={ScanLine}       onClick={() => setOpen(false)} />
                </>
              )}
              {isAuthenticated ? (
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant hover:text-on-surface hover:bg-white/60 transition"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2.25} /> Sign out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant hover:text-on-surface hover:bg-white/60 transition"
                >
                  <LogIn className="h-4 w-4" strokeWidth={2.25} /> Sign in
                </Link>
              )}
            </nav>
            {isSuperAdmin && (
              <div className="mx-auto max-w-6xl px-4 pb-4">
                <div className="pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant px-1 pb-2">
                  Active church
                </div>
                <ChurchSwitcher />
              </div>
            )}
          </div>
        )}
      </header>

      <TopBar />

      <main className="flex-1 relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-14">
          <Outlet />
        </div>
      </main>

      <footer className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-xs text-on-surface-variant flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <span className="font-semibold tracking-wide">© {new Date().getFullYear()} Gospelar Registration</span>
          <span className="opacity-70">Built for Christian events, retreats &amp; gatherings</span>
        </div>
      </footer>
    </div>
  );
}
