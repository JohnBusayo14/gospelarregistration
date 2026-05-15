import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, CalendarDays, Clock, MapPin, Users, BedDouble, Ticket as TicketIcon, AlarmClock,
} from 'lucide-react';
import { api } from '../api.js';
import { totalSeatsTaken, totalSeatsTotal, roomTypeLabel } from '../mockData.js';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) : '—';
}
function fmtTime(d) {
  return d ? new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
}
function priceLabel(cents) {
  return cents ? `$${(cents / 100).toFixed(0)}` : 'Free';
}
function daysUntil(d) {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export default function EventDetails() {
  const { id } = useParams();
  const [ev, setEv] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEvent(id).then(async (data) => {
      setEv(data || null);
      if (data?.churchId) setChurch(await api.getChurch(data.churchId));
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="text-zinc-500">Loading…</div>;
  if (!ev) {
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-500">We couldn’t find that event.</p>
        <Link to="/events" className="btn-soft mt-4">Back to events</Link>
      </div>
    );
  }

  const total    = totalSeatsTotal(ev);
  const taken    = totalSeatsTaken(ev);
  const seatsLeft = total - taken;
  const soldOut  = seatsLeft <= 0;
  const days     = daysUntil(ev.registrationDeadline);
  const closed   = days !== null && days < 0;
  const canRegister = !soldOut && !closed;

  return (
    <div className="space-y-10">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant hover:text-on-surface">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> All events
      </Link>

      <div className={`rounded-2xl overflow-hidden bg-gradient-to-br ${ev.coverColor || 'from-primary-700 to-primary-500'} text-white relative shadow-ambient-lg`}>
        {ev.bannerUrl && (
          <img src={ev.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        )}
        <div
          className="absolute -top-20 -right-16 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: '#b9d3ff' }}
        />
        <div className="relative px-8 sm:px-14 py-14 sm:py-20">
          {church && (
            <div className="flex items-center gap-2 mb-4">
              <span className={`h-6 w-6 rounded-md bg-gradient-to-br ${church.logoColor} ring-1 ring-white/30`} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
                Hosted by {church.name}
              </span>
            </div>
          )}
          <h1 className="font-display text-display-md sm:text-display-lg leading-[1.05] tracking-tight">{ev.title}</h1>
          <p className="mt-4 text-white/85 text-lg max-w-2xl leading-relaxed">{ev.tagline}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-10">
            <h2 className="font-display text-headline-sm text-on-surface">About this event</h2>
            <p className="text-sm text-on-surface-variant mt-4 leading-relaxed whitespace-pre-line">{ev.summary}</p>
          </div>

          {ev.ticketTypes?.length > 0 && (
            <div className="card p-10">
              <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-3">
                <TicketIcon className="h-5 w-5 text-primary-700" strokeWidth={1.5} /> Ticket options
              </h2>
              <ul className="mt-6 space-y-2">
                {ev.ticketTypes.map((t) => {
                  const left = (t.capacity || 0) - (t.sold || 0);
                  return (
                    <li key={t.id} className="surface-inset p-5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-on-surface">{t.name}</div>
                        <div className="text-xs text-on-surface-variant mt-1 leading-relaxed">{t.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-lg tabular text-on-surface">{priceLabel(t.priceCents)}</div>
                        <div className="text-[11px] uppercase tracking-wide text-on-surface-variant mt-1">
                          {left <= 0 ? 'Sold out' : `${left} left`}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {ev.accommodation?.length > 0 && (
            <div className="card p-10">
              <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-3">
                <BedDouble className="h-5 w-5 text-primary-700" strokeWidth={1.5} /> Accommodation
              </h2>
              <ul className="mt-6 space-y-2">
                {ev.accommodation.map((a) => {
                  const left = (a.capacity || 0) - (a.taken || 0);
                  return (
                    <li key={a.id} className="surface-inset p-5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-on-surface">{a.name}</div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="chip">{roomTypeLabel(a.type)}</span>
                          <span className={`chip ${a.sharing === 'private' ? 'chip-selected' : ''}`}>
                            {a.sharing === 'private' ? 'Private' : 'Shared'}
                          </span>
                        </div>
                        {a.description && <div className="text-xs text-on-surface-variant mt-2 leading-relaxed">{a.description}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display font-bold text-lg tabular text-on-surface">
                          {a.priceCents ? `+${priceLabel(a.priceCents)}` : 'Included'}
                        </div>
                        <div className="text-[11px] uppercase tracking-wide text-on-surface-variant mt-1">
                          {left <= 0 ? 'Full' : `${left} left`}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {ev.schedule?.length > 0 && (
            <div className="card p-10">
              <h2 className="font-display text-headline-sm text-on-surface">Schedule</h2>
              <ul className="mt-6 space-y-5">
                {ev.schedule.map((s, i) => (
                  <li key={i}>
                    <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary-700">{s.day}</div>
                    <ul className="mt-2 text-sm text-on-surface space-y-1 leading-relaxed">
                      {s.items.map((it, j) => <li key={j}>· {it}</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-8 space-y-5">
            <div className="flex items-start gap-3 text-sm text-on-surface">
              <CalendarDays className="h-4 w-4 text-primary-700 mt-0.5" strokeWidth={1.5} />
              <div>
                <div className="font-semibold">{fmtDate(ev.startsAt)}</div>
                <div className="text-xs text-on-surface-variant mt-0.5">to {fmtDate(ev.endsAt)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface">
              <Clock className="h-4 w-4 text-primary-700" strokeWidth={1.5} />
              <span>{fmtTime(ev.startsAt)} start</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface">
              <MapPin className="h-4 w-4 text-primary-700" strokeWidth={1.5} />
              <span>{ev.location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface">
              <Users className="h-4 w-4 text-primary-700" strokeWidth={1.5} />
              <span>{soldOut ? 'Sold out' : `${seatsLeft} seats left of ${total}`}</span>
            </div>
            {ev.registrationDeadline && (
              <div className={`flex items-center gap-3 text-sm ${closed ? 'text-muted-coral' : 'text-on-surface'}`}>
                <AlarmClock className="h-4 w-4" strokeWidth={1.5} />
                <span>
                  {closed
                    ? 'Registration closed'
                    : days === 0
                      ? 'Registration closes today'
                      : `Registration closes in ${days} day${days === 1 ? '' : 's'}`}
                </span>
              </div>
            )}
            <Link
              to={canRegister ? `/events/${ev.id}/register` : '#'}
              className={`btn-primary w-full mt-2 ${canRegister ? '' : 'pointer-events-none opacity-50'}`}
            >
              {soldOut ? 'Sold out' : closed ? 'Registration closed' : 'Register'}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
