// Registrations.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Registrations database — every ticket sold across every event the signed-in
// user has created, in one filterable / sortable / exportable table.
//
// Data flow:
//   1. Fetch the user's own events via api.listMyEvents()
//   2. For each event, fetch its tickets via api.listEventTickets(eventId)
//   3. Flatten into a single rows[] array with the parent event embedded
//   4. Filter / sort / export client-side
//
// The detail panel below the table shows the full attendee profile (address,
// region/district/assembly, age, sex, marital status, dietary, emergency
// contact, accommodation, group membership) so an admin can see everything
// the registrant submitted in one place.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Download, ChevronDown, ChevronUp, ChevronRight, Users, Ticket,
  CalendarDays, BadgeCheck, BedDouble, Armchair, RefreshCcw, ExternalLink,
  Phone, Mail, AlertCircle, ShieldAlert,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';

// ── helpers ────────────────────────────────────────────────────────────────
const cents = (n) => {
  const v = Number(n || 0);
  return v ? `₦${(v / 100).toLocaleString()}` : 'Free';
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

// Compose a human display name from whatever the ticket has. Priority:
// attendeeName → firstName + lastName → email local-part → "Guest".
function displayName(t) {
  if (t.attendeeName?.trim()) return t.attendeeName.trim();
  const p = t.attendeeProfile || {};
  const combined = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  if (t.attendeeEmail) return t.attendeeEmail.split('@')[0];
  return 'Guest';
}

// Pull a profile field, falling back through several aliases the backend
// may use depending on the registration path.
function profileField(t, ...keys) {
  const p = t.attendeeProfile || {};
  for (const k of keys) {
    if (p[k] != null && p[k] !== '') return p[k];
    if (t[k]   != null && t[k]   !== '') return t[k];
  }
  return '';
}

// Build a CSV that round-trips Excel + Google Sheets cleanly. Escapes
// quotes per RFC4180 and quotes every cell so commas/newlines never break.
function rowsToCsv(rows) {
  const cols = [
    ['event',       (r) => r._event?.title || ''],
    ['code',        (r) => r.code || ''],
    ['name',        (r) => displayName(r)],
    ['email',       (r) => r.attendeeEmail || ''],
    ['phone',       (r) => r.attendeePhone || ''],
    ['ticketType',  (r) => r.ticketTypeName || ''],
    ['price',       (r) => Number(r.priceCents || 0) / 100],
    ['status',      (r) => r.status || ''],
    ['seat',        (r) => r.seatLabel || ''],
    ['room',        (r) => r.roomLabel || ''],
    ['accommodation', (r) => r.accommodationName || ''],
    ['group',       (r) => r.groupId || ''],
    ['sex',         (r) => profileField(r, 'sex')],
    ['ageGroup',    (r) => profileField(r, 'ageGroup', 'ageBracket')],
    ['city',        (r) => profileField(r, 'city')],
    ['country',     (r) => profileField(r, 'country')],
    ['region',      (r) => profileField(r, 'region')],
    ['district',    (r) => profileField(r, 'district')],
    ['assembly',    (r) => profileField(r, 'assembly')],
    ['emergencyName',  (r) => profileField(r, 'emergencyName', 'emergency_contact_name')],
    ['emergencyPhone', (r) => profileField(r, 'emergencyPhone', 'emergency_contact_phone')],
    ['dietary',     (r) => profileField(r, 'dietary')],
    ['notes',       (r) => profileField(r, 'otherInfo', 'notes')],
    ['registeredAt', (r) => r.createdAt || r.registeredAt || ''],
  ];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.map(([h]) => esc(h)).join(',')];
  for (const r of rows) lines.push(cols.map(([, get]) => esc(get(r))).join(','));
  return lines.join('\n');
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── status visual mapping ──────────────────────────────────────────────────
function statusChip(status) {
  switch (status) {
    case 'checked-in':
      return 'bg-tertiary-container text-tertiary';
    case 'confirmed':
      return 'bg-secondary-container text-on-secondary-container';
    case 'cancelled':
      return 'bg-muted-coral/10 text-muted-coral';
    case 'pending':
      return 'bg-calm-amber/15 text-calm-amber';
    default:
      return 'bg-surface-container-high text-on-surface-variant';
  }
}

export default function Registrations() {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [rows,   setRows]   = useState([]);  // every ticket across every event
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Filters
  const [eventId, setEventId] = useState('all');
  const [tier,    setTier]    = useState('all');
  const [status,  setStatus]  = useState('all');
  const [query,   setQuery]   = useState('');
  const [groupOnly, setGroupOnly] = useState(false);

  // Sort + pagination
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  // Detail panel state — null or a row reference.
  const [openCode, setOpenCode] = useState(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const myEvents = await api.listMyEvents();
      const list = Array.isArray(myEvents) ? myEvents : [];
      setEvents(list);

      // Fan-out: pull tickets for every event in parallel. We keep going on
      // per-event failure so one broken event doesn't black out the whole
      // database view.
      const results = await Promise.all(
        list.map(async (ev) => {
          try {
            const tickets = await api.listEventTickets(ev.id);
            return (Array.isArray(tickets) ? tickets : []).map((t) => ({ ...t, _event: ev }));
          } catch (e) {
            console.warn(`[Registrations] failed to load tickets for ${ev.id}:`, e?.message);
            return [];
          }
        }),
      );
      setRows(results.flat());
    } catch (e) {
      setError(e?.message || 'Could not load registrations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── derived: ticket-type options for the current event scope ─────────────
  const tierOptions = useMemo(() => {
    const scoped = eventId === 'all' ? rows : rows.filter((r) => r._event?.id === eventId);
    return Array.from(new Set(scoped.map((r) => r.ticketTypeName).filter(Boolean))).sort();
  }, [rows, eventId]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.status).filter(Boolean))).sort();
  }, [rows]);

  // ── filtered + sorted rows ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (eventId !== 'all' && r._event?.id !== eventId) return false;
      if (tier    !== 'all' && r.ticketTypeName !== tier) return false;
      if (status  !== 'all' && r.status !== status)       return false;
      if (groupOnly && !r.groupId)                        return false;
      if (q) {
        const hay = [
          displayName(r), r.attendeeEmail, r.attendeePhone, r.code,
          r.ticketTypeName, r._event?.title, r.seatLabel, r.accommodationName,
          profileField(r, 'city'), profileField(r, 'assembly'), profileField(r, 'region'),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, eventId, tier, status, groupOnly, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case 'name':       av = displayName(a).toLowerCase(); bv = displayName(b).toLowerCase(); break;
        case 'email':      av = (a.attendeeEmail || '').toLowerCase(); bv = (b.attendeeEmail || '').toLowerCase(); break;
        case 'event':      av = (a._event?.title || '').toLowerCase(); bv = (b._event?.title || '').toLowerCase(); break;
        case 'tier':       av = (a.ticketTypeName || '').toLowerCase(); bv = (b.ticketTypeName || '').toLowerCase(); break;
        case 'status':     av = a.status || ''; bv = b.status || ''; break;
        case 'seat':       av = a.seatLabel || ''; bv = b.seatLabel || ''; break;
        case 'price':      av = Number(a.priceCents || 0); bv = Number(b.priceCents || 0); break;
        case 'createdAt':
        default:
          av = new Date(a.createdAt || a.registeredAt || 0).getTime();
          bv = new Date(b.createdAt || b.registeredAt || 0).getTime();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  // ── high-level stats (computed on the filtered set so they react to UI) ──
  const stats = useMemo(() => {
    const total      = filtered.length;
    const checkedIn  = filtered.filter((r) => r.status === 'checked-in').length;
    const pending    = filtered.filter((r) => r.status === 'pending').length;
    const cancelled  = filtered.filter((r) => r.status === 'cancelled').length;
    const revenueCents = filtered.reduce((sum, r) => sum + Number(r.priceCents || 0), 0);
    const groups     = new Set(filtered.map((r) => r.groupId).filter(Boolean)).size;
    const eventsHit  = new Set(filtered.map((r) => r._event?.id).filter(Boolean)).size;
    return { total, checkedIn, pending, cancelled, revenueCents, groups, eventsHit };
  }, [filtered]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'createdAt' ? 'desc' : 'asc'); }
  }

  function onExport() {
    const csv = rowsToCsv(sorted);
    const evLabel = eventId === 'all'
      ? 'all-events'
      : (events.find((e) => e.id === eventId)?.id || eventId);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`registrations_${evLabel}_${stamp}.csv`, csv);
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* HEADER ── title + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Creator console
          </div>
          <h1 className="font-display text-display-md text-on-surface mt-1.5">
            Registrations database
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 max-w-prose">
            Every registrant for every event {user?.email ? <span className="text-on-surface font-semibold">{user.email}</span> : 'you'} has created — searchable, filterable, exportable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost" title="Reload">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={onExport} disabled={sorted.length === 0} className="btn-primary">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* STATS ── responsive grid, stays compact on small screens */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Registrations" value={stats.total}     icon={Ticket}      tone="primary" />
        <StatCard label="Events"        value={stats.eventsHit} icon={CalendarDays} tone="secondary" />
        <StatCard label="Checked in"    value={stats.checkedIn} icon={BadgeCheck}   tone="success" />
        <StatCard label="Pending"       value={stats.pending}   icon={AlertCircle}  tone="warn" />
        <StatCard label="Groups"        value={stats.groups}    icon={Users}        tone="secondary" />
        <StatCard label="Revenue"       value={cents(stats.revenueCents)} icon={ShieldAlert} tone="primary" wide />
      </div>

      {/* FILTERS ── single row that wraps gracefully on mobile */}
      <div className="card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <input
                className="input pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, email, phone, code, city…"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="label">Event</label>
            <select
              className="input"
              value={eventId}
              onChange={(e) => { setEventId(e.target.value); setTier('all'); }}
            >
              <option value="all">All events ({events.length})</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title || e.id}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Ticket type</label>
            <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="all">All</option>
              {tierOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={groupOnly}
              onChange={(e) => setGroupOnly(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Only group registrations
          </label>
          <div className="ml-auto text-xs text-on-surface-variant">
            Showing <strong className="text-on-surface tabular">{sorted.length}</strong> of {rows.length}
          </div>
        </div>
      </div>

      {/* ERROR / EMPTY / LOADING / TABLE */}
      {error && (
        <div className="card p-4 text-sm text-muted-coral bg-muted-coral/10">{error}</div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-on-surface-variant">Loading registrations…</div>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center text-on-surface-variant space-y-2">
          <div className="text-sm">No registrations match the current filters.</div>
          <button
            onClick={() => { setQuery(''); setEventId('all'); setTier('all'); setStatus('all'); setGroupOnly(false); }}
            className="btn-soft inline-flex"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Wide table on desktop, scrollable on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-[0.10em] text-on-surface-variant">
                <tr>
                  <Th onClick={() => toggleSort('name')}      active={sortKey === 'name'}      dir={sortDir}>Attendee</Th>
                  <Th onClick={() => toggleSort('event')}     active={sortKey === 'event'}     dir={sortDir}>Event</Th>
                  <Th onClick={() => toggleSort('tier')}      active={sortKey === 'tier'}      dir={sortDir}>Ticket</Th>
                  <Th onClick={() => toggleSort('status')}    active={sortKey === 'status'}    dir={sortDir}>Status</Th>
                  <Th onClick={() => toggleSort('seat')}      active={sortKey === 'seat'}      dir={sortDir}>Seat / Room</Th>
                  <Th onClick={() => toggleSort('price')}     active={sortKey === 'price'}     dir={sortDir} align="right">Paid</Th>
                  <Th onClick={() => toggleSort('createdAt')} active={sortKey === 'createdAt'} dir={sortDir}>Registered</Th>
                  <Th>Code</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {sorted.map((r) => {
                  const open = openCode === r.code;
                  return (
                    <Row
                      key={r.code || `${r._event?.id}-${r.attendeeEmail}`}
                      r={r}
                      open={open}
                      onToggle={() => setOpenCode(open ? null : r.code)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-row + expanded detail panel.
// ─────────────────────────────────────────────────────────────────────────────
function Row({ r, open, onToggle }) {
  const name = displayName(r);
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0] || '').join('').toUpperCase() || '?';

  return (
    <>
      <tr className="hover:bg-surface-container-low/60">
        <td className="px-4 py-3 align-middle">
          <button onClick={onToggle} className="flex items-start gap-3 text-left w-full group">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700 text-xs font-bold tracking-wide ring-1 ring-primary-100">
              {r.attendeeProfile?.photo
                ? <img src={r.attendeeProfile.photo} alt="" className="h-full w-full rounded-full object-cover" />
                : initials}
            </span>
            <span className="min-w-0">
              <div className="font-semibold text-on-surface truncate group-hover:text-primary-700 transition">
                {name}
              </div>
              <div className="text-[12px] text-on-surface-variant truncate inline-flex items-center gap-1.5">
                {r.attendeeEmail || <span className="italic opacity-60">no email</span>}
              </div>
              {r.attendeePhone && (
                <div className="text-[12px] text-on-surface-variant truncate inline-flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> {r.attendeePhone}
                </div>
              )}
            </span>
          </button>
        </td>
        <td className="px-4 py-3 align-middle">
          <Link to={`/events/${r._event?.id}`} className="text-on-surface hover:text-primary-700 inline-flex items-center gap-1.5 group">
            <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${r._event?.coverColor || 'from-primary-300 to-primary-700'}`} />
            <span className="truncate max-w-[14rem]">{r._event?.title || '—'}</span>
          </Link>
          {r._event?.startsAt && (
            <div className="text-[11px] text-on-surface-variant mt-0.5">{fmtDate(r._event.startsAt)}</div>
          )}
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="font-semibold text-on-surface">{r.ticketTypeName || '—'}</div>
          {r.groupId && (
            <div className="text-[11px] text-on-surface-variant inline-flex items-center gap-1 mt-0.5">
              <Users className="h-3 w-3" /> Group {r.groupId.slice(-6)}
            </div>
          )}
        </td>
        <td className="px-4 py-3 align-middle">
          <span className={`chip ${statusChip(r.status)}`}>{r.status || 'registered'}</span>
        </td>
        <td className="px-4 py-3 align-middle text-[12.5px]">
          {r.seatLabel && (
            <div className="font-semibold text-on-surface tabular inline-flex items-center gap-1.5">
              <Armchair className="h-3.5 w-3.5 text-primary-700" /> {r.seatLabel}
            </div>
          )}
          {r.accommodationName && (
            <div className="text-on-surface-variant inline-flex items-center gap-1.5 mt-0.5">
              <BedDouble className="h-3.5 w-3.5 text-primary-700" /> {r.accommodationName}
              {r.roomLabel && <span className="opacity-70">· {r.roomLabel}</span>}
            </div>
          )}
          {!r.seatLabel && !r.accommodationName && <span className="text-on-surface-variant">—</span>}
        </td>
        <td className="px-4 py-3 align-middle text-right tabular font-semibold text-on-surface">
          {cents(r.priceCents)}
        </td>
        <td className="px-4 py-3 align-middle text-on-surface-variant text-[12.5px]">
          {fmtDateTime(r.createdAt || r.registeredAt)}
        </td>
        <td className="px-4 py-3 align-middle">
          <Link
            to={`/tickets/${r.code}`}
            className="font-mono text-[11.5px] bg-surface-container-low rounded-md px-2 py-1 hover:bg-surface-container"
          >
            {r.code || '—'}
          </Link>
        </td>
        <td className="px-2 py-3 align-middle text-right">
          <button
            onClick={onToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
            aria-label={open ? 'Collapse details' : 'Expand details'}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </td>
      </tr>

      {/* Detail row — full attendee profile. Spans every column. */}
      {open && (
        <tr className="bg-surface-container-low/40">
          <td colSpan={9} className="px-4 py-5">
            <Detail r={r} />
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ r }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Block title="Identity">
        <Field label="Full name"   value={displayName(r)} />
        <Field label="Title"       value={profileField(r, 'title')} />
        <Field label="Sex"         value={profileField(r, 'sex')} />
        <Field label="Marital"     value={profileField(r, 'maritalStatus')} />
        <Field label="Age group"   value={profileField(r, 'ageGroup', 'ageBracket')} />
      </Block>

      <Block title="Contact">
        <Field label="Email" icon={Mail}  value={r.attendeeEmail} />
        <Field label="Phone" icon={Phone} value={r.attendeePhone} />
        <Field label="City"        value={profileField(r, 'city')} />
        <Field label="Country"     value={profileField(r, 'country')} />
        <Field label="Region"      value={profileField(r, 'region')} />
        <Field label="District"    value={profileField(r, 'district')} />
        <Field label="Assembly"    value={profileField(r, 'assembly')} />
        <Field label="Convention"  value={profileField(r, 'conventionLocation')} />
      </Block>

      <Block title="Logistics & notes">
        <Field label="Ticket"        value={r.ticketTypeName} />
        <Field label="Price"         value={cents(r.priceCents)} />
        <Field label="Status"        value={r.status} />
        <Field label="Seat"          value={r.seatLabel} />
        <Field label="Accommodation" value={r.accommodationName} />
        <Field label="Room"          value={r.roomLabel} />
        <Field label="Group"         value={r.groupId ? `Group ${r.groupId.slice(-6)}` : ''} />
        <Field label="Dietary"       value={profileField(r, 'dietary')} />
        <Field label="Emergency name"  value={profileField(r, 'emergencyName',  'emergency_contact_name')} />
        <Field label="Emergency phone" value={profileField(r, 'emergencyPhone', 'emergency_contact_phone')} />
        <Field label="Notes"           value={profileField(r, 'otherInfo', 'notes')} multiline />
      </Block>

      <div className="md:col-span-3 flex flex-wrap gap-2 pt-1">
        <Link to={`/tickets/${r.code}`} className="btn-soft inline-flex items-center gap-1.5">
          Open ticket <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link to={`/tickets/${r.code}/edit`} className="btn-soft inline-flex items-center gap-1.5">
          Edit registration
        </Link>
        <Link to={`/tickets/${r.code}/badge`} className="btn-soft inline-flex items-center gap-1.5">
          View badge
        </Link>
        {r.attendeeEmail && (
          <a
            href={`mailto:${encodeURIComponent(r.attendeeEmail)}`}
            className="btn-soft inline-flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5" /> Email attendee
          </a>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value, icon: Icon, multiline }) {
  const shown = value || (value === 0 ? '0' : '');
  return (
    <div className="text-sm">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface-variant inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" strokeWidth={1.7} />} {label}
      </div>
      <div className={`text-on-surface ${multiline ? 'whitespace-pre-wrap leading-relaxed' : 'truncate'}`}>
        {shown || <span className="text-on-surface-variant/60">—</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable table header cell.
// ─────────────────────────────────────────────────────────────────────────────
function Th({ children, onClick, active, dir, align = 'left' }) {
  const sortable = !!onClick;
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 font-bold select-none ${sortable ? 'cursor-pointer hover:text-on-surface' : ''}`}
      style={{ textAlign: align }}
    >
      <span className={`inline-flex items-center gap-1 ${active ? 'text-primary-700' : ''}`}>
        {children}
        {sortable && active && (
          dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </span>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat tile.
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, tone = 'primary', wide }) {
  const tones = {
    primary:   'from-primary-50  to-primary-100/50  text-primary-700  ring-primary-100',
    secondary: 'from-secondary-container/40 to-secondary-container/10 text-on-secondary-container ring-secondary-container/60',
    success:   'from-tertiary-container/60 to-tertiary-container/20 text-tertiary ring-tertiary-container',
    warn:      'from-calm-amber/20 to-calm-amber/5   text-calm-amber  ring-calm-amber/30',
  };
  return (
    <div className={`relative rounded-2xl p-4 bg-gradient-to-br ${tones[tone] || tones.primary} ring-1 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.7} /> {label}
      </div>
      <div className="mt-1.5 font-display font-extrabold text-2xl tabular">{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state — shown when the user has no events at all.
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="card p-12 text-center space-y-4">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 mx-auto">
        <Users className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="font-display font-bold text-lg text-on-surface">No registrations yet</h3>
        <p className="text-sm text-on-surface-variant mt-1 max-w-sm mx-auto">
          You haven't created any events with registrations. Create your first event and share the link to start collecting registrations.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <Link to="/events/new" className="btn-primary inline-flex items-center gap-1.5">
          Create event <ChevronRight className="h-3.5 w-3.5" />
        </Link>
        <Link to="/my-events" className="btn-soft inline-flex">My events</Link>
      </div>
    </div>
  );
}
