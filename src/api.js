// API client for the gospelar registration platform.
//
// Talks to the existing Express backend at backend/server.js (default port 5000).
// The event/registration/ticket endpoints listed in BACKEND_ENDPOINTS.md do not
// yet exist in the backend. Every call falls back to the localStorage-backed
// event store so the UI is fully usable today, with admin edits persisting
// across reloads. When the backend ships, the fallbacks stop firing.

import { store, newTicketCode, newGroupId } from './eventStore.js';
import { assignRooms, assignSeats } from './lib/assignment.js';

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

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

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

export const api = {
  // Events
  listEvents:  () => softCall(() => request('/api/events'),         () => store.listEvents()),
  getEvent:    (id) => softCall(() => request(`/api/events/${id}`), () => store.getEvent(id)),
  saveEvent:   (ev) => softCall(
    () => request(ev._isNew ? '/api/admin/events' : `/api/admin/events/${ev.id}`, {
      method: ev._isNew ? 'POST' : 'PUT',
      body: ev,
    }),
    () => store.upsertEvent({ ...ev, _isNew: undefined }),
  ),
  deleteEvent: (id) => softCall(
    () => request(`/api/admin/events/${id}`, { method: 'DELETE' }),
    () => { store.deleteEvent(id); return { ok: true }; },
  ),

  // Gospeler ID lookup — public endpoint that returns a user's profile by
  // their human-readable code (GSP-YYYY-XXXXXXXX). The Register page calls
  // this to auto-fill an attendee form so the user doesn't retype info that
  // already exists on their Gospeler ID. No fallback: if the backend is
  // unreachable the caller surfaces the error to the user.
  getGospelerByCode: (code) =>
    request(`/api/gospeler-id/code/${encodeURIComponent(String(code || '').trim())}`),

  // Registration — creates one ticket per attendee in the payload.
  // When `payload.group` is present, every ticket in the batch gets the same
  // freshly-minted `groupId` so the admin view can roll them up.
  register: (eventId, payload) => softCall(
    () => request(`/api/events/${eventId}/register`, { method: 'POST', body: payload }),
    () => {
      const ev = store.getEvent(eventId);
      const tt = ev?.ticketTypes.find((t) => t.id === payload.ticketTypeId);
      const ac = ev?.accommodation.find((a) => a.id === payload.accommodationId);
      const grp = payload.group || null;
      // Mint one groupId for the whole batch. Lead defaults to attendee 1's
      // email so a registrar who didn't fill the field still gets a sensible
      // contact stamped on every ticket.
      const groupId = grp ? newGroupId() : null;
      const groupLeadEmail = grp
        ? (grp.leadEmail || payload.attendees[0]?.email || null)
        : null;

      // Auto-assign rooms + seats once for the whole batch, so groups can
      // stay together. assignment.js reads existing tickets to avoid
      // collisions — that's why we run this before saving new ones. If the
      // caller supplied `seatLabels`, honour them and skip the auto-pick so
      // the user's manual picks win.
      const existing = store.listTickets();
      const rooms = assignRooms({
        event: ev, accommodation: ac, existingTickets: existing, count: payload.attendees.length,
      });
      const seats = (Array.isArray(payload.seatLabels) && payload.seatLabels.length === payload.attendees.length)
        ? payload.seatLabels.slice()
        : assignSeats({
            event: ev, existingTickets: existing, count: payload.attendees.length,
          });

      // Origin for the View-ticket CTA in the confirmation email. Falls back
      // to a bare relative path when window isn't available (SSR / tests) so
      // the email still has a clickable link once the recipient is on a real
      // browser session.
      const origin = typeof window !== 'undefined' && window.location
        ? window.location.origin
        : '';

      const tickets = payload.attendees.map((att, idx) => {
        const code = newTicketCode();
        return store.addTicket({
          code,
          eventId,
          eventTitle: ev?.title || '',
          // Event timing + venue carried on the ticket so the confirmation
          // email template can render the date/location lines without a
          // second DB lookup. Same fields the backend's ticketPayload reads.
          eventStartsAt: ev?.startsAt || null,
          eventLocation: ev?.location || null,
          ticketUrl:     origin ? `${origin}/tickets/${code}` : `/tickets/${code}`,
          ticketTypeId: payload.ticketTypeId,
          ticketTypeName: tt?.name || '',
          role: tt?.role || 'attendee',
          accommodationId: payload.accommodationId || null,
          accommodationName: ac?.name || null,
          roomLabel: rooms[idx] || '',
          seatLabel: seats[idx] || '',
          attendeeName: `${att.firstName} ${att.lastName}`.trim(),
          attendeeEmail: att.email,
          attendeePhone: att.phone || '',
          // Optional headshot. Mirrors what the backend stores in
          // event_tickets.attendee_profile.photo so the badge / ticket / PDF
          // renderers can read a single field regardless of fallback path.
          attendeePhoto: att.photo || null,
          // Full registration profile — every form field, so the
          // backend's buildFormPdf can render a filled "registration form"
          // PDF and the confirmation email can attach it. Mirrors
          // backend/event_tickets.attendee_profile.
          attendeeProfile: {
            title:              att.title || '',
            firstName:          att.firstName || '',
            lastName:           att.lastName || '',
            sex:                att.sex || '',
            maritalStatus:      att.maritalStatus || '',
            ageBracket:         att.ageBracket || '',
            phone:              att.phone || '',
            email:              att.email || '',
            city:               att.city || '',
            country:            att.country || '',
            region:             att.region || '',
            district:           att.district || '',
            assembly:           att.assembly || '',
            conventionLocation: att.conventionLocation || '',
            dietary:            att.dietary || '',
            otherInfo:          att.otherInfo || '',
            emergencyName:      att.emergencyName || '',
            emergencyPhone:     att.emergencyPhone || '',
            photo:              att.photo || null,
          },
          ageGroup: att.ageGroup || 'adult',
          dietary: att.dietary || '',
          emergencyName: att.emergencyName || '',
          emergencyPhone: att.emergencyPhone || '',
          referrer: payload.referrer || null,
          status: 'confirmed',
          purchasedAt: new Date().toISOString(),
          // Group fields — null on solo registrations, set on group ones.
          groupId,
          groupType:      grp?.type      || null,
          groupName:      grp?.name      || null,
          groupLeadEmail: groupLeadEmail,
        });
      });
      // Increment sold counts in the stored event so admin/dashboard updates.
      if (ev && tt) {
        tt.sold = (tt.sold || 0) + payload.attendees.length;
        if (ac) ac.taken = (ac.taken || 0) + payload.attendees.length;
        store.upsertEvent(ev);
      }
      return { tickets, primaryCode: tickets[0]?.code, groupId };
    },
  ),

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
  updateTicket: (code, patch) => softCall(
    () => request(`/api/tickets/${code}`, { method: 'PUT', body: patch }),
    () => store.updateTicket(code, patch),
  ),

  // Check-in
  checkIn: (code) => softCall(
    () => request(`/api/checkin/${code}`, { method: 'POST' }),
    () => {
      const t = store.markCheckedIn(code);
      if (!t) return { ok: false, error: 'Ticket not found' };
      return { ok: true, ticketCode: t.code, attendeeName: t.attendeeName, eventTitle: t.eventTitle };
    },
  ),

  // Churches (multi-tenant)
  listChurches: () => softCall(() => request('/api/churches'),       () => store.listChurches()),
  getChurch:    (id) => softCall(() => request(`/api/churches/${id}`), () => store.getChurch(id)),
  saveChurch:   (ch) => softCall(
    () => request(ch._isNew ? '/api/admin/churches' : `/api/admin/churches/${ch.id}`, {
      method: ch._isNew ? 'POST' : 'PUT',
      body: ch,
    }),
    () => store.upsertChurch({ ...ch, _isNew: undefined }),
  ),
  deleteChurch: (id) => softCall(
    () => request(`/api/admin/churches/${id}`, { method: 'DELETE' }),
    () => { store.deleteChurch(id); return { ok: true }; },
  ),

  // Admin
  adminEvents: () => softCall(() => request('/api/admin/events'), () => store.listEvents()),

  // Confirmation email — server sends a real email; while the backend is
  // missing we record the "send" in localStorage so the email-preview UI
  // can show what would have been sent.
  //
  // `to` is optional. Defaults to the ticket's own attendeeEmail; pass an
  // explicit recipient to CC the primary registrant on someone else's
  // ticket (useful when one person registers a whole group/family).
  sendConfirmationEmail: (ticketCode, to) => softCall(
    () => {
      // Pull the ticket from local store so we can hand the backend a fully
      // self-contained payload — backend has no events/tickets table yet, so
      // it can't look this up by code on its own.
      const t = store.listTickets().find((x) => x.code === ticketCode);
      if (!t) return Promise.resolve({ ok: false, error: 'Ticket not found' });
      const recipient = (to || t.attendeeEmail || '').trim();
      if (!recipient) return Promise.resolve({ ok: false, error: 'No recipient email' });
      return request(`/api/notifications/email-ticket`, {
        method: 'POST',
        body: { to: recipient, ticket: t },
      });
    },
    () => {
      const t = store.listTickets().find((x) => x.code === ticketCode);
      if (!t) return { ok: false, error: 'Ticket not found' };
      const recipient = (to || t.attendeeEmail || '').trim();
      if (!recipient) return { ok: false, error: 'No recipient email' };
      try {
        const key = 'gospelar.email-log.v1';
        const log = JSON.parse(localStorage.getItem(key) || '[]');
        log.unshift({ ticketCode, to: recipient, sentAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(log.slice(0, 100)));
      } catch {}
      return { ok: true, simulated: true };
    },
  ),

  // ── Notifications ────────────────────────────────────────────────────────
  // Frontend pushes the recipient + content to the backend; the backend logs
  // and dispatches via Resend (email) / Termii (SMS). Sender stays in the
  // backend so API keys never leak to the browser.

  // Send an SMS confirmation for one ticket. The backend resolves whether the
  // recipient is opted-in to SMS before sending.
  sendConfirmationSms: (ticketCode) => softCall(
    () => {
      const t = store.listTickets().find((x) => x.code === ticketCode);
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
  // reminder twice for the same ticket on a worker restart.
  scheduleReminder: ({ ticketCode, sendAt, kind, channels = ['email'] }) => softCall(
    () => {
      const t = store.listTickets().find((x) => x.code === ticketCode);
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
