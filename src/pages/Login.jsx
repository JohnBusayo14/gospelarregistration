import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, CheckCircle2, ArrowLeft, ArrowRight, Loader2, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';

// Sign-in screen mirroring churchdashboard's centered-card Login: zinc-25
// background with two soft brand-blur orbs, single 420px column, brand
// G-mark above the card, .card / .input / .btn-primary throughout.
//
// Two passwordless paths preserved:
//   1. Google Sign-In via GIS (rendered into a visible slot — Chrome blocks
//      programmatic clicks into the GIS iframe so we never wrap it).
//   2. Magic-link email — submits to /auth/magic.

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

// Lazy-load the GIS script exactly once across the app.
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

function GoogleGlyph(props) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.8-2 13.3-5.2l-6.1-5.2c-1.9 1.4-4.4 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.1 5.2C40.8 35.1 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

export default function Login() {
  const { signIn, isAuthenticated, isBypass } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/tickets';

  const initialMode = params.get('mode') === 'signin' ? 'signin' : 'signup';
  const [mode, setMode] = useState(initialMode);
  const isSignUp = mode === 'signup';

  const googleSlotRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleBusy,  setGoogleBusy]  = useState(false);

  const [email, setEmail] = useState('');
  const [linkBusy, setLinkBusy]   = useState(false);
  const [linkSent, setLinkSent]   = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (isAuthenticated && !isBypass) nav(redirect, { replace: true });
  }, [isAuthenticated, isBypass, nav, redirect]);

  // GIS init — deliberately excludes `isSignUp` from deps so toggling
  // signup/signin doesn't re-inject the iframe (which crashes the tree).
  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_CLIENT_ID) {
      setGoogleError(
        "Google sign-in isn't configured on this deploy. Set VITE_GOOGLE_CLIENT_ID in the Vercel project and redeploy.",
      );
      return undefined;
    }
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
      googleSlotRef.current.innerHTML = '';
      const width = Math.max(200, Math.min(400, googleSlotRef.current.offsetWidth || 360));
      google.accounts.id.renderButton(googleSlotRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width,
      });
      setGoogleReady(true);
    }).catch((e) => {
      if (!cancelled) setGoogleError(e?.message || 'Could not load Google sign-in.');
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-25 px-4 py-12 print:hidden">
      {/* Background decoration — mirrors churchdashboard's Login orbs. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-100 blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-brand-50 blur-3xl opacity-70" />
      </div>

      {/* Top-left back-to-home link, fixed in-page (no full topbar). */}
      <Link
        to="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-zinc-500 hover:bg-white hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>

      <div className="w-full max-w-[420px]">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-brand-600 text-white shadow-cta">
            <span className="text-xl font-extrabold tracking-tight">G</span>
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
            {isSignUp ? 'Create your account' : 'Sign in to Gospelar'}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {isSignUp
              ? <>Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Sign in
                  </button>
                </>
              : <>New to Gospelar?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Create your account
                  </button>
                </>
            }
          </p>
        </div>

        {/* Card */}
        <div className="card overflow-hidden">
          <div className="space-y-5 p-6">
            {/* Google sign-in */}
            <div className="space-y-2">
              <div className="relative w-full min-h-[44px]">
                <div
                  ref={googleSlotRef}
                  className="w-full flex items-center justify-center [&_iframe]:!w-full"
                  style={{ visibility: googleBusy ? 'hidden' : 'visible' }}
                />
                {!googleReady && !googleError && !googleBusy && (
                  <div className="absolute inset-0 w-full h-11 inline-flex items-center justify-center gap-3 rounded-lg ring-1 ring-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-500 pointer-events-none">
                    <GoogleGlyph className="h-5 w-5 opacity-60" />
                    Loading Google sign-in…
                  </div>
                )}
                {googleBusy && (
                  <div className="absolute inset-0 w-full h-11 inline-flex items-center justify-center gap-3 rounded-lg ring-1 ring-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing you in…
                  </div>
                )}
              </div>
              {googleError && (
                <div className="flex items-start gap-2.5 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700 ring-1 ring-red-100" role="alert">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">{googleError}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <span className="flex-1 h-px bg-zinc-200" />
              <span>Or</span>
              <span className="flex-1 h-px bg-zinc-200" />
            </div>

            {/* Magic link form */}
            {linkSent ? (
              <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-100 p-4 space-y-2 text-sm">
                <div className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Check your inbox
                </div>
                <p className="text-emerald-800/90">
                  We sent a sign-in link to <strong>{email}</strong>. It expires in 15 minutes and only works once. You can close this tab.
                </p>
                <button
                  type="button"
                  onClick={() => { setLinkSent(false); setEmail(''); }}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  Send to a different email
                </button>
              </div>
            ) : (
              <form onSubmit={onSendLink} className="space-y-3">
                <div>
                  <label htmlFor="email" className="label flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-400" />
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (linkError) setLinkError(''); }}
                    disabled={linkBusy}
                  />
                </div>
                {linkError && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700 ring-1 ring-red-100" role="alert">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">{linkError}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={linkBusy}
                  className="btn-primary group w-full py-2.5"
                >
                  {linkBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Continue with email
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer band */}
          <div className="flex items-center justify-center gap-1.5 border-t border-zinc-100 bg-zinc-25 px-6 py-3 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Magic links expire in 15 minutes and only work once.</span>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-zinc-500 leading-relaxed">
          By using Gospelar, you are agreeing to our{' '}
          <Link to="/" className="font-semibold text-zinc-700 hover:text-ink">Privacy Policy</Link>
          {' '}and{' '}
          <Link to="/" className="font-semibold text-zinc-700 hover:text-ink">Terms</Link>.
        </p>
      </div>
    </div>
  );
}
