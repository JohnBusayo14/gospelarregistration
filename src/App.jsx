import { Navigate, Route, Routes } from 'react-router-dom';
import Layout          from './components/Layout.jsx';
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
import MyEvents        from './pages/MyEvents.jsx';
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
      <Route element={<Layout />}>
        {/* Public marketing / browse surfaces — anyone can see these.
            Includes Home, the events catalog, and the share-detail page
            for an individual event. */}
        <Route index                       element={<Home />} />
        <Route path="events"               element={<Events />} />
        <Route path="events/:id"           element={<EventDetails />} />
        <Route path="events/:id/register"  element={<Register />} />

        {/* Create-Event for any signed-in user (normal user + super admin
            both have it in their nav). Backend's POST /api/events stamps
            creator_email from the session. */}
        <Route path="events/new"           element={<RequireAuth><CreateEvent /></RequireAuth>} />
        {/* Template picker — funnels users into CreateEvent with the
            ?template= query param pre-filled. */}
        <Route path="templates"            element={<RequireAuth><Templates /></RequireAuth>} />

        {/* End-user surfaces — require sign-in. */}
        <Route path="dashboard"            element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="my-events"            element={<RequireAuth><MyEvents /></RequireAuth>} />
        <Route path="tickets"              element={<RequireAuth><Tickets /></RequireAuth>} />
        <Route path="tickets/:code"        element={<RequireAuth><TicketDetail /></RequireAuth>} />
        <Route path="tickets/:code/edit"   element={<RequireAuth><TicketEdit /></RequireAuth>} />
        <Route path="tickets/:code/email"  element={<RequireAuth><EmailPreview /></RequireAuth>} />
        <Route path="tickets/:code/badge"  element={<RequireAuth><TicketBadge /></RequireAuth>} />

        {/* Super-admin only — full SaaS console. RequireSuperAdmin handles
            the "logged-in but not admin" case by sending them to their
            dashboard instead of throwing a 403 page. */}
        <Route path="admin"                    element={<RequireSuperAdmin><AdminDashboard /></RequireSuperAdmin>} />
        <Route path="admin/churches"           element={<RequireSuperAdmin><AdminChurches /></RequireSuperAdmin>} />
        <Route path="admin/events/new"         element={<RequireSuperAdmin><AdminEventEdit /></RequireSuperAdmin>} />
        <Route path="admin/events/:id/edit"    element={<RequireSuperAdmin><AdminEventEdit /></RequireSuperAdmin>} />
        <Route path="admin/events/:id/badges"  element={<RequireSuperAdmin><AdminBadges /></RequireSuperAdmin>} />
        <Route path="check-in"                 element={<RequireSuperAdmin><CheckIn /></RequireSuperAdmin>} />

        {/* Magic-link landing stays inside the Layout — once the token
            verifies we redirect to /tickets where the sidebar matters. */}
        <Route path="auth/magic"   element={<MagicCallback />} />

        {/* Public — payment provider redirects land here, then we verify
            and create the ticket(s). Public because the redirect happens
            outside any session context. */}
        <Route path="payments/callback" element={<PaymentCallback />} />
      </Route>

      {/* Login lives outside the Layout — the split-screen sign-in
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
