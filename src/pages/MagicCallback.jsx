import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';

// Landing for /auth/magic?token=... — the URL the magic-link email sends
// recipients to. We forward the token to the backend's verify endpoint,
// stash the returned session in AuthContext, then bounce to the redirect
// the email was scoped to (defaults to /tickets).
export default function MagicCallback() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying | ok | error
  const [error, setError]   = useState('');

  useEffect(() => {
    const token = (params.get('token') || '').trim();
    if (!token) {
      setStatus('error'); setError('Sign-in link is missing its token.');
      return;
    }
    let cancelled = false;
    api.verifyMagicLink(token)
      .then((resp) => {
        if (cancelled) return;
        signIn(resp);
        setStatus('ok');
        // Tiny delay so the success state is visible — a flash of "ok"
        // then navigate, rather than navigate-as-soon-as-you-clicked.
        setTimeout(() => nav(resp.redirect || '/tickets', { replace: true }), 400);
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setError(e?.message || 'Could not sign you in with that link.');
      });
    return () => { cancelled = true; };
  }, [params, signIn, nav]);

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      {status === 'verifying' && (
        <>
          <Loader2 className="h-10 w-10 mx-auto text-brand-600 animate-spin" />
          <h1 className="text-xl font-bold tracking-tight text-ink">Signing you in…</h1>
          <p className="text-sm text-zinc-500">Verifying your sign-in link.</p>
        </>
      )}
      {status === 'ok' && (
        <>
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
          <h1 className="text-xl font-bold tracking-tight text-ink">Signed in</h1>
          <p className="text-sm text-zinc-500">Redirecting…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertTriangle className="h-10 w-10 mx-auto text-red-600" />
          <h1 className="text-xl font-bold tracking-tight text-ink">Link no longer works</h1>
          <p className="text-sm text-zinc-500">{error}</p>
          <Link to="/login" className="btn-primary inline-flex">Try signing in again</Link>
        </>
      )}
    </div>
  );
}
