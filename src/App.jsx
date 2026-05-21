import { Component } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout          from './components/Layout.jsx';
import AppLayout       from './components/AppLayout.jsx';
import InviteLayout    from './components/InviteLayout.jsx';
import RequireAuth     from './components/RequireAuth.jsx';
import { useAuth }     from './authContext.jsx';
import Home            from './pages/Home.jsx';
import Events          from './pages/Events.jsx';
import EventDetails    from './pages/EventDetails.jsx';
import Register        from './pages/Register.jsx';
import Tickets         from './pages/Tickets.jsx';
import TicketDetail    from './pages/TicketDetail.jsx';
import TicketEdit      from './pages/TicketEdit.jsx';
import TicketBadge     from './pages/TicketBadge.jsx';
import EmailPreview    from './pages/EmailPreview.jsx';
import Dashboard       from './pages/Dashboard.jsx';
import AdminDashboard  from './pages/AdminDashboard.jsx';
import AdminEventEdit  from './pages/AdminEventEdit.jsx';
import AdminBadges     from './pages/AdminBadges.jsx';
import AdminChurches   from './pages/AdminChurches.jsx';
import CheckIn         from './pages/CheckIn.jsx';
import Login           from './pages/Login.jsx';
import MagicCallback   from './pages/MagicCallback.jsx';
import CreateEvent     from './pages/CreateEvent.jsx';
import Templates       from './pages/Templates.jsx';
import FormTemplates   from './pages/FormTemplates.jsx';
import MyEvents        from './pages/MyEvents.jsx';
import Registrations   from './pages/Registrations.jsx';
import PendingApprovals from './pages/PendingApprovals.jsx';
import PaymentCallback from './pages/PaymentCallback.jsx';

// Catches render-time crashes anywhere in the route tree so a blown
// component (e.g. third-party DOM mutation racing React's reconciler,
// like the GIS button bug that blanked /login) shows a recoverable
// fallback card instead of an empty page. Reset via full reload.
class RouteErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[App] render crash:', error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-50 text-zinc-800">
          <div className="max-w-md w-full bg-white rounded-2xl ring-1 ring-zinc-200 shadow-sm p-8 space-y-4 text-center">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              The page hit an unexpected error while rendering. Try reloading — if it keeps
              happening, send us the URL and we'll look into it.
            </p>
            <pre className="text-[11px] text-left bg-zinc-100 rounded-lg p-3 overflow-x-auto text-rose-700">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <div className="flex justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800"
              >
                Reload
              </button>
              <a href="/" className="px-4 py-2 rounded-md text-sm font-semibold ring-1 ring-zinc-300 text-zinc-800 hover:bg-zinc-50">
                Go home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Gate that bounces non-super-admin users away from /admin/* and /check-in.
// Anonymous users get sent to /login (so they have a chance to sign in as
// admin); normal signed-in users get sent to /dashboard (admin pages aren't
// in their menu, but a direct URL visit shouldn't 404 — give them their
// own surface instead).
function RequireSuperAdmin({ children }) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login?redirect=/admin" replace />;
  if (!isSuperAdmin)    return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <RouteErrorBoundary>
    <Routes>
      {/* Home keeps the marketing top-nav Layout — wide, hero-first,
          no sidebar — so first-time visitors see the brand pitch
          without admin chrome. */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
      </Route>

      {/* Every other in-app surface uses the full-bleed sidebar shell —
          fully responsive (drawer on mobile, sticky rail on desktop),
          full-width content. */}
      <Route element={<AppLayout />}>
        {/* Public browse surfaces */}
        <Route path="events"               element={<Events />} />
        <Route path="events/:id"           element={<EventDetails />} />
        <Route path="events/:id/register"  element={<Register />} />

        {/* Signed-in: create / template flow */}
        <Route path="events/new"           element={<RequireAuth><CreateEvent /></RequireAuth>} />
        <Route path="templates"            element={<RequireAuth><Templates /></RequireAuth>} />
        {/* Form-template browser — same templates as /templates but the
            cards center the RSVP question list (not the event preset). */}
        <Route path="forms"                element={<RequireAuth><FormTemplates /></RequireAuth>} />

        {/* End-user surfaces — require sign-in. */}
        <Route path="dashboard"            element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="my-events"            element={<RequireAuth><MyEvents /></RequireAuth>} />
        {/* Registrations database — every ticket across every event the
            user has created, in one searchable / exportable table. */}
        <Route path="registrations"        element={<RequireAuth><Registrations /></RequireAuth>} />
        {/* Bank-transfer approval queue — sibling of Registrations. Backend
            scopes rows to the calling user's events, so any signed-in
            creator (not just super-admins) can see/approve their own. */}
        <Route path="pending-approvals"    element={<RequireAuth><PendingApprovals /></RequireAuth>} />
        <Route path="tickets"              element={<RequireAuth><Tickets /></RequireAuth>} />
        <Route path="tickets/:code"        element={<RequireAuth><TicketDetail /></RequireAuth>} />
        <Route path="tickets/:code/edit"   element={<RequireAuth><TicketEdit /></RequireAuth>} />
        <Route path="tickets/:code/email"  element={<RequireAuth><EmailPreview /></RequireAuth>} />
        <Route path="tickets/:code/badge"  element={<RequireAuth><TicketBadge /></RequireAuth>} />

        {/* Super-admin only — full SaaS console. */}
        <Route path="admin"                    element={<RequireSuperAdmin><AdminDashboard /></RequireSuperAdmin>} />
        <Route path="admin/churches"           element={<RequireSuperAdmin><AdminChurches /></RequireSuperAdmin>} />
        <Route path="admin/events/new"         element={<RequireSuperAdmin><AdminEventEdit /></RequireSuperAdmin>} />
        <Route path="admin/events/:id/edit"    element={<RequireSuperAdmin><AdminEventEdit /></RequireSuperAdmin>} />
        <Route path="admin/events/:id/badges"  element={<RequireSuperAdmin><AdminBadges /></RequireSuperAdmin>} />
        <Route path="check-in"                 element={<RequireSuperAdmin><CheckIn /></RequireSuperAdmin>} />

        {/* Magic-link landing — verifies the token then redirects. */}
        <Route path="auth/magic"   element={<MagicCallback />} />

        {/* Payment-provider redirect lands here. */}
        <Route path="payments/callback" element={<PaymentCallback />} />
      </Route>

      {/* Login lives outside any layout — split-screen sign-in
          surface takes the entire viewport with no sidebar / nav chrome. */}
      <Route path="login" element={<Login />} />

      {/* Public invite landing — chrome-less, mobile-first, locked to one
          event. Generated by ShareEventModal.jsx when an admin shares an
          event. Distinct from /events/:id/register so we can hide nav and
          present a focused single-task UI for SMS/WhatsApp recipients. */}
      <Route element={<InviteLayout />}>
        <Route path="r/:id" element={<Register />} />
      </Route>
    </Routes>
    </RouteErrorBoundary>
  );
}
