import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

// Single source of truth for "who is signed in". Persists to localStorage so
// a phone restart doesn't sign the user out, and rehydrates on mount. The
// session token is included in every authenticated API call via api.js's
// `setAuthToken` hook (set below).
//
// Two passwordless sign-in paths feed this:
//   - Google Identity Services  → /api/auth/google
//   - Magic-link email          → /api/auth/magic-link/{send,verify}
// Both return the same shape: { user, profile, token }. We don't care which
// one the caller used.

const STORAGE_KEY = 'gospelar.auth.v1';

// ⚠️  TEMPORARY AUTH BYPASS — development convenience.
// When ON, anyone visiting the site is treated as a signed-in super-admin
// so every gated route is reachable without going through Google / magic-
// link sign-in. Real sign-in still works (and takes precedence over the
// bypass) if someone signs in for real.
//
// To turn OFF:
//   - Set VITE_AUTH_BYPASS=off at build time and redeploy, OR
//   - Flip the constant below to `false` and redeploy.
// Default is ON so the toggle is visible at a glance.
const AUTH_BYPASS = String(import.meta.env.VITE_AUTH_BYPASS ?? 'on').toLowerCase() !== 'off';
const BYPASS_USER = {
  user:    { id: 'bypass-user', email: 'tester@gospelar.local', full_name: 'Test User', role: 'admin' },
  profile: null,
  // Token shape that won't match any real backend session — UI navigation
  // works, but server calls that require a valid session will still fail.
  // That's intentional: the bypass is for UI testing, not API access.
  token:   'BYPASS-DEV-ONLY',
};

const AuthContext = createContext(null);

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user?.email || !parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else       localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// Sentinel that flags "the user explicitly signed out", stored in
// sessionStorage so it survives navigations but resets when the tab is
// closed. While set, the AUTH_BYPASS no longer kicks in — otherwise
// clicking Sign Out would clear the real session and immediately log the
// user back in as the bypass stub. Reading + writing through helpers so
// callers don't have to know the storage key.
const BYPASS_OFF_KEY = 'gospelar.auth.bypass-off.v1';
function readBypassOff() {
  try { return sessionStorage.getItem(BYPASS_OFF_KEY) === '1'; } catch { return false; }
}
function writeBypassOff(v) {
  try {
    if (v) sessionStorage.setItem(BYPASS_OFF_KEY, '1');
    else   sessionStorage.removeItem(BYPASS_OFF_KEY);
  } catch { /* private mode / quota — non-fatal */ }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadStored());
  // When true, the AUTH_BYPASS stops applying for this tab session. Flipped
  // by signOut(); reset by signIn() and on tab close.
  const [bypassOff, setBypassOff] = useState(() => readBypassOff());

  // Wire/unwire the token onto the api client so every authenticated request
  // carries `Authorization: Bearer <token>` without each caller having to
  // pass it explicitly. Re-runs on every auth change.
  useEffect(() => {
    api.setAuthToken(auth?.token || null);
  }, [auth]);

  const signIn = useCallback((payload) => {
    // payload is the backend's { user, profile, token, ... } shape — the same
    // for /api/auth/google, /api/auth/magic-link/verify, and /api/auth/login.
    const next = { user: payload.user, profile: payload.profile || null, token: payload.token };
    setAuth(next);
    saveStored(next);
    // A real sign-in re-enables the bypass for any future signOut → the
    // user can still flip back to anonymous-bypass for testing.
    setBypassOff(false);
    writeBypassOff(false);
  }, []);

  const signOut = useCallback(() => {
    setAuth(null);
    saveStored(null);
    // Disable the bypass for the rest of this tab session — otherwise the
    // BYPASS_USER fallback in `effective` below would re-authenticate the
    // user as the test stub immediately after sign-out.
    setBypassOff(true);
    writeBypassOff(true);
  }, []);

  // Effective auth = real session if present, otherwise the bypass user
  // (when AUTH_BYPASS is on AND the user hasn't explicitly signed out this
  // tab session). A real sign-in always takes precedence; signing out
  // disables the bypass until the next refresh / new tab / real sign-in.
  const bypassActive = AUTH_BYPASS && !bypassOff;
  const effective = auth || (bypassActive ? BYPASS_USER : null);
  const role = effective?.user?.role || '';
  const value = useMemo(() => ({
    user: effective?.user || null,
    profile: effective?.profile || null,
    token: effective?.token || null,
    isAuthenticated: !!effective?.token,
    // Two role tiers, matching the menu the user spec calls for:
    //   isSuperAdmin — full nav (Home, Events, Tickets, Dashboard, Admin,
    //                 Check-In, Create Event). Flipped via the
    //                 backend/scripts/promote-admin.js CLI.
    //   isNormalUser — signed in but not admin: Home, Tickets, Dashboard,
    //                 Create Event. Everyone gets this on first sign-in.
    // `isEndUser` kept as an alias of isNormalUser so existing call sites
    // (Tickets.jsx, Dashboard.jsx) keep working without a sweep.
    isSuperAdmin: !!effective?.token && role === 'admin',
    isNormalUser: !!effective?.token && role !== 'admin',
    isEndUser:    !!effective?.token && role !== 'admin',
    // True when the current session is the bypass stub rather than a real
    // sign-in. Useful for a future "Dev mode" banner; doesn't change
    // routing or gating today.
    isBypass: bypassActive && !auth,
    signIn,
    signOut,
  }), [auth, effective, role, bypassActive, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
