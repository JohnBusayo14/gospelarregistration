// localStorage-backed event store. Seeded from MOCK_EVENTS on first load so
// admin edits feel real during dev. When the backend ships, swap the calls in
// api.js to hit the real endpoints — the page-level code stays the same.

import { MOCK_CHURCHES, MOCK_EVENTS, MOCK_TICKETS } from './mockData.js';

const EVENTS_KEY   = 'gospelar.events.v1';
const TICKETS_KEY  = 'gospelar.tickets.v1';
const CHURCHES_KEY = 'gospelar.churches.v1';

function safeParse(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seed;
  } catch {
    return seed;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const store = {
  listEvents() {
    return safeParse(EVENTS_KEY, MOCK_EVENTS);
  },
  getEvent(id) {
    return store.listEvents().find((e) => e.id === id) || null;
  },
  upsertEvent(ev) {
    const all = store.listEvents();
    const idx = all.findIndex((e) => e.id === ev.id);
    if (idx >= 0) all[idx] = ev; else all.push(ev);
    save(EVENTS_KEY, all);
    return ev;
  },
  deleteEvent(id) {
    const all = store.listEvents().filter((e) => e.id !== id);
    save(EVENTS_KEY, all);
  },

  listTickets(email) {
    const all = safeParse(TICKETS_KEY, MOCK_TICKETS);
    return email ? all.filter((t) => t.attendeeEmail === email) : all;
  },
  addTicket(ticket) {
    const all = safeParse(TICKETS_KEY, MOCK_TICKETS);
    all.unshift(ticket);
    save(TICKETS_KEY, all);
    return ticket;
  },
  markCheckedIn(code) {
    const all = safeParse(TICKETS_KEY, MOCK_TICKETS);
    const t = all.find((x) => x.code === code);
    if (!t) return null;
    t.status = 'checked-in';
    t.checkedInAt = new Date().toISOString();
    save(TICKETS_KEY, all);
    return t;
  },
  updateTicket(code, patch) {
    const all = safeParse(TICKETS_KEY, MOCK_TICKETS);
    const t = all.find((x) => x.code === code);
    if (!t) return null;
    // Whitelist editable fields so callers can't poison status/code/timestamps.
    const editable = ['attendeeName', 'attendeeEmail', 'attendeePhone', 'dietary', 'emergencyName', 'emergencyPhone', 'ageGroup'];
    for (const k of editable) if (k in patch) t[k] = patch[k];
    t.updatedAt = new Date().toISOString();
    save(TICKETS_KEY, all);
    return t;
  },

  // — Churches (SaaS multi-tenant root) —
  listChurches() {
    return safeParse(CHURCHES_KEY, MOCK_CHURCHES);
  },
  getChurch(id) {
    return store.listChurches().find((c) => c.id === id) || null;
  },
  upsertChurch(ch) {
    const all = store.listChurches();
    const idx = all.findIndex((c) => c.id === ch.id);
    if (idx >= 0) all[idx] = ch; else all.push(ch);
    save(CHURCHES_KEY, all);
    return ch;
  },
  deleteChurch(id) {
    const all = store.listChurches().filter((c) => c.id !== id);
    save(CHURCHES_KEY, all);
  },

  reset() {
    localStorage.removeItem(EVENTS_KEY);
    localStorage.removeItem(TICKETS_KEY);
    localStorage.removeItem(CHURCHES_KEY);
  },
};

export function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function newTicketCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = 'TKT-';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Group registration: every ticket created in one POST that includes a group
// payload gets the same `groupId`, which lets the admin view roll them up.
// Format mirrors ticket codes — short, no ambiguous chars — so it's easy to
// reference in conversation.
export function newGroupId() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = 'GRP-';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
