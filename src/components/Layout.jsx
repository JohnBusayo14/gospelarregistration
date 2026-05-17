import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Home, CalendarDays, Ticket, LayoutDashboard, ShieldCheck,
  ScanLine, Menu, X, Building2, ChevronDown, LogIn, LogOut,
} from 'lucide-react';
import { useChurch } from '../churchContext.jsx';
import { useAuth } from '../authContext.jsx';

// Full nav for staff/admin/anonymous browsing (the SaaS console + marketing
// surfaces). End-users get a curated subset — see `END_USER_NAV` below.
const FULL_NAV = [
  { to: '/',          label: 'Home',      icon: Home,            end: true },
  { to: '/events',    label: 'Events',    icon: CalendarDays },
  { to: '/tickets',   label: 'Tickets',   icon: Ticket },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin',     label: 'Admin',     icon: ShieldCheck },
  { to: '/check-in',  label: 'Check-In',  icon: ScanLine },
];

// What a signed-in non-admin sees: just the two surfaces they own. Events
// / Admin / Check-In / Home are deliberately omitted — they're either
// admin-only or marketing pages an authenticated end-user doesn't need.
const END_USER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tickets',   label: 'Tickets',   icon: Ticket },
];

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

function ChurchSwitcher() {
  const { church, churches, setCurrent } = useChurch();
  if (churches.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full glass">
      <span
        className="h-6 w-6 rounded-md flex-shrink-0"
        style={{ backgroundImage: PRIMARY_GRADIENT }}
      />
      <select
        value={church?.id || ''}
        onChange={(e) => setCurrent(e.target.value)}
        className="bg-transparent text-xs font-semibold uppercase tracking-wide focus:outline-none cursor-pointer pr-1 max-w-[10rem] truncate text-on-surface"
      >
        {churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" strokeWidth={1.5} />
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
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isEndUser, user, signOut } = useAuth();
  // Switcher belongs to the admin / check-in surface — that's the SaaS console.
  const inAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/check-in');

  // End-users (signed in, not staff/admin) see the restricted nav. Everyone
  // else (anonymous browsing, admins, staff) sees the full SaaS nav.
  const nav = isEndUser ? END_USER_NAV : FULL_NAV;

  function handleSignOut() {
    signOut();
    setOpen(false);
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="sticky top-0 z-30 glass-rail print:hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand. End-users go to /dashboard on click (they don't have a
              /home concept); everyone else lands on the marketing home. */}
          <Link to={isEndUser ? '/dashboard' : '/'} className="flex items-center gap-3">
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
            {inAdmin && !isEndUser && (
              <NavItem to="/admin/churches" label="Churches" icon={Building2} />
            )}
          </nav>

          <div className="flex items-center gap-2">
            {inAdmin && !isEndUser && <div className="hidden md:block"><ChurchSwitcher /></div>}
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                className="hidden md:inline-flex btn-ghost h-10 items-center gap-1.5"
                title={user?.email ? `Signed in as ${user.email}` : 'Sign out'}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-xs font-semibold uppercase tracking-wider">Sign out</span>
              </button>
            ) : (
              <Link to="/login" className="hidden md:inline-flex btn-soft h-10 items-center gap-1.5">
                <LogIn className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-xs font-semibold uppercase tracking-wider">Sign in</span>
              </Link>
            )}
            <button
              className="md:hidden btn-ghost h-10 w-10 !p-0"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open
                ? <X className="h-4 w-4" strokeWidth={1.5} />
                : <Menu className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden glass">
            <nav className="mx-auto max-w-6xl px-4 py-4 grid grid-cols-2 gap-2">
              {nav.map((n) => (
                <NavItem key={n.to} {...n} onClick={() => setOpen(false)} />
              ))}
              {isAuthenticated ? (
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant hover:text-on-surface hover:bg-white/60 transition"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sign out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant hover:text-on-surface hover:bg-white/60 transition"
                >
                  <LogIn className="h-4 w-4" strokeWidth={1.5} /> Sign in
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

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
