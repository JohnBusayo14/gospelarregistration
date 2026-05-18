// API client for the gospelar registration platform.
//
// Talks to the existing Express backend at backend/server.js (default port 5000).
// The event/registration/ticket endpoints listed in BACKEND_ENDPOINTS.md do not
// yet exist in the backend. Every call falls back to the localStorage-backed
// event store so the UI is fully usable today, with admin edits persisting
// across reloads. When the backend ships, the fallbacks stop firing.

import { store } from './eventStore.js';

// API base resolution. Priority:
//   1. Build-time override via VITE_API_BASE (deploy-specific).
//   2. Local dev convenience: when the page itself runs on localhost we
//      assume the backend is the standard node server on :5000.
//   3. Anywhere else (mobile opening a shared link, production deploys
//      without an env var) we use same-origin and rely on either a reverse-
//      proxy mounting /api/* or the localStorage fallback. Defaulting to
//      `http://localhost:5000` here was the original bug — on a phone that
//      resolves to the phone itself, the fetch hangs/fails, and the page
//      sits on "Loading…" if the local fallback can't find the event.
function resolveApiBase() {
  const envBase = import.meta.env && import.meta.env.VITE_API_BASE;
  if (envBase) return envBase;
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return origin;
  }
  return 'http://localhost:5000';
}
const API_BASE = resolveApiBase();

// Hard ceiling for any API call. Without this, a deploy that serves the SPA
// HTML on /api/* (or just a hanging CDN) leaves promises pending forever and
// the registration page sits on "Loading…" with no way to fall back.
const REQUEST_TIMEOUT_MS = 6000;

// Auth bearer token, set by AuthContext on sign-in / sign-out. Attached to
// every authenticated request automatically so individual callers don't have
// to thread the token through. Cleared on sign-out to a falsy value.
let _authToken = null;
function setAuthToken(t) { _authToken = t || null; }

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const effectiveToken = token || _authToken;
  if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    // Normalize aborts and network failures into a shape isMissingBackend()
    // will recognize, so softCall flips us to the localStorage fallback
    // instead of bubbling a raw AbortError to the page.
    const err = new Error(e?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch');
    err.cause = e;
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // Same-origin deploys without a real /api server often return the SPA
  // index.html instead of a 404. That confuses the rest of the pipeline
  // (200 OK but JSON.parse explodes), so detect HTML responses up front
  // and treat them as "no backend here".
  const ctype = res.headers.get('content-type') || '';
  if (res.ok && !ctype.includes('application/json')) {
    const err = new Error('Failed to fetch');
    err.status = 404;
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function isMissingBackend(err) {
  return err.status === 404
      || err.status === 405
      || err.message === 'Failed to fetch'
      || err.message === 'Request timed out';
}

async function softCall(realCall, fallback) {
  try {
    return await realCall();
  } catch (e) {
    if (isMissingBackend(e)) return fallback();
    throw e;
  }
}

// Notification helpers accept either the full ticket object (always works,
// even on a device that's never seen this ticket) or a code (legacy form
// that looks up the ticket in localStorage). The localStorage lookup is the
// reason a fresh visitor wasn't getting confirmation emails — the backend
// had just minted the ticket server-side and the device had no cached copy
// to find. Passing the object straight through bypasses that lookup.
function resolveTicket(ticketOrCode) {
  if (!ticketOrCode) return null;
  if (typeof ticketOrCode === 'object') return ticketOrCode;
  return store.listTickets().find((x) => x.code === ticketOrCode) || null;
}

export const api = {
  // Lets the AuthContext push the current bearer token into the request
  // pipeline so every authenticated call carries it without callers having
  // to pass it explicitly. Pass null on sign-out.
  setAuthToken,

  // Auth — passwordless sign-in paths. These hit the real backend; there is
  // no localStorage fallback because a fake session is worse than no session.
  signInWithGoogle: (idToken) => request('/api/auth/google', {
    method: 'POST',
    body: { id_token: idToken },
  }),
  sendMagicLink: (email, redirect) => request('/api/auth/magic-link/send', {
    method: 'POST',
    body: { email, redirect },
  }),
  verifyMagicLink: (token) =>
    request(`/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`),

  // Events
  listEvents:  () => softCall(() => request('/api/events'),         () => store.listEvents()),
  getEvent:    (id) => softCall(() => request(`/api/events/${id}`), () => store.getEvent(id)),
  // saveEvent picks the endpoint based on the caller. The admin SaaS console
  // still uses /api/admin/events (x-admin-key gated); the new user-facing
  // CreateEvent page calls saveUserEvent below, which uses the Bearer-token
  // /api/events route so the creator_email gets stamped automatically.
  // Writes go straight to the backend — no localStorage fallback. A silent
  // fall-back would create on-device-only records that other devices can't
  // see; surfacing the error lets the caller retry instead.
  saveEvent:   (ev) => request(ev._isNew ? '/api/admin/events' : `/api/admin/events/${ev.id}`, {
    method: ev._isNew ? 'POST' : 'PUT',
    body: ev,
  }),
  deleteEvent: (id) => request(`/api/admin/events/${id}`, { method: 'DELETE' }),

  // User-facing event create/edit/delete — used by any signed-in user from
  // the Create Event page. Backend stamps creator_email from the session
  // token, scopes edits to the creator (or a super-admin override).
  saveUserEvent: (ev) => request(ev._isNew ? '/api/events' : `/api/events/${ev.id}`, {
    method: ev._isNew ? 'POST' : 'PUT',
    body: ev,
  }),
  deleteUserEvent: (id) => request(`/api/events/${id}`, { method: 'DELETE' }),
  listMyEvents:    () => request('/api/me/events'),

  // Gospeler ID lookup — public endpoint that returns a user's profile by
  // their human-readable code (GSP-YYYY-XXXXXXXX). The Register page calls
  // this to auto-fill an attendee form so the user doesn't retype info that
  // already exists on their Gospeler ID. No fallback: if the backend is
  // unreachable the caller surfaces the error to the user.
  getGospelerByCode: (code) =>
    request(`/api/gospeler-id/code/${encodeURIComponent(String(code || '').trim())}`),

  // Event payments — initialize / verify a paid registration via one of
  // the providers also used by the mobile subscription flow (Paystack,
  // Flutterwave, Stripe). The frontend flow is:
  //   1. call initializeEventPayment → get { authorizationUrl, reference,
  //      paymentSessionToken }
  //   2. stash the original registration payload + sessionToken in
  //      localStorage keyed by reference
  //   3. redirect to authorizationUrl
  //   4. provider redirects back to /payments/callback?reference=…&provider=…
  //   5. callback page calls verifyEventPayment → gets paymentProofToken
  //   6. callback page calls register() with paymentProofToken
  initializeEventPayment: ({
    eventId, provider, email, ticketTypeId, accommodationId, quantity, callbackUrl,
  }) => request(`/api/events/${eventId}/payments/initialize`, {
    method: 'POST',
    body: { provider, email, ticketTypeId, accommodationId, quantity, callbackUrl },
  }),

  verifyEventPayment: ({ reference, provider, paymentSessionToken }) =>
    request(`/api/events/payments/verify`, {
      method: 'POST',
      body: { reference, provider, paymentSessionToken },
    }),

  // Registration — creates one ticket per attendee in the payload.
  // When `payload.group` is present, every ticket in the batch gets the same
  // freshly-minted `groupId` so the admin view can roll them up.
  //
  // For paid ticket types, the caller must include `paymentProofToken` in
  // the payload (minted by api.verifyEventPayment). The backend register
  // handler rejects paid registrations without a matching proof token.
  //
  // No fallback. Used to silently simulate registration in localStorage when
  // the backend was unreachable, but that produced ghost tickets that only
  // lived on the registering device — invisible on every other device the
  // attendee signed in with. Surfacing the network error lets the user
  // retry instead of getting a fake confirmation.
  register: (eventId, payload) =>
    request(`/api/events/${eventId}/register`, { method: 'POST', body: payload }),

  // Tickets
  listTickets: (email) => softCall(
    () => request(`/api/tickets?email=${encodeURIComponent(email || '')}`),
    () => store.listTickets(email),
  ),
  getTicket: (code) => softCall(
    () => request(`/api/tickets/${code}`),
    () => store.listTickets().find((t) => t.code === code) || null,
  ),
  listEventTickets: (eventId) => softCall(
    () => request(`/api/events/${eventId}/tickets`),
    () => store.listTickets().filter((t) => t.eventId === eventId),
  ),
  updateTicket: (code, patch) =>
    request(`/api/tickets/${code}`, { method: 'PUT', body: patch }),

  // Check-in — strict. A localStorage-only check-in on the door-staff phone
  // would mark someone as admitted without telling the rest of the team.
  checkIn: (code) => request(`/api/checkin/${code}`, { method: 'POST' }),

  // Churches (multi-tenant)
  listChurches: () => softCall(() => request('/api/churches'),       () => store.listChurches()),
  getChurch:    (id) => softCall(() => request(`/api/churches/${id}`), () => store.getChurch(id)),
  saveChurch:   (ch) => request(ch._isNew ? '/api/admin/churches' : `/api/admin/churches/${ch.id}`, {
    method: ch._isNew ? 'POST' : 'PUT',
    body: ch,
  }),
  deleteChurch: (id) => request(`/api/admin/churches/${id}`, { method: 'DELETE' }),

  // Admin
  adminEvents: () => softCall(() => request('/api/admin/events'), () => store.listEvents()),

  // Confirmation email — server sends a real email; while the backend is
  // missing we record the "send" in localStorage so the email-preview UI
  // can show what would have been sent.
  //
  // Accepts either the full ticket object (preferred — works on any device,
  // even one that's never seen this ticket before) or a ticket code (legacy;
  // requires the ticket to exist in this browser's localStorage).
  //
  // `to` is optional. Defaults to the ticket's own attendeeEmail; pass an
  // explicit recipient to CC the primary registrant on someone else's
  // ticket (useful when one person registers a whole group/family).
  sendConfirmationEmail: (ticketOrCode, to) => softCall(
    () => {
      const t = resolveTicket(ticketOrCode);
      if (!t) return Promise.resolve({ ok: false, error: 'Ticket not found' });
      const recipient = (to || t.attendeeEmail || '').trim();
      if (!recipient) return Promise.resolve({ ok: false, error: 'No recipient email' });
      return request(`/api/notifications/email-ticket`, {
        method: 'POST',
        body: { to: recipient, ticket: t },
      });
    },
    () => {
      const t = resolveTicket(ticketOrCode);
      if (!t) return { ok: false, error: 'Ticket not found' };
      const recipient = (to || t.attendeeEmail || '').trim();
      if (!recipient) return { ok: false, error: 'No recipient email' };
      try {
        const key = 'gospelar.email-log.v1';
        const log = JSON.parse(localStorage.getItem(key) || '[]');
        log.unshift({ ticketCode: t.code, to: recipient, sentAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(log.slice(0, 100)));
      } catch {}
      return { ok: true, simulated: true };
    },
  ),

  // ── Notifications ────────────────────────────────────────────────────────
  // Frontend pushes the recipient + content to the backend; the backend logs
  // and dispatches via Resend (email) / Termii (SMS). Sender stays in the
  // backend so API keys never leak to the browser.

  // Send an SMS confirmation for one ticket. Accepts either the full ticket
  // object (preferred) or a code (legacy localStorage lookup). The backend
  // resolves whether the recipient is opted-in to SMS before sending.
  sendConfirmationSms: (ticketOrCode) => softCall(
    () => {
      const t = resolveTicket(ticketOrCode);
      if (!t || !t.attendeePhone) return Promise.resolve({ ok: false, error: 'No phone on ticket' });
      return request(`/api/notifications/sms-ticket`, {
        method: 'POST',
        body: { to: t.attendeePhone, ticket: t },
      });
    },
    () => ({ ok: true, simulated: true }),
  ),

  // Schedule a reminder for one ticket at a future time. `kind` labels the
  // reminder so the dedup key in notification_queue doesn't fire the same
  // reminder twice for the same ticket on a worker restart. Accepts either
  // a `ticket` object (preferred) or a `ticketCode` (legacy lookup).
  scheduleReminder: ({ ticket, ticketCode, sendAt, kind, channels = ['email'] }) => softCall(
    () => {
      const t = resolveTicket(ticket || ticketCode);
      if (!t) return Promise.resolve({ ok: false, error: 'Ticket not found' });
      return request(`/api/notifications/schedule-reminder`, {
        method: 'POST',
        body: { ticket: t, sendAt, kind, channels },
      });
    },
    () => ({ ok: true, simulated: true, queued: true }),
  ),

  // Admin broadcast — bulk send to a recipient list. The frontend collects
  // the list (e.g. all confirmed attendees of an event) and posts it whole.
  announceEvent: ({ eventId, subject, message, recipients, channels = ['email'] }) => softCall(
    () => request(`/api/admin/notifications/announce`, {
      method: 'POST',
      body: { eventId, subject, message, recipients, channels },
    }),
    () => ({ ok: true, simulated: true, sent: (recipients || []).length }),
  ),

  // Per-attendee preference toggle (opt out of reminders, opt in to SMS).
  // Defaults: email reminders ON, SMS OFF.
  updateNotificationPrefs: (email, prefs) => softCall(
    () => request(`/api/profile/${encodeURIComponent(email)}/notifications`, {
      method: 'PUT',
      body: prefs,
    }),
    () => {
      try {
        const key = 'gospelar.notif-prefs.v1';
        const all = JSON.parse(localStorage.getItem(key) || '{}');
        all[email.toLowerCase()] = { ...(all[email.toLowerCase()] || {}), ...prefs };
        localStorage.setItem(key, JSON.stringify(all));
      } catch {}
      return { ok: true, simulated: true };
    },
  ),
};

export { API_BASE };
