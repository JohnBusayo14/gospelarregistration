import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, Users } from 'lucide-react';
import { api } from '../api.js';
import { totalSeatsTaken, totalSeatsTotal } from '../mockData.js';

function fmt(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }) : '—';
}

export default function Home() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.listEvents().then(setEvents);
  }, []);

  const featured = events[0];

  return (
    <div className="space-y-16">
      {/* Hero — asymmetric editorial layout. White space drives the eye. */}
      <section className="relative overflow-hidden rounded-2xl text-white shadow-ambient-lg">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(135deg, #061f4c 0%, #0b3a8a 45%, #1656c2 100%)' }}
        />
        {/* Oversized lit-from-within orbs. */}
        <div
          className="absolute -top-32 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: '#b9d3ff' }}
        />
        <div
          className="absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: '#a4f3d1' }}
        />

        <div className="relative px-8 sm:px-16 py-16 sm:py-24 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-rail"
                style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary-fixed" />
            Registration open
          </span>
          <h1 className="mt-6 font-display text-5xl sm:text-display-lg leading-[1.05] tracking-tight">
            {featured?.title || 'Christian events, simplified.'}
          </h1>
          <p className="mt-5 text-white/85 text-lg max-w-xl leading-relaxed">
            {featured?.tagline ||
              'One place to register, manage tickets, and check in for retreats, camps, and church gatherings.'}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {featured && (
              <Link
                to={`/events/${featured.id}`}
                className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-ambient"
              >
                Register now <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            )}
            <Link
              to="/events"
              className="btn text-white backdrop-blur-rail"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              Browse all events
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-headline-sm text-on-surface">Upcoming events</h2>
            <p className="text-sm text-on-surface-variant mt-2">Retreats, camps, breakfasts, and more.</p>
          </div>
          <Link to="/events" className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-700 hover:text-primary-800">
            View all →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.slice(0, 3).map((ev) => {
            const total = totalSeatsTotal(ev);
            const left  = total - totalSeatsTaken(ev);
            return (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                className="card overflow-hidden hover:shadow-ambient-lg hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className={`h-32 bg-gradient-to-br ${ev.coverColor || 'from-primary-300 to-primary-700'}`} />
                <div className="p-8 space-y-6">
                  <div>
                    <div className="font-display font-bold text-lg tracking-tight text-on-surface group-hover:text-primary-700 transition">
                      {ev.title}
                    </div>
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
                      {total > 0 ? `${left} of ${total} seats left` : 'Open registration'}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
