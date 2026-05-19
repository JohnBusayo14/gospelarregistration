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
  Phone, Mail, AlertCircle, Database, SlidersHorizontal, X,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';
import { useTopBar } from '../context/TopBarContext.jsx';
import { EVENT_TEMPLATES } from '../templates.js';

// Friendly template-name lookup, so the "Event type" filter shows "Wedding
// Ceremony" instead of the raw "wedding" slug. Built once at module load.
const TEMPLATE_NAMES = Object.fromEntries(EVENT_TEMPLATES.map((t) => [t.id, t.name]));

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

  // Filters — coarse (event/tier/status/search/groupOnly) plus profile
  // facets so admins can slice by who registered.
  const [eventId,        setEventId]        = useState('all');
  const [templateId,     setTemplateId]     = useState('all'); // event type filter
  const [tier,           setTier]           = useState('all');
  const [status,         setStatus]         = useState('all');
  const [query,          setQuery]          = useState('');
  const [groupOnly,      setGroupOnly]      = useState(false);
  const [sex,            setSex]            = useState('all');
  const [ageGroup,       setAgeGroup]       = useState('all');
  const [maritalStatus,  setMaritalStatus]  = useState('all');
  const [country,        setCountry]        = useState('all');
  const [region,         setRegion]         = useState('all');
  const [seatedFilter,   setSeatedFilter]   = useState('all'); // 'all' | 'seated' | 'unseated'
  const [lodgingFilter,  setLodgingFilter]  = useState('all'); // 'all' | 'with' | 'without'
  const [registeredFrom, setRegisteredFrom] = useState('');    // YYYY-MM-DD
  const [registeredTo,   setRegisteredTo]   = useState('');    // YYYY-MM-DD

  // Dynamic per-event custom-answer filters. Keyed by question id; value is
  // the option string the user picked. Only meaningful when one event is
  // selected (different events have different question sets).
  // Shape: { [questionId]: 'option string' | 'all' }
  const [answerFilters, setAnswerFilters] = useState({});
  const setAnswerFilter = (qid, value) =>
    setAnswerFilters((p) => ({ ...p, [qid]: value }));

  // UI state for the collapsible filter drawer (mobile only — desktop
  // always shows the full filter grid via responsive classes).
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sort
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

  // ── derived: dropdown options computed from the loaded data ──────────────
  const tierOptions = useMemo(() => {
    const scoped = eventId === 'all' ? rows : rows.filter((r) => r._event?.id === eventId);
    return Array.from(new Set(scoped.map((r) => r.ticketTypeName).filter(Boolean))).sort();
  }, [rows, eventId]);

  const statusOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))).sort(),
    [rows],
  );
  const sexOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => profileField(r, 'sex')).filter(Boolean))).sort(),
    [rows],
  );
  const ageGroupOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => profileField(r, 'ageGroup', 'ageBracket')).filter(Boolean))).sort(),
    [rows],
  );
  const maritalOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => profileField(r, 'maritalStatus')).filter(Boolean))).sort(),
    [rows],
  );
  const countryOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => profileField(r, 'country')).filter(Boolean))).sort(),
    [rows],
  );
  const regionOptions = useMemo(() => {
    const scoped = country === 'all'
      ? rows
      : rows.filter((r) => profileField(r, 'country') === country);
    return Array.from(new Set(scoped.map((r) => profileField(r, 'region')).filter(Boolean))).sort();
  }, [rows, country]);

  // Event-type options — distinct template ids across the user's events,
  // with a friendly name pulled from EVENT_TEMPLATES. Events created
  // without a template show under "Custom" (id = '') so they're not lost.
  const templateOptions = useMemo(() => {
    const ids = new Set();
    for (const ev of events) ids.add(ev.templateId || '');
    return Array.from(ids).sort().map((id) => ({
      id,
      label: id ? (TEMPLATE_NAMES[id] || id) : 'Custom (no template)',
    }));
  }, [events]);

  // The event currently focused (when a specific event is selected) — used
  // to drive the dynamic custom-answer filters below.
  const focusedEvent = useMemo(
    () => (eventId === 'all' ? null : events.find((e) => e.id === eventId) || null),
    [events, eventId],
  );

  // Which custom questions on the focused event we'll render as filters.
  // Only `choice` questions get a dropdown — free-text answers are
  // covered by the global search box.
  const answerFilterQuestions = useMemo(() => {
    if (!focusedEvent) return [];
    return (focusedEvent.customQuestions || []).filter((q) => q.type === 'choice');
  }, [focusedEvent]);

  // ── filtered + sorted rows ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = registeredFrom ? new Date(registeredFrom + 'T00:00:00').getTime() : null;
    const toTs   = registeredTo   ? new Date(registeredTo   + 'T23:59:59').getTime() : null;
    return rows.filter((r) => {
      if (eventId !== 'all' && r._event?.id !== eventId) return false;
      if (templateId !== 'all' && (r._event?.templateId || '') !== templateId) return false;
      if (tier    !== 'all' && r.ticketTypeName !== tier) return false;
      if (status  !== 'all' && r.status !== status)       return false;
      if (groupOnly && !r.groupId)                        return false;
      if (sex     !== 'all' && profileField(r, 'sex') !== sex) return false;
      if (ageGroup !== 'all' && profileField(r, 'ageGroup', 'ageBracket') !== ageGroup) return false;
      if (maritalStatus !== 'all' && profileField(r, 'maritalStatus') !== maritalStatus) return false;
      if (country !== 'all' && profileField(r, 'country') !== country) return false;
      if (region  !== 'all' && profileField(r, 'region')  !== region)  return false;
      if (seatedFilter === 'seated'   && !r.seatLabel) return false;
      if (seatedFilter === 'unseated' &&  r.seatLabel) return false;
      if (lodgingFilter === 'with'    && !r.accommodationName) return false;
      if (lodgingFilter === 'without' &&  r.accommodationName) return false;
      if (fromTs || toTs) {
        const ts = new Date(r.createdAt || r.registeredAt || 0).getTime();
        if (fromTs && ts < fromTs) return false;
        if (toTs   && ts > toTs)   return false;
      }
      // Dynamic per-question custom-answer filters — only fire when an
      // event is selected (other rows are already excluded above).
      for (const [qid, val] of Object.entries(answerFilters)) {
        if (!val || val === 'all') continue;
        const answer = (r.customAnswers && r.customAnswers[qid]) || '';
        if (answer !== val) return false;
      }
      if (q) {
        const hay = [
          displayName(r), r.attendeeEmail, r.attendeePhone, r.code,
          r.ticketTypeName, r._event?.title, r.seatLabel, r.accommodationName,
          profileField(r, 'city'), profileField(r, 'assembly'), profileField(r, 'region'),
          profileField(r, 'district'), profileField(r, 'country'),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    rows, eventId, templateId, tier, status, groupOnly, query,
    sex, ageGroup, maritalStatus, country, region,
    seatedFilter, lodgingFilter, registeredFrom, registeredTo, answerFilters,
  ]);

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

  function clearAllFilters() {
    setQuery(''); setEventId('all'); setTemplateId('all'); setTier('all'); setStatus('all');
    setGroupOnly(false); setSex('all'); setAgeGroup('all'); setMaritalStatus('all');
    setCountry('all'); setRegion('all'); setSeatedFilter('all'); setLodgingFilter('all');
    setRegisteredFrom(''); setRegisteredTo(''); setAnswerFilters({});
  }

  // List of every active filter so we can render chips beneath the bar
  // and let the user clear them one at a time. Each entry knows how to
  // remove itself, which keeps the JSX below trivial.
  const activeFilters = [];
  if (query)                      activeFilters.push({ label: `“${query}”`,       clear: () => setQuery('') });
  if (eventId !== 'all')          activeFilters.push({ label: events.find((e) => e.id === eventId)?.title || eventId, clear: () => setEventId('all') });
  if (templateId !== 'all')       activeFilters.push({ label: `Type: ${templateId ? (TEMPLATE_NAMES[templateId] || templateId) : 'Custom'}`, clear: () => setTemplateId('all') });
  if (tier !== 'all')             activeFilters.push({ label: `Ticket: ${tier}`,  clear: () => setTier('all') });
  if (status !== 'all')           activeFilters.push({ label: `Status: ${status}`, clear: () => setStatus('all') });
  if (groupOnly)                  activeFilters.push({ label: 'Groups only',      clear: () => setGroupOnly(false) });
  if (sex !== 'all')              activeFilters.push({ label: `Sex: ${sex}`,       clear: () => setSex('all') });
  if (ageGroup !== 'all')         activeFilters.push({ label: `Age: ${ageGroup}`,   clear: () => setAgeGroup('all') });
  if (maritalStatus !== 'all')    activeFilters.push({ label: `Marital: ${maritalStatus}`, clear: () => setMaritalStatus('all') });
  if (country !== 'all')          activeFilters.push({ label: country,             clear: () => setCountry('all') });
  if (region !== 'all')           activeFilters.push({ label: region,              clear: () => setRegion('all') });
  if (seatedFilter !== 'all')     activeFilters.push({ label: seatedFilter === 'seated' ? 'Seated' : 'Un-seated', clear: () => setSeatedFilter('all') });
  if (lodgingFilter !== 'all')    activeFilters.push({ label: lodgingFilter === 'with' ? 'With lodging' : 'No lodging', clear: () => setLodgingFilter('all') });
  if (registeredFrom)             activeFilters.push({ label: `From ${registeredFrom}`, clear: () => setRegisteredFrom('') });
  if (registeredTo)               activeFilters.push({ label: `To ${registeredTo}`,     clear: () => setRegisteredTo('') });
  // Dynamic per-question chips — only show those with a non-"all" value.
  for (const [qid, val] of Object.entries(answerFilters)) {
    if (!val || val === 'all') continue;
    const q = answerFilterQuestions.find((x) => x.id === qid);
    activeFilters.push({
      label: `${q?.label || qid}: ${val}`,
      clear: () => setAnswerFilter(qid, 'all'),
    });
  }

  function onExport() {
    const csv = rowsToCsv(sorted);
    const evLabel = eventId === 'all'
      ? 'all-events'
      : (events.find((e) => e.id === eventId)?.id || eventId);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`registrations_${evLabel}_${stamp}.csv`, csv);
  }

  // Register contextual top-bar actions. Deps include sorted.length so the
  // Export button correctly disables when filters yield an empty set.
  useTopBar({
    title: 'Registrations database',
    actions: [
      { id: 'refresh', icon: RefreshCcw, label: 'Refresh',    onClick: load,     disabled: loading },
      { id: 'export',  icon: Download,   label: 'Export CSV', onClick: onExport, disabled: sorted.length === 0, primary: true },
    ],
  }, [loading, sorted.length, eventId]);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* HEADER ── big icon + title + inline metrics. No card wrapper. */}
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className="inline-flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-glow"
          style={{ backgroundImage: 'linear-gradient(135deg,#0b3a8a 0%, #1656c2 100%)' }}
        >
          <Database className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-extrabold tracking-tight text-on-surface text-xl sm:text-2xl leading-tight">
            Registrations database
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-1">
            Every registrant for every event {user?.email ? <span className="text-on-surface font-semibold">{user.email}</span> : 'you'} created.
          </p>
        </div>
      </div>

      {/* METRICS ── inline tabular strip; no boxes, no gradients. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-on-surface-variant border-y border-outline-variant/25 py-2.5">
        <Metric icon={Ticket}       value={stats.total}              label="total" />
        <Metric icon={CalendarDays} value={stats.eventsHit}          label={stats.eventsHit === 1 ? 'event' : 'events'} />
        <Metric icon={BadgeCheck}   value={stats.checkedIn}          label="checked-in" tone="success" />
        <Metric icon={AlertCircle}  value={stats.pending}            label="pending"    tone="warn" />
        <Metric icon={Users}        value={stats.groups}             label={stats.groups === 1 ? 'group' : 'groups'} />
        <Metric                     value={cents(stats.revenueCents)} label="revenue"    tone="primary" />
      </div>

      {/* FILTERS ── flat, no card wrapper. Search always visible; the rest
          collapses behind a Filters button on mobile. */}
      <div className="space-y-2.5">
        {/* Search + filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              className="input pl-9 h-11"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, phone, code, city…"
              type="search"
              inputMode="search"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className={`md:hidden inline-flex items-center gap-1.5 h-11 px-3 rounded-md text-sm font-semibold transition ${
              activeFilters.length > 0
                ? 'bg-primary-700 text-white'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            <span>Filters</span>
            {activeFilters.length > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/25 px-1 text-[11px] font-bold tabular">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter grid — hidden on mobile until toggle, visible on md+ */}
        <div className={`${filtersOpen ? 'grid' : 'hidden'} md:grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`}>
          <FilterSelect
            label="Event type"
            value={templateId}
            onChange={(v) => { setTemplateId(v); setEventId('all'); setAnswerFilters({}); }}
            disabled={templateOptions.length <= 1}
          >
            <option value="all">All types</option>
            {templateOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </FilterSelect>
          <FilterSelect
            label="Event"
            value={eventId}
            onChange={(v) => { setEventId(v); setTier('all'); setAnswerFilters({}); }}
          >
            <option value="all">All events ({events.length})</option>
            {events
              .filter((e) => templateId === 'all' || (e.templateId || '') === templateId)
              .map((e) => <option key={e.id} value={e.id}>{e.title || e.id}</option>)}
          </FilterSelect>
          <FilterSelect label="Ticket type" value={tier} onChange={setTier} disabled={tierOptions.length === 0}>
            <option value="all">All</option>
            {tierOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </FilterSelect>
          <FilterSelect label="Status" value={status} onChange={setStatus} disabled={statusOptions.length === 0}>
            <option value="all">All</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect label="Sex" value={sex} onChange={setSex} disabled={sexOptions.length === 0}>
            <option value="all">All</option>
            {sexOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect label="Age group" value={ageGroup} onChange={setAgeGroup} disabled={ageGroupOptions.length === 0}>
            <option value="all">All</option>
            {ageGroupOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect label="Marital" value={maritalStatus} onChange={setMaritalStatus} disabled={maritalOptions.length === 0}>
            <option value="all">All</option>
            {maritalOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect label="Country" value={country} onChange={(v) => { setCountry(v); setRegion('all'); }} disabled={countryOptions.length === 0}>
            <option value="all">All</option>
            {countryOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect label="Region" value={region} onChange={setRegion} disabled={regionOptions.length === 0}>
            <option value="all">All</option>
            {regionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect label="Seating" value={seatedFilter} onChange={setSeatedFilter}>
            <option value="all">Any</option>
            <option value="seated">Has seat</option>
            <option value="unseated">No seat</option>
          </FilterSelect>
          <FilterSelect label="Lodging" value={lodgingFilter} onChange={setLodgingFilter}>
            <option value="all">Any</option>
            <option value="with">With lodging</option>
            <option value="without">No lodging</option>
          </FilterSelect>
          <FilterDate label="Registered from" value={registeredFrom} onChange={setRegisteredFrom} />
          <FilterDate label="Registered to"   value={registeredTo}   onChange={setRegisteredTo} />
        </div>

        {/* Dynamic per-event custom-answer filters — only visible when one
            event is selected AND that event has at least one choice-type
            customQuestion. Lets admins slice e.g. wedding RSVPs by
            "Will you make it?" or "Plus-one?" without re-deriving from
            attendee_profile JSON. Hidden on mobile until the user opens
            the filter drawer, just like the main filter grid. */}
        {focusedEvent && answerFilterQuestions.length > 0 && (
          <div className={`${filtersOpen ? 'block' : 'hidden'} md:block space-y-2 pt-2`}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700">
                Form answers
              </span>
              <span className="text-[11px] text-on-surface-variant">
                — questions specific to <strong className="text-on-surface">{focusedEvent.title}</strong>
              </span>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {answerFilterQuestions.map((q) => (
                <FilterSelect
                  key={q.id}
                  label={q.label}
                  value={answerFilters[q.id] || 'all'}
                  onChange={(v) => setAnswerFilter(q.id, v)}
                >
                  <option value="all">All</option>
                  {(q.options || []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </FilterSelect>
              ))}
            </div>
          </div>
        )}

        {/* Group-only toggle + result counter + clear */}
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
          {activeFilters.length > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Clear all
            </button>
          )}
          <div className="ml-auto text-xs text-on-surface-variant">
            Showing <strong className="text-on-surface tabular">{sorted.length}</strong> of {rows.length}
          </div>
        </div>

        {/* Active-filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeFilters.map((f, i) => (
              <button
                key={`${f.label}-${i}`}
                onClick={f.clear}
                className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 ring-1 ring-primary-100 px-2.5 py-1 text-[11.5px] font-semibold hover:bg-primary-100 transition"
              >
                <span className="truncate max-w-[12rem]">{f.label}</span>
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            ))}
          </div>
        )}
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
          <button onClick={clearAllFilters} className="btn-soft inline-flex">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* ── Desktop table — md and up ─────────────────────────────── */}
          <div className="hidden md:block card overflow-hidden">
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

          {/* ── Mobile cards — below md. Each registration is a tappable
              card with the most-scanned fields up top and the full profile
              hidden behind a chevron. */}
          <div className="md:hidden space-y-2">
            {sorted.map((r) => {
              const open = openCode === r.code;
              return (
                <MobileRow
                  key={r.code || `${r._event?.id}-${r.attendeeEmail}`}
                  r={r}
                  open={open}
                  onToggle={() => setOpenCode(open ? null : r.code)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small filter primitives — keep the long filter grid scannable.
// ─────────────────────────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, disabled, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input h-10 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {children}
      </select>
    </div>
  );
}

function FilterDate({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="date"
        className="input h-10 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile-friendly card row. Replaces the wide table below md.
// ─────────────────────────────────────────────────────────────────────────────
function MobileRow({ r, open, onToggle }) {
  const name = displayName(r);
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0] || '').join('').toUpperCase() || '?';
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3 active:bg-surface-container-low/60 transition"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700 text-xs font-bold ring-1 ring-primary-100">
          {r.attendeeProfile?.photo
            ? <img src={r.attendeeProfile.photo} alt="" className="h-full w-full rounded-full object-cover" />
            : initials}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-on-surface truncate flex-1">{name}</div>
            <span className={`chip ${statusChip(r.status)}`}>{r.status || 'registered'}</span>
          </div>
          <div className="text-[12px] text-on-surface-variant truncate">
            {r.attendeeEmail || <span className="italic opacity-60">no email</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full bg-gradient-to-br ${r._event?.coverColor || 'from-primary-300 to-primary-700'}`} />
              <span className="truncate max-w-[10rem]">{r._event?.title || '—'}</span>
            </span>
            {r.ticketTypeName && (
              <span className="inline-flex items-center gap-1">
                <Ticket className="h-3 w-3" /> {r.ticketTypeName}
              </span>
            )}
            <span className="font-semibold text-on-surface tabular">{cents(r.priceCents)}</span>
          </div>
          {(r.attendeePhone || r.seatLabel || r.accommodationName) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-on-surface-variant">
              {r.attendeePhone && (
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {r.attendeePhone}</span>
              )}
              {r.seatLabel && (
                <span className="inline-flex items-center gap-1"><Armchair className="h-3 w-3" /> {r.seatLabel}</span>
              )}
              {r.accommodationName && (
                <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" /> {r.accommodationName}</span>
              )}
            </div>
          )}
        </div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-outline-variant/20 bg-surface-container-low/40">
          <Detail r={r} />
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
// Inline metric — replaces the old gradient stat-tile boxes. Just a number,
// label, and (optionally) icon and tone, sitting in a wrap-friendly row.
// ─────────────────────────────────────────────────────────────────────────────
function Metric({ icon: Icon, value, label, tone }) {
  const valueTone = {
    success: 'text-tertiary',
    warn:    'text-calm-amber',
    primary: 'text-primary-700',
  }[tone] || 'text-on-surface';
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {Icon && <Icon className={`h-3.5 w-3.5 self-center ${valueTone} opacity-80`} strokeWidth={2} />}
      <strong className={`font-display font-extrabold tabular text-base sm:text-lg leading-none ${valueTone}`}>{value}</strong>
      <span className="text-[12px] uppercase tracking-wider font-semibold text-on-surface-variant">{label}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state — shown when the user has no events at all.
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="card p-12 text-center space-y-4">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 mx-auto">
        <Users className="h-6 w-6" strokeWidth={2.25} />
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
