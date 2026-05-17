import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../authContext.jsx';

// Gate for routes that should only show content to a signed-in user.
// Anonymous users get bounced to /login with a `redirect` query param so
// the post-login navigate sends them back to where they were headed.
export default function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const loc = useLocation();
  if (!isAuthenticated) {
    const to = `/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`;
    return <Navigate to={to} replace />;
  }
  return children;
}
