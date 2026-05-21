import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

// Sign-in screen. White background, single centered card, full-height.
// Two passwordless paths:
//   1. Google Sign-In via GIS. The button is rendered directly by Google's
//      script — Chrome won't let us forward clicks into the GIS iframe, so
//      a previous "hidden GIS + custom styled button" approach silently
//      no-op'd on click. The visible Google button is plain but works.
//   2. Magic-link email — yellow primary button, matching the reference.

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

// Inline Google "G" mark for our custom-styled button.
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

  // signup ↔ signin toggle — both flows hit the same passwordless backend;
  // only the copy changes so a fresh visitor sees "Create your account".
  const initialMode = params.get('mode') === 'signin' ? 'signin' : 'signup';
  const [mode, setMode] = useState(initialMode);
  const isSignUp = mode === 'signup';

  // Visible slot that GIS renders its own iframe button into. Clicking it
  // hits Google's machinery directly — Chrome blocks programmatic clicks
  // from outside the iframe, so a previous "hidden GIS + custom button +
  // forwarded click" pattern silently failed.
  const googleSlotRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleBusy,  setGoogleBusy]  = useState(false);

  const [email, setEmail] = useState('');
  const [linkBusy, setLinkBusy]   = useState(false);
  const [linkSent, setLinkSent]   = useState(false);
  const [linkError, setLinkError] = useState('');

  // Already signed in? Bounce straight to the redirect — but only for a
  // real session. The dev-only AUTH_BYPASS in authContext also reports
  // isAuthenticated:true; we still want this page reachable in that case
  // so the design can be worked on.
  useEffect(() => {
    if (isAuthenticated && !isBypass) nav(redirect, { replace: true });
  }, [isAuthenticated, isBypass, nav, redirect]);

  // Render the GIS button directly into a visible slot. The width is
  // computed from the slot's measured pixel width so the button fills our
  // container at any breakpoint (GIS only accepts a numeric width prop).
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
      // Measure the parent so the GIS button stretches to fill it. Clamp
      // between Google's accepted bounds (200–400).
      const width = Math.max(200, Math.min(400, googleSlotRef.current.offsetWidth || 360));
      google.accounts.id.renderButton(googleSlotRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: isSignUp ? 'signup_with' : 'signin_with',
        logo_alignment: 'left',
        width,
      });
      setGoogleReady(true);
    }).catch((e) => {
      if (!cancelled) setGoogleError(e?.message || 'Could not load Google sign-in.');
    });
    return () => { cancelled = true; };
  }, [signIn, nav, redirect, isSignUp]);

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
    // Login lives outside the Layout. A thin top bar carries the brand +
    // a back-to-home link; the rest of the viewport is the 50/50 split.
    <div className="h-screen w-screen flex flex-col overflow-hidden print:hidden">
      {/* Top bar — spans the full width above the split. */}
      <header className="h-14 sm:h-16 shrink-0 bg-white/85 backdrop-blur-rail border-b border-zinc-200/60 px-4 sm:px-6 flex items-center justify-between z-20">
        <Link to="/" className="flex items-center gap-2 group">
          <span
            className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-white font-display font-extrabold text-sm sm:text-base shadow-glow"
            style={{ backgroundImage: PRIMARY_GRADIENT }}
          >
            G
          </span>
          <span className="font-display text-base sm:text-lg font-extrabold tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors">
            Gospelar
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to home</span>
          <span className="sm:hidden">Home</span>
        </Link>
      </header>

      {/* 50/50 split fills the remaining viewport. */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">

      {/* LEFT — translucent glass panel filling the half, form centered.
          The page-body sky-blue/mint orbs from index.css bleed through
          the white/70, giving the "glassmorphic blue" feel without a
          discrete card. */}
      <div className="relative flex items-center justify-center px-6 py-8 overflow-y-auto bg-white/70 backdrop-blur-glass">
        <div className="w-full max-w-md space-y-7">
        {/* Brand mark */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="font-display text-2xl font-extrabold tracking-tight text-zinc-900">
              Gospelar
            </span>
          </Link>
        </div>

        {/* Headline + mode toggle */}
        <div className="text-center">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            {isSignUp
              ? <>Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
                  >
                    Sign in
                  </button>
                </>
              : <>New to Gospelar?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
                  >
                    Create your account
                  </button>
                </>
            }
          </p>
        </div>

        {/* Google sign-in. GIS renders its own button into this slot —
            Chrome blocks programmatic clicks across the iframe boundary,
            so we don't try to wrap it in our own styled button anymore. */}
        <div className="space-y-2">
          {googleBusy ? (
            <div className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-lg ring-1 ring-zinc-300 bg-zinc-50 text-sm font-semibold text-zinc-600">
              Signing you in…
            </div>
          ) : (
            <div
              ref={googleSlotRef}
              className="w-full min-h-[44px] flex items-center justify-center [&_iframe]:!w-full"
            >
              {!googleReady && !googleError && (
                <div className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-lg ring-1 ring-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-500">
                  <GoogleGlyph className="h-5 w-5 opacity-60" />
                  Loading Google sign-in…
                </div>
              )}
            </div>
          )}
          {googleError && (
            <p className="text-xs text-rose-600 text-center" role="alert">{googleError}</p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs font-medium text-zinc-400">
          <span className="flex-1 h-px bg-zinc-200" />
          <span>Or</span>
          <span className="flex-1 h-px bg-zinc-200" />
        </div>

        {/* Magic link form */}
        {linkSent ? (
          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-5 space-y-2 text-sm">
            <div className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Check your inbox
            </div>
            <p className="text-emerald-900/80">
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
            <label htmlFor="email" className="block text-sm font-semibold text-zinc-800">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="w-full h-11 pl-9 pr-3 rounded-lg ring-1 ring-zinc-300 focus:ring-2 focus:ring-amber-400 focus:outline-none text-sm bg-white"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={linkBusy}
              />
            </div>
            <button
              type="submit"
              disabled={linkBusy}
              className="w-full h-11 rounded-lg bg-amber-400 hover:bg-amber-500 text-zinc-900 font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {linkBusy ? 'Sending…' : 'Continue with email'}
            </button>
            {linkError && <p className="text-xs text-rose-600">{linkError}</p>}
          </form>
        )}

        <p className="text-center text-[11px] text-zinc-500 leading-relaxed">
          By using Gospelar, you are agreeing to our{' '}
          <Link to="/" className="underline underline-offset-2 hover:text-zinc-700">Privacy Policy</Link>
          {' '}and{' '}
          <Link to="/" className="underline underline-offset-2 hover:text-zinc-700">Terms</Link>.
        </p>
        </div>
      </div>

      {/* RIGHT — image panel, edge-to-edge, no rounding, no shadow.
          Hidden on phones / small tablets so the form takes the full
          viewport width on narrow screens. */}
      <aside className="hidden lg:block relative overflow-hidden">
        <img
          src="https://picsum.photos/seed/gospelar-worship/1200/1600"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Bottom-heavy gradient so the headline keeps contrast against
            whatever colours land in the photo. */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-10 text-white">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-[10px] font-bold uppercase tracking-[0.18em] self-start">
            Gospelar
          </span>
          <h2 className="mt-4 font-display text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight max-w-sm">
            Christian events,<br />simplified.
          </h2>
          <p className="mt-3 text-sm text-white/85 max-w-md leading-relaxed">
            Issue tickets, take payment, and check people in for retreats, conferences, and church gatherings — all from one place.
          </p>
        </div>
      </aside>
      </div>
    </div>
  );
}
