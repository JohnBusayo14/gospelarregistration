# Backend endpoints required by the registration app

The existing `backend/server.js` does **not** yet have event / registration /
ticket / check-in endpoints — its `check-in` routes are for Bible reading
streaks, not event check-in. The frontend talks to `http://localhost:5000`
(override with `VITE_API_BASE`) and falls back to a localStorage-backed
event store on 404. Admin edits persist locally during dev and the UI is
fully usable today.

## Endpoints to add

### Public

| Method | Path                              | Body / query                          | Returns                          |
| ------ | --------------------------------- | ------------------------------------- | -------------------------------- |
| GET    | `/api/churches`                   | —                                     | `Church[]`                       |
| GET    | `/api/churches/:id`               | —                                     | `Church`                         |
| GET    | `/api/events`                     | `?churchId=` (optional)               | `Event[]`                        |
| GET    | `/api/events/:id`                 | —                                     | `Event`                          |
| POST   | `/api/events/:id/register`        | `RegisterPayload`                     | `{ tickets: Ticket[], primaryCode }` |
| GET    | `/api/tickets?email=`             | `email` (query)                       | `Ticket[]`                       |
| GET    | `/api/tickets/:code`              | —                                     | `Ticket`                         |
| PUT    | `/api/tickets/:code`              | Partial attendee fields               | `Ticket` (updated)               |
| GET    | `/api/events/:id/tickets`         | — (admin or own-email)                | `Ticket[]`                       |

### Email

| Method | Path                          | Body                | Returns                |
| ------ | ----------------------------- | ------------------- | ---------------------- |
| POST   | `/api/tickets/:code/email`    | —                   | `{ ok: true, messageId? }` |

The frontend fires this automatically after a successful `POST /register`
(once per attendee in the payload) and exposes a "Re-send email" button on
the ticket detail page. The server should render the same content shown in
`src/pages/EmailPreview.jsx` (subject: `You're registered — <event title>`,
sender: `tickets@gospelar.app`). Include the QR PNG inline (`<img src="cid:qr">`)
and as an attachment so attendees can save it.

### Staff / admin (require auth, scoped to one church / tenant)

| Method | Path                          | Body                 | Returns                          |
| ------ | ----------------------------- | -------------------- | -------------------------------- |
| POST   | `/api/checkin/:code`          | —                    | `{ ok, ticketCode, attendeeName, eventTitle }` |
| GET    | `/api/admin/events`           | —                    | `Event[]` (with sold/taken counts populated) |
| POST   | `/api/admin/events`           | `Event` (no `id` ok) | `Event`                          |
| PUT    | `/api/admin/events/:id`       | `Event`              | `Event`                          |
| DELETE | `/api/admin/events/:id`       | —                    | `{ ok: true }`                   |
| POST   | `/api/admin/churches`         | `Church`             | `Church`                         |
| PUT    | `/api/admin/churches/:id`     | `Church`             | `Church`                         |
| DELETE | `/api/admin/churches/:id`     | —                    | `{ ok: true }`                   |

## Shapes

```ts
type Church = {
  id: string;             // slug also acts as id (e.g. "grace-collective")
  name: string;
  slug: string;           // short, URL-safe handle for /c/:slug routes
  contactEmail: string;
  location: string;
  tagline: string;
  logoColor: string;      // tailwind gradient classes for brand
};

type Event = {
  id: string;                       // slugify(title) ok for now
  churchId: string;                 // FK → churches.id — the tenant root
  title: string;
  tagline: string;
  summary: string;
  location: string;
  startsAt: string;                 // ISO
  endsAt:   string;                 // ISO
  registrationDeadline: string;     // ISO — past this, /register POST should 409
  coverColor: string;               // tailwind gradient classes, e.g. "from-orange-400 to-rose-500"
  bannerUrl: string;                // optional image URL; overlays the gradient
  schedule: { day: string; items: string[] }[];
  ticketTypes: TicketType[];        // at least one
  accommodation: Accommodation[];   // optional; empty array = skip the step
  // Optional seating chart — when set, the server auto-assigns sequential
  // `seatLabel` values at registration (e.g. "A1", "B12"). Leave undefined
  // for un-seated events (most retreats).
  seating?: { rows: number; seatsPerRow: number };
};

type TicketType = {
  id: string;
  name: string;                     // "Standard", "Student", "Commuter"
  role: 'attendee' | 'staff' | 'speaker';  // drives badge style and floor permissions
  priceCents: number;               // 0 = free
  capacity: number;
  sold: number;                     // server-computed
  description: string;
};

type Accommodation = {
  id: string;
  name: string;                     // "Lodge — Private room"
  type:    'hostel' | 'hotel' | 'dormitory' | 'cabin' | 'lodge' | 'home-stay' | 'tent' | 'none';
  sharing: 'shared' | 'private';
  bedsPerRoom: number;              // drives auto room assignment; physical rooms = ceil(capacity / bedsPerRoom)
  priceCents: number;               // add-on, charged per attendee
  capacity: number;
  taken: number;                    // server-computed
  description: string;
};

type RegisterPayload = {
  ticketTypeId: string;
  accommodationId: string | null;
  attendees: {
    firstName: string;
    lastName:  string;
    email:     string;
    phone:     string;
    ageGroup:  'child' | 'teen' | 'adult';
    dietary?:  string;
    emergencyName?:  string;
    emergencyPhone?: string;
  }[];
  // Optional. When present, the server mints one `groupId` for the whole batch
  // and stamps every created ticket with it. Solo registrations omit this.
  group?: {
    type:      'church' | 'family' | 'department';
    name:      string;
    leadEmail: string;     // defaults to attendees[0].email if blank
  } | null;
  // Referral attribution. The frontend forwards the `?ref=` query param from
  // the shared link (already trimmed to 60 chars). Persist verbatim onto
  // every ticket created so admins can roll up top referrers.
  referrer?: string | null;
};

type Ticket = {
  code: string;                    // "TKT-XXXXXX"
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketTypeName: string;
  role: 'attendee' | 'staff' | 'speaker';  // inherited from ticket type at register
  accommodationId: string | null;
  accommodationName: string | null;
  attendeeName:  string;
  attendeeEmail: string;
  attendeePhone?: string;
  ageGroup?: 'child' | 'teen' | 'adult';
  dietary?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  status: 'confirmed' | 'cancelled' | 'checked-in';
  purchasedAt:  string;            // ISO
  checkedInAt?: string;            // ISO
  // Group fields — null on solo tickets, populated on every ticket in a group batch.
  groupId?:        string | null;  // "GRP-XXXXXX" — same on every ticket in one batch
  groupType?:      'church' | 'family' | 'department' | null;
  groupName?:      string | null;
  groupLeadEmail?: string | null;
  referrer?:       string | null;   // captured from share-link ?ref= at register
  // Auto-assigned at registration. `roomLabel` is server-formatted as
  // "<accommodation name> · Room <n> · Bed <n>"; `seatLabel` is "<row><col>"
  // (e.g. "C12"). Either may be '' if the event has no seating or no
  // accommodation.
  roomLabel?: string;
  seatLabel?: string;
};
```

## Notifications (email + SMS)

Sender stays server-side so API keys never leak. Email goes through the existing
Resend mailer (`backend/services/mailer.js`); SMS through Termii
(`backend/services/sms.js`). The frontend hands the backend a fully self-
contained payload (recipient + ticket data) so the backend doesn't need a
tickets table to send.

| Method | Path                                      | Body                                                          | Returns |
| ------ | ----------------------------------------- | ------------------------------------------------------------- | ------- |
| POST   | `/api/notifications/email-ticket`         | `{ to, ticket }`                                              | `{ ok, id?, error? }` |
| POST   | `/api/notifications/sms-ticket`           | `{ to, ticket }`                                              | `{ ok, id?, error? }` |
| POST   | `/api/notifications/schedule-reminder`    | `{ ticket, sendAt, kind, channels: ('email'\|'sms')[] }`      | `{ ok, queuedId? }`   |
| POST   | `/api/admin/notifications/announce`       | `{ eventId, subject, message, recipients[], channels }`       | `{ ok, sent, failed }`|
| PUT    | `/api/profile/:email/notifications`       | `{ sms_opt_in?, reminder_opt_in?, phone? }`                   | `{ ok }`              |
| GET    | `/api/admin/notifications` (admin)        | —                                                             | `LogRow[]`            |
| POST   | `/api/admin/notifications/test` (admin)   | `{ channel: 'email'\|'sms', to }`                             | `{ ok, id?, error? }` |

`schedule-reminder` is dedup-keyed on `(ticketCode, kind)` server-side so
re-firing on a network retry won't double-queue. `kind` ∈
`event_t_minus_1d | event_t_minus_1h | payment_due | custom_*`.

A worker runs once a minute (same pattern as `routes/social.js`,
`services/notifications.js → runScheduler`) and drains `notification_schedule`
rows whose `run_at <= NOW()` and whose `dedupe_key` isn't already in
`notification_log`. The unique index on `notification_log.dedupe_key` is the
hard guard against double-firing if two replicas claim the same row.

## Server-side rules (gotchas)

- `POST /api/events/:id/register` should be transactional: increment
  `ticketTypes[].sold` and `accommodation[].taken` by `attendees.length`
  inside the same write, and reject (409) if either would exceed capacity.
- Reject registration when `now > event.registrationDeadline` → 409.
- **Auto seat + room assignment** runs inside the `POST /api/events/:id/register`
  transaction. For each attendee in the payload the server picks a room (when
  the chosen accommodation has `bedsPerRoom > 0`) and a seat (when `event.seating`
  is set), then writes `roomLabel` and `seatLabel` onto the new ticket rows.
  Algorithm summary: shared rooms pack into partially-full rooms first; private
  rooms open a fresh room per party; groups (`groupId` present in the same
  batch) prefer the same room and consecutive seats. Reference implementation
  is `src/lib/assignment.js` on the frontend.
- **Multi-tenant scoping:** every admin endpoint must filter by the authenticated
  admin's `churchId`. An admin from church A must never read, write, or list
  events / tickets belonging to church B. The frontend ChurchSwitcher only
  picks which church to *display*; the server is the source of truth for which
  church the caller is allowed to touch.
- `PUT /api/tickets/:code` should accept only the attendee-editable fields:
  `attendeeName`, `attendeeEmail`, `attendeePhone`, `ageGroup`, `dietary`,
  `emergencyName`, `emergencyPhone`. Refuse changes once
  `status === 'checked-in'` (frontend already hides the form, but enforce
  server-side).
- Generate `code` as `TKT-` + 6 chars from a no-ambiguous alphabet
  (no `O/0/I/1/L`). See `eventStore.js → newTicketCode()` for the
  reference implementation.
- Mark a ticket `checked-in` only once per code; subsequent `POST /checkin`
  should return `{ ok: false, error: 'Already checked in', at: ISO }`.

## Suggested DB tables

```sql
CREATE TABLE churches (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  contact_email TEXT,
  location      TEXT,
  tagline       TEXT,
  logo_color    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id            TEXT PRIMARY KEY,
  church_id     TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  tagline       TEXT,
  summary       TEXT,
  location      TEXT,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  cover_color   TEXT,
  banner_url    TEXT,
  schedule      JSONB,                 -- [{day, items[]}]
  seating_rows           INT,           -- NULL = un-seated event
  seating_seats_per_row  INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_types (
  id           TEXT PRIMARY KEY,
  event_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  price_cents  INT  NOT NULL DEFAULT 0,
  capacity     INT  NOT NULL,
  description  TEXT,
  sort_order   INT  NOT NULL DEFAULT 0
);

CREATE TABLE accommodations (
  id             TEXT PRIMARY KEY,
  event_id       TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'lodge',   -- hostel/hotel/dormitory/cabin/lodge/home-stay/tent/none
  sharing        TEXT NOT NULL DEFAULT 'shared',  -- shared / private
  beds_per_room  INT  NOT NULL DEFAULT 4,         -- drives room auto-assignment
  price_cents    INT  NOT NULL DEFAULT 0,
  capacity       INT  NOT NULL,
  description    TEXT,
  sort_order     INT  NOT NULL DEFAULT 0
);

CREATE TABLE tickets (
  code            TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id  TEXT NOT NULL REFERENCES ticket_types(id),
  accommodation_id TEXT REFERENCES accommodations(id),
  attendee_name   TEXT NOT NULL,
  attendee_email  TEXT NOT NULL,
  attendee_phone  TEXT,
  age_group       TEXT,
  dietary         TEXT,
  emergency_name  TEXT,
  emergency_phone TEXT,
  -- Group registration: every ticket in one POST shares the same group_id.
  -- group_id is plain TEXT (no FK), because we don't persist groups as their
  -- own entity yet — they're a label, not a first-class row.
  group_id        TEXT,
  group_type      TEXT,           -- church | family | department
  group_name      TEXT,
  group_lead_email TEXT,
  referrer        TEXT,                                -- ?ref= tag from share link
  room_label      TEXT,                                -- auto-assigned: "<accom name> · Room N · Bed N"
  seat_label      TEXT,                                -- auto-assigned: "<row><seat>" (e.g. "C12")
  status          TEXT NOT NULL DEFAULT 'confirmed',
  checked_in_at   TIMESTAMPTZ,
  purchased_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tickets_event_id_idx        ON tickets(event_id);
CREATE INDEX tickets_email_idx           ON tickets(attendee_email);
CREATE INDEX tickets_ticket_type_id_idx  ON tickets(ticket_type_id);
CREATE INDEX tickets_group_id_idx        ON tickets(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX tickets_referrer_idx        ON tickets(referrer)  WHERE referrer  IS NOT NULL;
```

`sold` and `taken` are computed at read time as
`COUNT(*) FROM tickets WHERE ticket_type_id = ... AND status <> 'cancelled'`.

## Wiring into `backend/server.js`

Cleanest path: create `backend/routes/registration.js` exporting an
Express router with the endpoints above, then add **one line** near the
other `app.use(...)` calls in `server.js`:

```js
app.use('/', require('./routes/registration'));
```

This avoids editing the 8000-line `server.js` body.
