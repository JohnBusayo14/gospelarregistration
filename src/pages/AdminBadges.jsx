import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer, IdCard, Filter } from 'lucide-react';
import { api } from '../api.js';
import { TICKET_ROLES } from '../mockData.js';
import Badge from '../components/Badge.jsx';

// All badges for one event, printable on standard letter paper.
// 2 columns × N rows of 3.4" × 2.13" CR80 cards fits nicely on US Letter.
export default function AdminBadges() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [church, setChurch] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ev = await api.getEvent(id);
      setEvent(ev);
      if (ev?.churchId) setChurch(await api.getChurch(ev.churchId));
      setTickets(await api.listEventTickets(id));
      setLoading(false);
    })();
  }, [id]);

  const filtered = useMemo(() => {
    return filter === 'all'
      ? tickets
      : tickets.filter((t) => (t.role || 'attendee') === filter);
  }, [tickets, filter]);

  // Counts per role for the filter pills.
  const counts = useMemo(() => {
    const c = { all: tickets.length };
    for (const r of TICKET_ROLES) c[r.id] = tickets.filter((t) => (t.role || 'attendee') === r.id).length;
    return c;
  }, [tickets]);

  if (loading) return <div className="text-zinc-500">Loading…</div>;
  if (!event) {
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-500">Event not found.</p>
        <Link to="/admin" className="btn-soft mt-4">Back to admin</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar — hidden from print */}
      <div className="print:hidden flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link to={`/admin/events/${id}/edit`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to event
          </Link>
          <button onClick={() => window.print()} className="btn-primary">
            <Printer className="h-4 w-4" /> Print {filtered.length} badge{filtered.length === 1 ? '' : 's'}
          </button>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Badges · {event.title}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Cardstock sheet, 2 per row at CR80 size (3.4″ × 2.13″). Use scissors or a guillotine on the crop marks.
          </p>
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter
          </span>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All ({counts.all})
          </FilterChip>
          {TICKET_ROLES.map((r) => (
            <FilterChip
              key={r.id}
              active={filter === r.id}
              onClick={() => setFilter(r.id)}
              accent={r.badgeColor}
            >
              {r.label} ({counts[r.id]})
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Print sheet */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">
          No tickets in this filter. Try a different role or register some attendees.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:gap-2 justify-items-center">
          {filtered.map((t) => (
            <Badge key={t.code} ticket={t} event={event} church={church} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, accent, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-brand-600 text-white shadow-glow'
          : 'bg-white ring-1 ring-zinc-200 text-zinc-700 hover:ring-zinc-300'
      }`}
    >
      {accent && (
        <span className={`h-2 w-2 rounded-full bg-gradient-to-br ${accent}`} />
      )}
      {children}
    </button>
  );
}
