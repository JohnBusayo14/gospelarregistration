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

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadStored());

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
  }, []);

  const signOut = useCallback(() => {
    setAuth(null);
    saveStored(null);
  }, []);

  // Effective auth = real session if present, otherwise the bypass user
  // when AUTH_BYPASS is on. This way a real sign-in always takes precedence
  // (the user sees their own session and ticket history); only anonymous
  // visitors get the bypass.
  const effective = auth || (AUTH_BYPASS ? BYPASS_USER : null);
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
    isBypass: AUTH_BYPASS && !auth,
    signIn,
    signOut,
  }), [auth, effective, role, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
