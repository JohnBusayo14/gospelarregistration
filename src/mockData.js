// Mock data used as a fallback while backend endpoints are being built.
// Once the real endpoints in BACKEND_ENDPOINTS.md ship, these stop being hit.

// Multi-church: every event belongs to exactly one church (the host).
// In SaaS terms, this is the tenant boundary.
export const MOCK_CHURCHES = [
  {
    id: 'grace-collective',
    name: 'Grace Collective',
    slug: 'grace',
    contactEmail: 'hello@grace.church',
    logoColor: 'from-orange-500 to-rose-600',
    location: 'Denver, CO',
    tagline: 'A non-denominational church for the city.',
  },
  {
    id: 'sanctuary-house',
    name: 'Sanctuary House',
    slug: 'sanctuary',
    contactEmail: 'admin@sanctuary.house',
    logoColor: 'from-sky-500 to-indigo-700',
    location: 'Portland, OR',
    tagline: 'Worship, scripture, community.',
  },
  {
    id: 'cornerstone-fellowship',
    name: 'Cornerstone Fellowship',
    slug: 'cornerstone',
    contactEmail: 'office@cornerstonefellowship.org',
    logoColor: 'from-emerald-500 to-teal-700',
    location: 'Austin, TX',
    tagline: 'Anchored in scripture, sent for service.',
  },
];

// Roles drive printable badges and event-floor permissions.
export const TICKET_ROLES = [
  { id: 'attendee', label: 'Attendee', badgeColor: 'from-sky-500 to-indigo-600',     dot: 'bg-sky-500'     },
  { id: 'staff',    label: 'Staff',    badgeColor: 'from-emerald-500 to-teal-700',   dot: 'bg-emerald-500' },
  { id: 'speaker',  label: 'Speaker',  badgeColor: 'from-amber-500 to-rose-600',     dot: 'bg-amber-500'   },
];
export function roleLabel(id) {
  return TICKET_ROLES.find((r) => r.id === id)?.label || 'Attendee';
}
export function roleStyle(id) {
  return TICKET_ROLES.find((r) => r.id === id) || TICKET_ROLES[0];
}

// Accommodation taxonomy. `type` describes the kind of lodging;
// `sharing` is whether the bed/room is exclusive to one party.
export const ROOM_TYPES = [
  { id: 'hostel',    label: 'Hostel'    },
  { id: 'hotel',     label: 'Hotel'     },
  { id: 'dormitory', label: 'Dormitory' },
  { id: 'cabin',     label: 'Cabin'     },
  { id: 'lodge',     label: 'Lodge'     },
  { id: 'home-stay', label: 'Home stay' },
  { id: 'tent',      label: 'Tent / camping' },
  { id: 'none',      label: 'No accommodation' },
];

export function roomTypeLabel(id) {
  return ROOM_TYPES.find((t) => t.id === id)?.label || id || '—';
}

// Group registration: church groups (small group / cell / fellowship), families,
// and departments (choir, ushering, media, etc.) can register together. The
// `id` lands on every ticket as `groupType`; `chip` is the colour class used on
// list/detail badges so a viewer can tell apart the three kinds at a glance.
export const GROUP_TYPES = [
  { id: 'church',     label: 'Church group', emoji: '⛪',  chip: 'bg-indigo-50 text-indigo-700' },
  { id: 'family',     label: 'Family',       emoji: '👨‍👩‍👧', chip: 'bg-rose-50 text-rose-700'    },
  { id: 'department', label: 'Department',   emoji: '🎵', chip: 'bg-amber-50 text-amber-700'  },
];

export function groupTypeStyle(id) {
  return GROUP_TYPES.find((g) => g.id === id) || null;
}

export const GRADIENT_PRESETS = [
  { id: 'sunset',  label: 'Sunset',     classes: 'from-orange-400 to-rose-500'   },
  { id: 'ocean',   label: 'Ocean',      classes: 'from-sky-400 to-indigo-600'    },
  { id: 'forest',  label: 'Forest',     classes: 'from-emerald-400 to-teal-600'  },
  { id: 'royal',   label: 'Royal',      classes: 'from-violet-500 to-fuchsia-600'},
  { id: 'dawn',    label: 'Dawn',       classes: 'from-amber-400 to-pink-500'    },
  { id: 'midnight',label: 'Midnight',   classes: 'from-slate-700 to-slate-900'   },
];

export const MOCK_EVENTS = [
  {
    id: 'retreat-2026-spring',
    churchId: 'grace-collective',
    title: 'Spring Renewal Retreat 2026',
    tagline: 'Three days of worship, teaching, and rest',
    startsAt: '2026-06-12T17:00:00Z',
    endsAt:   '2026-06-14T15:00:00Z',
    registrationDeadline: '2026-06-05T23:59:00Z',
    location: 'Pine Ridge Conference Center, Colorado',
    coverColor: 'from-orange-400 to-rose-500',
    bannerUrl: '',
    summary:
      'Join believers from across the region for a weekend devoted to scripture, worship, and quiet renewal. Sessions led by Pastor M. Adebayo and worship by The Sanctuary Collective.',
    schedule: [
      { day: 'Friday',   items: ['5:00 PM — Check-in opens', '7:30 PM — Opening worship'] },
      { day: 'Saturday', items: ['9:00 AM — Morning session', '2:00 PM — Workshops', '7:00 PM — Evening service'] },
      { day: 'Sunday',   items: ['10:00 AM — Closing worship', '12:30 PM — Lunch & departure'] },
    ],
    ticketTypes: [
      { id: 'standard',  name: 'Standard',  role: 'attendee', priceCents: 14900, capacity: 180, sold: 142, description: 'Full retreat access, meals included.' },
      { id: 'student',   name: 'Student',   role: 'attendee', priceCents:  9900, capacity:  40, sold:  31, description: 'Valid student ID required at check-in.' },
      { id: 'commuter',  name: 'Commuter',  role: 'attendee', priceCents: 11900, capacity:  20, sold:  14, description: 'Sessions + lunch; no overnight stay.' },
      { id: 'staff',     name: 'Staff',     role: 'staff',    priceCents:     0, capacity:  20, sold:   8, description: 'Volunteers, hosts, retreat team.' },
      { id: 'speaker',   name: 'Speaker',   role: 'speaker',  priceCents:     0, capacity:   4, sold:   2, description: 'Session speakers and worship leaders.' },
    ],
    accommodation: [
      { id: 'lodge-shared',  name: 'Lodge — Shared room',   type: 'lodge', sharing: 'shared',  bedsPerRoom: 4,  priceCents: 0,     capacity: 80,  taken: 62, description: '4 per room, bunk beds.' },
      { id: 'lodge-private', name: 'Lodge — Private room',  type: 'lodge', sharing: 'private', bedsPerRoom: 2,  priceCents: 6000,  capacity: 40,  taken: 28, description: '2 per room, queen beds.' },
      { id: 'cabin',         name: 'Cabin (family)',        type: 'cabin', sharing: 'private', bedsPerRoom: 6,  priceCents: 12000, capacity: 20,  taken: 11, description: 'Sleeps up to 6.' },
      { id: 'commuter-none', name: 'Commuting — no room',   type: 'none',  sharing: 'shared',  bedsPerRoom: 0,  priceCents: 0,     capacity: 100, taken: 32, description: 'Selected automatically for commuter tickets.' },
    ],
  },
  {
    id: 'youth-camp-2026',
    churchId: 'sanctuary-house',
    title: 'Youth Camp: Anchored',
    tagline: 'A 5-day camp for teens 13–18',
    startsAt: '2026-07-20T14:00:00Z',
    endsAt:   '2026-07-24T11:00:00Z',
    registrationDeadline: '2026-07-10T23:59:00Z',
    location: 'Lakeside Camp, Oregon',
    coverColor: 'from-sky-400 to-indigo-600',
    bannerUrl: '',
    summary:
      'Five days at Lakeside — devotions, sports, lake swim, late-night chats, and powerful evening services. Adult chaperones included.',
    schedule: [
      { day: 'Mon', items: ['Arrival & cabins'] },
      { day: 'Tue', items: ['Bible track + sports'] },
      { day: 'Wed', items: ['Lake day + worship night'] },
      { day: 'Thu', items: ['Service project + bonfire'] },
      { day: 'Fri', items: ['Send-off breakfast'] },
    ],
    ticketTypes: [
      { id: 'camper', name: 'Camper (13–18)', role: 'attendee', priceCents: 22500, capacity: 100, sold: 58, description: 'Includes all meals, lodging, and activities.' },
      { id: 'leader', name: 'Adult leader',   role: 'staff',    priceCents: 15000, capacity:  20, sold:   6, description: 'Background check required.' },
    ],
    accommodation: [
      { id: 'cabin-boys',  name: 'Boys cabin',   type: 'cabin', sharing: 'shared', bedsPerRoom: 12, priceCents: 0, capacity: 60, taken: 32, description: 'Bunk beds, 12 per cabin.' },
      { id: 'cabin-girls', name: 'Girls cabin',  type: 'cabin', sharing: 'shared', bedsPerRoom: 12, priceCents: 0, capacity: 60, taken: 32, description: 'Bunk beds, 12 per cabin.' },
    ],
  },
  {
    id: 'mens-breakfast-jun',
    churchId: 'grace-collective',
    title: 'Men’s Breakfast & Teaching',
    tagline: 'Monthly gathering — open to all',
    startsAt: '2026-06-07T08:00:00Z',
    endsAt:   '2026-06-07T10:00:00Z',
    registrationDeadline: '2026-06-06T23:59:00Z',
    location: 'Grace Hall, Main Campus',
    coverColor: 'from-emerald-400 to-teal-600',
    bannerUrl: '',
    summary: 'Breakfast served at 8. Short teaching at 8:45 followed by table conversation.',
    schedule: [{ day: 'Sat', items: ['8:00 AM — Breakfast', '8:45 AM — Teaching', '9:30 AM — Tables'] }],
    ticketTypes: [
      { id: 'free', name: 'General', role: 'attendee', priceCents: 0, capacity: 60, sold: 22, description: 'Free — please register so we can plan food.' },
    ],
    accommodation: [],
    // Sit-down event — system auto-assigns seats at registration.
    seating: { rows: 6, seatsPerRow: 10 },
  },
];

export const MOCK_TICKETS = [
  {
    code: 'TKT-9F2K4A',
    eventId: 'retreat-2026-spring',
    eventTitle: 'Spring Renewal Retreat 2026',
    ticketTypeId: 'standard',
    ticketTypeName: 'Standard',
    role: 'attendee',
    accommodationId: 'lodge-private',
    accommodationName: 'Lodge — Private room',
    attendeeName: 'Sade Okonkwo',
    attendeeEmail: 'sade@example.com',
    status: 'confirmed',
    purchasedAt: '2026-05-02T14:21:00Z',
  },
  {
    code: 'TKT-3B8X1Z',
    eventId: 'mens-breakfast-jun',
    eventTitle: 'Men’s Breakfast & Teaching',
    ticketTypeId: 'free',
    ticketTypeName: 'General',
    role: 'attendee',
    accommodationId: null,
    accommodationName: null,
    attendeeName: 'Daniel Park',
    attendeeEmail: 'daniel@example.com',
    status: 'confirmed',
    purchasedAt: '2026-05-10T09:05:00Z',
  },
];

// Computed helpers used by both store and pages — keep totals consistent.
export function totalSeatsTotal(ev) {
  return (ev.ticketTypes || []).reduce((s, t) => s + (t.capacity || 0), 0);
}
export function totalSeatsTaken(ev) {
  return (ev.ticketTypes || []).reduce((s, t) => s + (t.sold || 0), 0);
}
export function totalBeds(ev) {
  return (ev.accommodation || []).reduce((s, a) => s + (a.capacity || 0), 0);
}
export function bedsFilled(ev) {
  return (ev.accommodation || []).reduce((s, a) => s + (a.taken || 0), 0);
}

export function lowestPriceLabel(ev) {
  const prices = (ev.ticketTypes || []).map((t) => t.priceCents || 0);
  if (prices.length === 0) return 'Free';
  const min = Math.min(...prices);
  if (min === 0) return 'Free';
  return `From $${(min / 100).toFixed(0)}`;
}
