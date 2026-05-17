import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';

// Sign-in screen. Two passwordless paths:
//   1. Google Sign-In — rendered by Google Identity Services into the button
//      slot below. Returns an id_token credential which we POST to the
//      backend for verification + session minting.
//   2. Magic-link email — user types their email, we mail them a one-tap
//      sign-in link valid for 15 minutes.
//
// After successful sign-in we route to the post-login redirect (defaults to
// /tickets — the only page an end-user really needs to land on).

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

// Lazy-load the GIS script exactly once across the app, returning a promise
// that resolves to window.google. Multiple Login mounts share the same load.
let gisLoader = null;
function loadGIS() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (gisLoader) return gisLoader;
  gisLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Google script failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SCRIPT;
    s.async = true; s.defer = true;
    s.onload  = () => resolve(window.google);
    s.onerror = () => { gisLoader = null; reject(new Error('Google script failed to load')); };
    document.head.appendChild(s);
  });
  return gisLoader;
}

export default function Login() {
  const { signIn, isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  // Where to send the user after a successful sign-in. Defaults to /tickets
  // because the only thing the end-user really needs to see is their tickets.
  const redirect = params.get('redirect') || '/tickets';

  const googleSlotRef = useRef(null);
  const [googleError, setGoogleError] = useState('');
  const [googleBusy, setGoogleBusy]   = useState(false);

  const [email, setEmail] = useState('');
  const [linkBusy, setLinkBusy]   = useState(false);
  const [linkSent, setLinkSent]   = useState(false);
  const [linkError, setLinkError] = useState('');

  // Already signed in? Bounce straight to the redirect.
  useEffect(() => {
    if (isAuthenticated) nav(redirect, { replace: true });
  }, [isAuthenticated, nav, redirect]);

  // Render the Google button into the slot once GIS is loaded. Re-runs if
  // the ref attaches late on mount.
  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_CLIENT_ID) return;
    loadGIS().then((google) => {
      if (cancelled || !googleSlotRef.current) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setGoogleError(''); setGoogleBusy(true);
          try {
            const resp = await api.signInWithGoogle(credential);
            signIn(resp);
            nav(redirect, { replace: true });
          } catch (e) {
            setGoogleBusy(false);
            setGoogleError(e?.message || 'Google sign-in failed.');
          }
        },
        ux_mode: 'popup',
        auto_select: false,
      });
      google.accounts.id.renderButton(googleSlotRef.current, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        width: 320,
      });
    }).catch((e) => {
      if (!cancelled) setGoogleError(e?.message || 'Could not load Google sign-in.');
    });
    return () => { cancelled = true; };
  }, [signIn, nav, redirect]);

  async function onSendLink(e) {
    e.preventDefault();
    setLinkError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setLinkError('Enter a valid email.');
      return;
    }
    setLinkBusy(true);
    try {
      await api.sendMagicLink(email.trim().toLowerCase(), redirect);
      setLinkSent(true);
    } catch (e) {
      setLinkError(e?.message || 'Could not send the sign-in email.');
    } finally {
      setLinkBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-200">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Sign in</h1>
        <p className="text-sm text-on-surface-variant">
          One tap with Google, or get a sign-in link emailed to you. No password to remember.
        </p>
      </div>

      {/* Google */}
      <div className="card p-5 space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
          Continue with Google
        </div>
        {GOOGLE_CLIENT_ID ? (
          <>
            <div ref={googleSlotRef} className={`flex justify-center ${googleBusy ? 'opacity-60 pointer-events-none' : ''}`} />
            {googleBusy && <p className="text-xs text-on-surface-variant text-center">Signing you in…</p>}
            {googleError && <p className="text-xs text-muted-coral text-center">{googleError}</p>}
          </>
        ) : (
          <p className="text-xs text-muted-coral">
            Google sign-in isn't configured yet. Set <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span> in the Vercel project to enable it.
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
        <span className="flex-1 h-px bg-outline-variant/30" />
        Or
        <span className="flex-1 h-px bg-outline-variant/30" />
      </div>

      {/* Magic link */}
      <form onSubmit={onSendLink} className="card p-5 space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
          Email me a sign-in link
        </div>
        {linkSent ? (
          <div className="space-y-2 text-sm">
            <div className="inline-flex items-center gap-1.5 font-semibold text-tertiary">
              <CheckCircle2 className="h-4 w-4" /> Check your inbox
            </div>
            <p className="text-on-surface-variant">
              We sent a sign-in link to <strong>{email}</strong>. It expires in 15 minutes and only works once. You can close this tab.
            </p>
            <button
              type="button"
              onClick={() => { setLinkSent(false); setEmail(''); }}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Send to a different email
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="input flex-1"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={linkBusy}
              />
              <button type="submit" disabled={linkBusy} className="btn-primary">
                {linkBusy ? '…' : <><Mail className="h-4 w-4" /> Send</>}
              </button>
            </div>
            {linkError && <p className="text-xs text-muted-coral">{linkError}</p>}
            <p className="text-[11px] text-on-surface-variant">
              We'll email you a one-tap sign-in link. No password required.
            </p>
          </>
        )}
      </form>

      <p className="text-center text-xs text-on-surface-variant">
        After signing in you can view your dashboard and the tickets you've registered for.
        <br />
        <Link to="/" className="font-semibold text-brand-700 inline-flex items-center gap-1 mt-2">
          Back to home <ArrowRight className="h-3 w-3" />
        </Link>
      </p>
    </div>
  );
}
