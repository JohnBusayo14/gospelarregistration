// API client for the gospelar registration platform.
//
// Talks to the Express backend at backend/server.js. Every data call hits
// the backend directly — there is no localStorage fallback. Earlier versions
// silently cached writes (registrations, events, tickets, churches) in
// localStorage when the backend was unreachable; that produced device-local
// ghost records the same user couldn't see when they signed in elsewhere.
// Network errors now bubble to the caller so pages can show "retry" UI.

// API base resolution. Priority:
//   1. Build-time override via VITE_API_BASE (deploy-specific).
//   2. Local dev convenience: when the page itself runs on localhost we
//      assume the backend is the standard node server on :5000.
//   3. Anywhere else (mobile opening a shared link, production deploys
//      without an env var) we use same-origin and rely on a reverse-proxy
//      mounting /api/*. Hardcoding `http://localhost:5000` here was the
//      original bug — on a phone that resolves to the phone itself, the
//      fetch hangs/fails.
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
// HTML on /api/* (or just a hanging CDN) leaves promises pending forever.
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
    const err = new Error(e?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch');
    err.cause = e;
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // Same-origin deploys without a real /api server often return the SPA
  // index.html instead of a 404. Detect HTML responses up front so JSON.parse
  // doesn't crash.
  const ctype = res.headers.get('content-type') || '';
  if (res.ok && !ctype.includes('application/json')) {
    const err = new Error('Backend not reachable');
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

export const api = {
  // Lets the AuthContext push the current bearer token into the request
  // pipeline so every authenticated call carries it without callers having
  // to pass it explicitly. Pass null on sign-out.
  setAuthToken,

  // Auth — passwordless sign-in paths.
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

  // Sign-out — deletes this device's session row on the backend so other
  // devices signed in to the same account stay signed in. Tolerant of a
  // missing/invalid token; backend returns ok regardless.
  signOut: () => request('/api/auth/signout', { method: 'POST' }),

  // Events
  listEvents:  ()    => request('/api/events'),
  getEvent:    (id)  => request(`/api/events/${id}`),
  // saveEvent picks the endpoint based on the caller. The admin SaaS console
  // still uses /api/admin/events (x-admin-key gated); the user-facing
  // CreateEvent page calls saveUserEvent below, which uses the Bearer-token
  // /api/events route so the creator_email gets stamped automatically.
  saveEvent:   (ev)  => request(ev._isNew ? '/api/admin/events' : `/api/admin/events/${ev.id}`, {
    method: ev._isNew ? 'POST' : 'PUT',
    body: ev,
  }),
  deleteEvent: (id)  => request(`/api/admin/events/${id}`, { method: 'DELETE' }),

  // User-facing event create/edit/delete — used by any signed-in user from
  // the Create Event page. Backend stamps creator_email from the session
  // token, scopes edits to the creator (or a super-admin override).
  saveUserEvent:   (ev) => request(ev._isNew ? '/api/events' : `/api/events/${ev.id}`, {
    method: ev._isNew ? 'POST' : 'PUT',
    body: ev,
  }),
  deleteUserEvent: (id) => request(`/api/events/${id}`, { method: 'DELETE' }),
  listMyEvents:    ()   => request('/api/me/events'),

  // Gospeler ID lookup — public endpoint that returns a user's profile by
  // their human-readable code (GSP-YYYY-XXXXXXXX). The Register page calls
  // this to auto-fill an attendee form so the user doesn't retype info that
  // already exists on their Gospeler ID.
  getGospelerByCode: (code) =>
    request(`/api/gospeler-id/code/${encodeURIComponent(String(code || '').trim())}`),

  // Event payments — initialize / verify a paid registration via one of
  // the providers (Paystack, Flutterwave, Stripe). The frontend flow is:
  //   1. call initializeEventPayment → get { authorizationUrl, reference,
  //      paymentSessionToken }
  //   2. stash the original registration payload + sessionToken in
  //      localStorage keyed by reference (needed to survive the redirect)
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
  // the payload (minted by api.verifyEventPayment).
  register: (eventId, payload) =>
    request(`/api/events/${eventId}/register`, { method: 'POST', body: payload }),

  // Tickets
  listTickets:      (email)   => request(`/api/tickets?email=${encodeURIComponent(email || '')}`),
  getTicket:        (code)    => request(`/api/tickets/${code}`),
  listEventTickets: (eventId) => request(`/api/events/${eventId}/tickets`),
  updateTicket:     (code, patch) => request(`/api/tickets/${code}`, { method: 'PUT', body: patch }),

  // Check-in — strict. A localStorage-only check-in on the door-staff phone
  // would mark someone as admitted without telling the rest of the team.
  checkIn: (code) => request(`/api/checkin/${code}`, { method: 'POST' }),

  // Churches (multi-tenant)
  listChurches: ()    => request('/api/churches'),
  getChurch:    (id)  => request(`/api/churches/${id}`),
  saveChurch:   (ch)  => request(ch._isNew ? '/api/admin/churches' : `/api/admin/churches/${ch.id}`, {
    method: ch._isNew ? 'POST' : 'PUT',
    body: ch,
  }),
  deleteChurch: (id)  => request(`/api/admin/churches/${id}`, { method: 'DELETE' }),

  // Admin
  adminEvents: () => request('/api/admin/events'),

  // ── Notifications ────────────────────────────────────────────────────────
  // Frontend pushes the recipient + content to the backend; the backend logs
  // and dispatches via Resend (email) / Termii (SMS). Sender stays in the
  // backend so API keys never leak to the browser.
  //
  // All notification helpers require a full ticket object — no string-code
  // lookup. Callers that only have a code can fetch the ticket first via
  // api.getTicket(code).

  // `to` is optional. Defaults to the ticket's own attendeeEmail; pass an
  // explicit recipient to CC the primary registrant on someone else's
  // ticket (useful when one person registers a whole group/family).
  sendConfirmationEmail: (ticket, to) => {
    if (!ticket) return Promise.resolve({ ok: false, error: 'Ticket required' });
    const recipient = (to || ticket.attendeeEmail || '').trim();
    if (!recipient) return Promise.resolve({ ok: false, error: 'No recipient email' });
    return request(`/api/notifications/email-ticket`, {
      method: 'POST',
      body: { to: recipient, ticket },
    });
  },

  // Send an SMS confirmation for one ticket. The backend resolves whether
  // the recipient is opted-in to SMS before sending.
  sendConfirmationSms: (ticket) => {
    if (!ticket || !ticket.attendeePhone) {
      return Promise.resolve({ ok: false, error: 'No phone on ticket' });
    }
    return request(`/api/notifications/sms-ticket`, {
      method: 'POST',
      body: { to: ticket.attendeePhone, ticket },
    });
  },

  // Schedule a reminder for one ticket at a future time. `kind` labels the
  // reminder so the dedup key in notification_queue doesn't fire the same
  // reminder twice for the same ticket on a worker restart.
  scheduleReminder: ({ ticket, sendAt, kind, channels = ['email'] }) => {
    if (!ticket) return Promise.resolve({ ok: false, error: 'Ticket required' });
    return request(`/api/notifications/schedule-reminder`, {
      method: 'POST',
      body: { ticket, sendAt, kind, channels },
    });
  },

  // Admin broadcast — bulk send to a recipient list. The frontend collects
  // the list (e.g. all confirmed attendees of an event) and posts it whole.
  announceEvent: ({ eventId, subject, message, recipients, channels = ['email'] }) =>
    request(`/api/admin/notifications/announce`, {
      method: 'POST',
      body: { eventId, subject, message, recipients, channels },
    }),

  // Per-attendee preference toggle (opt out of reminders, opt in to SMS).
  // Defaults: email reminders ON, SMS OFF.
  updateNotificationPrefs: (email, prefs) =>
    request(`/api/profile/${encodeURIComponent(email)}/notifications`, {
      method: 'PUT',
      body: prefs,
    }),
};

export { API_BASE };
