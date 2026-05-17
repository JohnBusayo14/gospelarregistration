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

  const value = useMemo(() => ({
    user: auth?.user || null,
    profile: auth?.profile || null,
    token: auth?.token || null,
    isAuthenticated: !!auth?.token,
    // "End-user" role = the restricted-view audience: signed-in but not
    // staff/admin. Used by Layout to swap the nav and by routes that should
    // 403 admin surfaces for these users.
    isEndUser: !!auth?.token && !['admin', 'teacher', 'staff'].includes(auth?.user?.role || ''),
    signIn,
    signOut,
  }), [auth, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
