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
import PaymentCallback from './pages/PaymentCallback.jsx';

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
  );
}
