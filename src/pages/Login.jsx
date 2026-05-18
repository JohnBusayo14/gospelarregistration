import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';

// Sign-in screen. White background, single centered card, full-height.
// Two passwordless paths:
//   1. Google Sign-In via GIS. To keep the visual consistent with the rest
//      of the design we render the GIS button into a hidden div and forward
//      clicks from our own styled button to it — gives us full visual
//      control while keeping all of Google's OAuth machinery intact.
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
  const { signIn, isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/tickets';

  // signup ↔ signin toggle — both flows hit the same passwordless backend;
  // only the copy changes so a fresh visitor sees "Create your account".
  const initialMode = params.get('mode') === 'signin' ? 'signin' : 'signup';
  const [mode, setMode] = useState(initialMode);
  const isSignUp = mode === 'signup';

  // Hidden slot we render the real GIS button into. Our visible custom
  // button forwards its click to whatever inner element GIS produced.
  const hiddenGoogleSlotRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleBusy,  setGoogleBusy]  = useState(false);

  const [email, setEmail] = useState('');
  const [linkBusy, setLinkBusy]   = useState(false);
  const [linkSent, setLinkSent]   = useState(false);
  const [linkError, setLinkError] = useState('');

  // Already signed in? Bounce straight to the redirect.
  useEffect(() => {
    if (isAuthenticated) nav(redirect, { replace: true });
  }, [isAuthenticated, nav, redirect]);

  // Add a body-level class while the login page is mounted so the
  // decorative blue/green orbs from index.css don't bleed onto the white
  // sign-in surface. Re-removed on unmount. useLayoutEffect runs before
  // paint to avoid a flash.
  useLayoutEffect(() => {
    document.body.classList.add('login-no-orbs');
    return () => document.body.classList.remove('login-no-orbs');
  }, []);

  // Render the real GIS button into the hidden slot. Sized to match the
  // visible button so the forwarded click hits exactly the right pixels.
  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_CLIENT_ID) return;
    loadGIS().then((google) => {
      if (cancelled || !hiddenGoogleSlotRef.current) return;
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
      // Render at large size so the inner clickable element is big enough
      // that forwarded clicks reliably land on it.
      google.accounts.id.renderButton(hiddenGoogleSlotRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width: 360,
      });
      setGoogleReady(true);
    }).catch((e) => {
      if (!cancelled) setGoogleError(e?.message || 'Could not load Google sign-in.');
    });
    return () => { cancelled = true; };
  }, [signIn, nav, redirect]);

  // Click handler for our visible button — forwards to the GIS-rendered
  // button. GIS exposes its real button as the first <div role="button">
  // inside the slot (sometimes nested in iframes — we click the slot
  // itself as a fallback, which GIS also accepts).
  function clickHiddenGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      setGoogleError(
        'Google sign-in isn\'t configured on this deploy. Set VITE_GOOGLE_CLIENT_ID in the Vercel project and redeploy.',
      );
      return;
    }
    if (!googleReady || !hiddenGoogleSlotRef.current) {
      setGoogleError('Google is still loading — try again in a moment.');
      return;
    }
    setGoogleError('');
    const slot = hiddenGoogleSlotRef.current;
    const candidate =
      slot.querySelector('div[role="button"]')
      || slot.querySelector('div[tabindex]')
      || slot.querySelector('iframe')
      || slot.firstElementChild;
    if (candidate && typeof candidate.click === 'function') {
      candidate.click();
    } else {
      setGoogleError('Could not start Google sign-in. Try refreshing.');
    }
  }

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
    // Full-viewport white surface. Outside the Layout, so no sidebar
    // padding to negate — just bg-white + min-h-screen.
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-10">
      {/* Hidden GIS button — sized to match the visible one. Off-screen so
          the user only sees our styled button, but in the DOM so clicks
          can be forwarded into Google's OAuth flow. */}
      <div
        ref={hiddenGoogleSlotRef}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 360, height: 44 }}
      />

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

        {/* Custom-styled Google button. Clicks forward to the hidden GIS
            button so OAuth Just Works without us having to style the GIS
            iframe. */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={clickHiddenGoogle}
            disabled={googleBusy}
            className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-lg ring-1 ring-zinc-300 bg-white text-sm font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleGlyph className="h-5 w-5" />
            {googleBusy
              ? 'Signing you in…'
              : isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
          </button>
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
  );
}
