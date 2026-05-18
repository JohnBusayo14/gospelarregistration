import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, ArrowRight, CheckCircle2, CalendarDays, MapPin, Ticket as TicketIcon,
  Sparkles,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';

// Sign-in screen — split-screen layout inspired by Fillout's signup design.
// Form lives on the left, a decorative right-hand panel previews what the
// signed-in surface looks like. Right panel is hidden on mobile so the form
// takes the full viewport.
//
// Two passwordless paths (unchanged):
//   1. Google Sign-In — GIS button rendered into a ref.
//   2. Magic-link email — yellow primary button matching the reference design.

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

// Inline Google "G" mark — used as a fallback when GIS doesn't render its
// own button (no client id configured). Keeps the visual consistent.
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

  // Toggle between sign-in and sign-up framing. Both flows are identical
  // (passwordless), but the copy + emphasis change so visitors see a
  // recognisable "Create your account" page when arriving fresh.
  const initialMode = params.get('mode') === 'signin' ? 'signin' : 'signup';
  const [mode, setMode] = useState(initialMode);
  const isSignUp = mode === 'signup';

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

  // Render the Google button into the slot once GIS is loaded.
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
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: isSignUp ? 'signup_with' : 'signin_with',
        logo_alignment: 'left',
        width: 360,
      });
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
    // Negate the Layout's outer padding so the right panel can bleed to the
    // viewport edge. The Layout main wrapper has `mx-auto max-w-6xl px-4
    // sm:px-6 py-8 sm:py-14`; the negative margins counter just the padding.
    <div className="-mx-4 sm:-mx-6 -my-8 sm:-my-14 min-h-[100vh] flex">
      <div className="grid grid-cols-1 lg:grid-cols-2 w-full">

        {/* ─── LEFT — FORM ─────────────────────────────────────────────── */}
        <div className="bg-white flex flex-col px-6 sm:px-12 lg:px-16 py-8 lg:py-10 min-h-[100vh]">
          {/* Brand mark top-left */}
          <Link to="/" className="inline-flex items-center gap-2 self-start group">
            <span className="font-display text-2xl font-extrabold tracking-tight text-zinc-900">
              Gospelar
            </span>
            <span className="text-sm text-zinc-500">
              by <span className="font-semibold text-zinc-700">Church</span>
            </span>
          </Link>

          {/* Form — centered vertically in the remaining space. */}
          <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto pt-12 lg:pt-0">
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

            {/* Google button. When GIS loads its own button replaces the
                fallback markup inside the ref. */}
            <div className="mt-8 space-y-3">
              {GOOGLE_CLIENT_ID ? (
                <div
                  ref={googleSlotRef}
                  className={`flex justify-center min-h-[44px] ${googleBusy ? 'opacity-60 pointer-events-none' : ''}`}
                />
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg ring-1 ring-zinc-300 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                  title="Google sign-in not configured"
                >
                  <GoogleGlyph className="h-5 w-5" />
                  {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
                </button>
              )}
              {googleBusy && <p className="text-xs text-zinc-500 text-center">Signing you in…</p>}
              {googleError && <p className="text-xs text-rose-600 text-center">{googleError}</p>}
              {!GOOGLE_CLIENT_ID && (
                <p className="text-[10px] text-zinc-400 text-center">
                  Google sign-in becomes active once <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span> is configured.
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3 text-xs font-medium text-zinc-400">
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

            <p className="mt-8 text-[11px] text-zinc-500 leading-relaxed">
              By using Gospelar, you are agreeing to our{' '}
              <Link to="/" className="underline underline-offset-2 hover:text-zinc-700">Privacy Policy</Link>
              {' '}and{' '}
              <Link to="/" className="underline underline-offset-2 hover:text-zinc-700">Terms</Link>.
            </p>
          </div>
        </div>

        {/* ─── RIGHT — VISUAL PANEL ──────────────────────────────────────
            Hidden on phones/tablets; the form takes the whole viewport. */}
        <aside className="hidden lg:flex relative overflow-hidden min-h-[100vh] m-3 rounded-3xl">
          {/* Painterly gradient backdrop reminiscent of the reference image's
              forest scene, layered with translucent orbs for depth. */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100" />
          <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-white/40 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-emerald-300/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-emerald-700/30 to-transparent" />

          <div className="relative z-10 flex flex-col p-10 xl:p-12 w-full">
            {/* Top logo strip — replaces Fillout's BOMBAS/Athletic/etc. with
                the kinds of churches & organisations Gospelar is built for. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-white/90 font-display font-extrabold tracking-wide text-sm xl:text-base">
              <span>Grace Collective</span>
              <span>Cornerstone</span>
              <span>The Vine</span>
              <span>City Light</span>
              <span>Berea</span>
            </div>

            {/* Floating preview card — a mock app window like the Fillout
                reference, but populated with a Gospelar event preview so
                the visitor sees what they'll be using. */}
            <div className="mt-10 flex-1 flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 overflow-hidden">
                {/* Window chrome */}
                <div className="h-9 bg-zinc-50 border-b border-zinc-200/80 px-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-3 text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
                    Gospelar · Dashboard
                  </span>
                </div>

                <div className="flex">
                  {/* Mock sidebar */}
                  <div className="w-12 bg-zinc-50 border-r border-zinc-200/80 py-4 flex flex-col items-center gap-3">
                    <span className="h-7 w-7 rounded-lg bg-zinc-900 grid place-items-center text-white font-display font-extrabold text-xs">
                      G
                    </span>
                    <span className="h-5 w-5 rounded-md bg-zinc-200" />
                    <span className="h-5 w-5 rounded-md bg-zinc-200" />
                    <span className="h-5 w-5 rounded-md bg-amber-300" />
                    <span className="h-5 w-5 rounded-md bg-zinc-200" />
                  </div>

                  {/* Mock content — a faux ticket card */}
                  <div className="flex-1 p-5 space-y-3 bg-white">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                        Upcoming event
                      </span>
                    </div>
                    <div className="relative rounded-xl bg-zinc-900 text-white p-4 overflow-hidden">
                      <div className="absolute inset-y-2 left-7 w-px border-l border-dashed border-white/25" />
                      <div className="pl-3 space-y-2">
                        <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">
                          Gospelar
                        </div>
                        <div className="font-display text-lg font-extrabold tracking-tight leading-tight">
                          Spring Renewal Retreat
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/70">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" /> Jun 12
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Hilltop Lodge
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <TicketIcon className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-semibold text-zinc-700">2 tickets confirmed</span>
                    </div>

                    {/* Tiny faux rows */}
                    <div className="space-y-1.5 pt-1">
                      <div className="h-2 rounded bg-zinc-100 w-3/4" />
                      <div className="h-2 rounded bg-zinc-100 w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-white/90 text-sm font-medium max-w-md">
              Built for churches, retreats, and gatherings — issue tickets, take payment, and check people in from any device.
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}
