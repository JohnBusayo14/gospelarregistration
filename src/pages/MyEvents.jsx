import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Plus, Search, Users } from 'lucide-react';
import { api } from '../api.js';
import { totalSeatsTaken, totalSeatsTotal, lowestPriceLabel } from '../mockData.js';

function fmt(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }) : '—';
}

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listMyEvents()
      .then((list) => setEvents(Array.isArray(list) ? list : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.tagline || '').toLowerCase().includes(q),
    );
  }, [events, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="font-display text-display-md text-on-surface">My events</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            {loading
              ? 'Loading…'
              : `${filtered.length} ${filtered.length === 1 ? 'event' : 'events'} you've created`}
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" strokeWidth={1.5} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your events…"
              className="input pl-11"
            />
          </div>
          <Link to="/events/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" strokeWidth={2} />
            New event
          </Link>
        </div>
      </div>

      {!loading && events.length === 0 ? (
        <div className="card p-12 text-center text-on-surface-variant space-y-4">
          <p>You haven't created any events yet.</p>
          <Link to="/events/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Create your first event
          </Link>
        </div>
      ) : !loading && filtered.length === 0 ? (
        <div className="card p-12 text-center text-on-surface-variant">
          No events match “{query}”.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ev) => {
            const total = totalSeatsTotal(ev);
            const seatsLeft = total - totalSeatsTaken(ev);
            const soldOut = total > 0 && seatsLeft <= 0;
            return (
              <div
                key={ev.id}
                className="card overflow-hidden hover:shadow-ambient-lg hover:-translate-y-0.5 transition-all duration-300 group flex flex-col"
              >
                <Link to={`/events/${ev.id}`} className="block">
                  <div className={`h-36 bg-gradient-to-br ${ev.coverColor || 'from-primary-300 to-primary-700'} relative`}>
                    {ev.bannerUrl && (
                      <img src={ev.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    )}
                    <span className="absolute top-4 left-4 chip bg-white/90 text-on-surface backdrop-blur-rail">
                      {lowestPriceLabel(ev)}
                    </span>
                    {soldOut && (
                      <span className="absolute top-4 right-4 chip chip-urgent backdrop-blur-rail">
                        Sold out
                      </span>
                    )}
                  </div>
                </Link>
                <div className="p-8 space-y-6 flex-1 flex flex-col">
                  <div>
                    <Link to={`/events/${ev.id}`} className="block">
                      <div className="font-display font-bold text-lg tracking-tight text-on-surface group-hover:text-primary-700 transition">
                        {ev.title}
                      </div>
                    </Link>
                    <div className="text-xs text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">
                      {ev.tagline}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} /> {fmt(ev.startsAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> {ev.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {soldOut
                        ? 'Sold out'
                        : total > 0
                          ? `${seatsLeft} of ${total} seats left`
                          : 'Open registration'}
                    </div>
                  </div>
                  <div className="mt-auto pt-2">
                    <Link
                      to={`/events/${ev.id}`}
                      className="btn-secondary inline-flex items-center gap-2 text-xs"
                    >
                      View event page
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
