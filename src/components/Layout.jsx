import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home, CalendarDays, Ticket, LayoutDashboard, ShieldCheck,
  ScanLine, Building2, ChevronDown, LogIn, LogOut, PlusCircle,
  CalendarCheck,
} from 'lucide-react';
import { useChurch } from '../churchContext.jsx';
import { useAuth } from '../authContext.jsx';

// Three nav tiers, matching the user's role model:
//   ANON      — Home + Events + Sign-in. Marketing surface for visitors.
//   NORMAL    — Home + Tickets + Dashboard + Create Event. Signed-in users
//               who can register and create their own events.
//   SUPER_ADMIN — every menu item. Granted via promote-admin CLI or by being
//               admin_email of an approved church on the churchdashboard.
const ANON_NAV = [
  { to: '/',          label: 'Home',         icon: Home,         end: true },
  { to: '/events',    label: 'Events',       icon: CalendarDays },
];

const NORMAL_NAV = [
  { to: '/',            label: 'Home',         icon: Home,         end: true },
  { to: '/tickets',     label: 'Tickets',      icon: Ticket },
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/my-events',   label: 'My Events',    icon: CalendarCheck },
  { to: '/events/new',  label: 'Create Event', icon: PlusCircle },
];

const SUPER_ADMIN_NAV = [
  { to: '/',            label: 'Home',         icon: Home,         end: true },
  { to: '/events',      label: 'Events',       icon: CalendarDays },
  { to: '/tickets',     label: 'Tickets',      icon: Ticket },
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/my-events',   label: 'My Events',    icon: CalendarCheck },
  { to: '/events/new',  label: 'Create Event', icon: PlusCircle },
  { to: '/admin',       label: 'Admin',        icon: ShieldCheck },
  { to: '/check-in',    label: 'Check-In',     icon: ScanLine },
];

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

function ChurchSwitcher() {
  const { church, churches, setCurrent } = useChurch();
  if (churches.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass w-full">
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
      <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" strokeWidth={1.5} />
    </div>
  );
}

// Sidebar pill. Icon-only on the smallest viewports (the sidebar collapses
// to an icon rail to keep the main content readable on a phone) and gains
// the label at sm+.
function SideNavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        `flex items-center justify-center sm:justify-start gap-3 rounded-xl px-2.5 sm:px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
          isActive
            ? 'text-white shadow-glow'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-white/60'
        }`
      }
      style={({ isActive }) =>
        isActive ? { backgroundImage: PRIMARY_GRADIENT } : undefined
      }
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const location = useLocation();
  const { isAuthenticated, isSuperAdmin, isNormalUser, user, signOut } = useAuth();
  // Switcher belongs to the admin / check-in surface — that's the SaaS console.
  const inAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/check-in');

  // Pick the menu for the current role tier — see the constants at top.
  const nav = isSuperAdmin
    ? SUPER_ADMIN_NAV
    : isNormalUser
      ? NORMAL_NAV
      : ANON_NAV;

  return (
    <div className="min-h-screen relative">
      {/* Sidebar — always visible at every viewport, icon-only on the
          narrowest screens to leave room for content. */}
      <aside
        className="fixed top-0 left-0 z-40 h-screen w-16 sm:w-64 glass-rail flex flex-col p-3 sm:p-6 print:hidden"
      >
        <Link to="/" className="flex items-center justify-center sm:justify-start gap-3 sm:px-2">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white font-display font-extrabold text-base shadow-glow shrink-0"
            style={{ backgroundImage: PRIMARY_GRADIENT }}
          >
            G
          </span>
          <span className="hidden sm:flex flex-col leading-none">
            <span className="font-display font-extrabold tracking-tight text-on-surface text-base">
              Gospelar
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant mt-1">
              Registration
            </span>
          </span>
        </Link>

        <nav className="mt-8 sm:mt-10 flex-1 flex flex-col gap-1 overflow-y-auto -mx-1 px-1">
          {nav.map((n) => (
            <SideNavItem key={n.to} {...n} />
          ))}
          {inAdmin && isSuperAdmin && (
            <SideNavItem
              to="/admin/churches"
              label="Churches"
              icon={Building2}
            />
          )}
        </nav>

        <div className="mt-6 pt-6 border-t border-on-surface-variant/15 space-y-3">
          {inAdmin && isSuperAdmin && (
            <div className="hidden sm:block">
              <ChurchSwitcher />
            </div>
          )}
          {isAuthenticated ? (
            <button
              onClick={signOut}
              className="btn-ghost w-full !justify-center sm:!justify-start gap-2 !px-2 sm:!px-4"
              title={user?.email ? `Signed in as ${user.email}` : 'Sign out'}
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Sign out</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="btn-soft w-full !justify-center sm:!justify-start gap-2 !px-2 sm:!px-4"
              title="Sign in"
            >
              <LogIn className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Sign in</span>
            </Link>
          )}
          {isAuthenticated && user?.email && (
            <div className="hidden sm:block px-2 pt-1 text-[10px] text-on-surface-variant truncate" title={user.email}>
              {user.email}
            </div>
          )}
        </div>
      </aside>

      <div className="pl-16 sm:pl-64 flex flex-col min-h-screen">
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
    </div>
  );
}
