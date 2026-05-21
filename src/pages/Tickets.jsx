import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Mail, Ticket as TicketIcon, Search, CalendarDays, ChevronRight, Armchair,
} from 'lucide-react';
import { api } from '../api.js';
import { roleStyle, roleLabel } from '../mockData.js';
import { useAuth } from '../authContext.jsx';

// ── helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return null; }
}
function fmtFullDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
}
function isUpcoming(iso) {
  return iso && new Date(iso).getTime() >= Date.now() - 86_400_000; // within last day = still upcoming
}

// ── small ticket stub — denser than the old card so 3-4 fit per row on lg+ ─
function TicketStub({ ticket }) {
  const eventDate = fmtDate(ticket.eventStartsAt);
  const role = roleStyle(ticket.role || 'attendee');
  const checkedIn = ticket.status === 'checked-in';

  // Perforation sits closer to the left edge so the stub strip is narrower
  // and the title gets more breathing room at small card sizes.
  const PERF = '22%';
  const cardMask = {
    maskImage:
      `radial-gradient(circle 10px at ${PERF} 0%, transparent 99%, black 100%),
       radial-gradient(circle 10px at ${PERF} 100%, transparent 99%, black 100%)`,
    maskComposite: 'intersect',
    WebkitMaskImage:
      `radial-gradient(circle 10px at ${PERF} 0%, transparent 99%, black 100%),
       radial-gradient(circle 10px at ${PERF} 100%, transparent 99%, black 100%)`,
    WebkitMaskComposite: 'source-in',
  };

  return (
    <Link
      to={`/tickets/${ticket.code}`}
      className="group block transition-all duration-200 hover:-translate-y-0.5"
    >
      <div
        className="relative aspect-[5/3] bg-zinc-900 text-white rounded-2xl shadow-ambient ring-1 ring-black/5 group-hover:shadow-ambient-lg overflow-hidden"
        style={cardMask}
      >
        {/* Dashed perforation */}
        <div
          className="absolute top-3 bottom-3 border-l border-dashed border-white/20 pointer-events-none"
          style={{ left: PERF }}
        />

        {/* LEFT STRIP — vertical "Your ticket" label */}
        <span
          className="absolute top-1/2 text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-[0.36em] text-white/50 whitespace-nowrap"
          style={{
            left: `calc(${PERF} / 2)`,
            transform: 'translate(-50%, -50%) rotate(180deg)',
            writingMode: 'vertical-rl',
          }}
        >
          Your ticket
        </span>

        {/* RIGHT FACE */}
        <div
          className="absolute inset-y-0 right-0 flex flex-col px-3.5 sm:px-4 py-3 sm:py-3.5"
          style={{ left: PERF }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/40">
              Gospelar
            </span>
            {checkedIn && (
              <span className="text-[8.5px] font-bold uppercase tracking-wider rounded-full bg-tertiary/20 text-tertiary-container px-1.5 py-0.5 ring-1 ring-tertiary/30">
                Checked in
              </span>
            )}
          </div>

          {/* Title — clamped to 2 lines so layout stays predictable at every width */}
          <div className="flex-1 flex items-center px-0.5 min-h-0">
            <h3 className="font-display text-base sm:text-lg lg:text-xl font-extrabold leading-[1.05] tracking-tight line-clamp-2">
              {ticket.eventTitle || 'Untitled event'}
            </h3>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-white truncate min-w-0 max-w-[60%]">
                {ticket.attendeeName || 'Guest'}
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-gradient-to-r ${role.badgeColor} text-white`}>
                {roleLabel(ticket.role || 'attendee')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[9.5px] text-white/45">
              <span className="font-mono tabular tracking-tight truncate">{ticket.code}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {ticket.seatLabel && (
                  <span className="inline-flex items-center gap-0.5 text-white/65 font-semibold">
                    <Armchair className="h-3 w-3" strokeWidth={2} /> {ticket.seatLabel}
                  </span>
                )}
                {eventDate && (
                  <>
                    {ticket.seatLabel && <span className="h-0.5 w-0.5 rounded-full bg-white/45" />}
                    <span>{eventDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── stat tile in the summary strip ─────────────────────────────────────────
function StatTile({ icon: Icon, value, label, tone = 'primary' }) {
  const tones = {
    primary: 'text-primary-700',
    success: 'text-tertiary',
    muted:   'text-on-surface-variant',
  };
  return (
    <div className="flex items-center gap-2.5">
      {Icon && (
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-low ${tones[tone]} ring-1 ring-outline-variant/30`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      )}
      <div>
        <div className="font-display font-extrabold text-lg leading-none tabular">{value}</div>
        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface-variant mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Tickets() {
  const { user, isEndUser } = useAuth();
  const [email, setEmail]       = useState(user?.email || '');
  const [tickets, setTickets]   = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [query, setQuery]       = useState('');

  useEffect(() => {
    const seedEmail = isEndUser ? (user?.email || '') : '';
    setLoading(true);
    api.listTickets(seedEmail)
      .then((list) => { setTickets(list); setSearched(!!seedEmail); })
      .finally(() => setLoading(false));
  }, [isEndUser, user?.email]);

  async function lookup(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const list = await api.listTickets(email);
    setTickets(list);
    setSearched(true);
    setLoading(false);
  }

  // Split into upcoming + past so the page reads as a small dashboard rather
  // than one undifferentiated grid.
  const { upcoming, past, checkedIn } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? tickets.filter((t) => {
          const hay = [t.eventTitle, t.attendeeName, t.code, t.seatLabel, t.attendeeEmail]
            .filter(Boolean).join(' ').toLowerCase();
          return hay.includes(q);
        })
      : tickets;
    const upcoming = filtered
      .filter((t) => isUpcoming(t.eventStartsAt))
      .sort((a, b) => new Date(a.eventStartsAt || 0) - new Date(b.eventStartsAt || 0));
    const past = filtered
      .filter((t) => !isUpcoming(t.eventStartsAt))
      .sort((a, b) => new Date(b.eventStartsAt || 0) - new Date(a.eventStartsAt || 0));
    const checkedIn = tickets.filter((t) => t.status === 'checked-in').length;
    return { upcoming, past, checkedIn };
  }, [tickets, query]);

  const hasAny = tickets.length > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className="inline-flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-glow"
          style={{ backgroundImage: 'linear-gradient(135deg,#0b3a8a 0%, #1656c2 100%)' }}
        >
          <TicketIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-extrabold tracking-tight text-on-surface text-xl sm:text-2xl leading-tight">
            My tickets
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-1">
            {isEndUser
              ? <>Tickets registered to <strong className="text-on-surface">{user?.email}</strong>.</>
              : 'Look up tickets by email.'}
          </p>
        </div>
      </div>

      {/* Inline stats — only when we have something to summarise */}
      {hasAny && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-outline-variant/25 py-3">
          <StatTile icon={TicketIcon}   value={tickets.length} label="total"     tone="primary" />
          <StatTile icon={CalendarDays} value={upcoming.length} label="upcoming" tone="primary" />
          <StatTile                     value={checkedIn}      label="checked-in" tone="success" />
          <StatTile                     value={past.length}    label="past"      tone="muted" />
        </div>
      )}

      {/* Email lookup (anonymous / staff) — flat, no card chrome */}
      {!isEndUser && (
        <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input pl-9 h-11"
            />
          </div>
          <button className="btn-primary !px-5" disabled={loading}>
            {loading ? 'Searching…' : 'Find tickets'}
          </button>
        </form>
      )}

      {/* Filter row — only when there's anything to filter */}
      {hasAny && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by event, name, seat, code…"
            className="input pl-9 h-11"
            inputMode="search"
          />
        </div>
      )}

      {/* Lists */}
      {loading ? (
        <div className="text-center text-on-surface-variant py-12">Loading tickets…</div>
      ) : !hasAny ? (
        <EmptyState searched={searched} />
      ) : (upcoming.length === 0 && past.length === 0) ? (
        <div className="text-center text-on-surface-variant py-12">No tickets match “{query}”.</div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Section title="Upcoming" count={upcoming.length}>
              <Grid>
                {upcoming.map((t) => <TicketStub key={t.code} ticket={t} />)}
              </Grid>
            </Section>
          )}

          {past.length > 0 && (
            <Section title="Past" count={past.length} dim>
              <Grid>
                {past.map((t) => <TicketStub key={t.code} ticket={t} />)}
              </Grid>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, dim, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className={`font-display font-extrabold tracking-tight text-lg ${dim ? 'text-on-surface-variant' : 'text-on-surface'}`}>
          {title}
        </h2>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant tabular">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }) {
  // Denser grid: phones 1-up, tablets 2-up, laptops 3-up, big screens 4-up.
  // Smaller cards (aspect-[5/3]) keep 4-up readable on a 1280px window.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {children}
    </div>
  );
}

function EmptyState({ searched }) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 mx-auto">
        <TicketIcon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="font-display font-bold text-lg text-on-surface">
        {searched ? 'No tickets found' : 'You don\'t have any tickets yet'}
      </h3>
      <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
        {searched
          ? 'Try a different email, or register for an event to get your first ticket.'
          : 'Once you register for an event, your ticket will appear here.'}
      </p>
      <Link to="/events" className="btn-primary inline-flex items-center gap-1.5 mt-2">
        Browse events <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
