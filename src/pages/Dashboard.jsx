import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Ticket, CalendarDays, User, MapPin, BedDouble, Pencil, CalendarPlus, Download, ArrowRight,
} from 'lucide-react';
import { api } from '../api.js';
import { downloadICS } from '../lib/download.js';
import { useAuth } from '../authContext.jsx';

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) : '—';
}
function countdownLabel(days) {
  if (days === null) return '';
  if (days < 0)  return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

export default function Dashboard() {
  const { user, isEndUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // End-users only see their own tickets — scope the listTickets call to
    // their authenticated email. Anonymous / staff users see the full list
    // the page was originally designed for.
    const seedEmail = isEndUser ? (user?.email || '') : '';
    api.listTickets(seedEmail).then(setTickets);
    api.listEvents().then(setEvents);
  }, [isEndUser, user?.email]);

  const enriched = tickets.map((t) => ({
    ...t,
    event: events.find((e) => e.id === t.eventId),
  }));

  const upcoming = enriched
    .filter((t) => t.event?.startsAt && new Date(t.event.startsAt) >= new Date())
    .sort((a, b) => new Date(a.event.startsAt) - new Date(b.event.startsAt));
  const past = enriched
    .filter((t) => !t.event?.startsAt || new Date(t.event.startsAt) < new Date())
    .sort((a, b) => new Date(b.event?.startsAt || 0) - new Date(a.event?.startsAt || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Tickets, schedules, and registration info.</p>
        </div>
        <button className="btn-soft">
          <User className="h-4 w-4" /> Account
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total tickets"   value={tickets.length}                                            icon={Ticket} />
        <StatCard label="Upcoming"        value={upcoming.length}                                          icon={CalendarDays} />
        <StatCard label="Checked in"      value={tickets.filter((t) => t.status === 'checked-in').length}  icon={CalendarDays} />
      </div>

      <section>
        <h2 className="text-xl font-extrabold tracking-tight mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="card p-10 text-center text-zinc-500">
            No upcoming tickets.{' '}
            {/* End-users can't browse events in the restricted nav — point
                them at the tickets they already have instead. */}
            {isEndUser ? (
              <Link to="/tickets" className="text-brand-700 font-semibold">View your tickets →</Link>
            ) : (
              <Link to="/events" className="text-brand-700 font-semibold">Browse events →</Link>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {upcoming.map((t) => <TicketCard key={t.code} t={t} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-extrabold tracking-tight mb-3">Past</h2>
          <div className="card divide-y divide-zinc-100">
            {past.map((t) => (
              <Link
                key={t.code}
                to={`/tickets/${t.code}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.eventTitle}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{fmtDate(t.event?.startsAt)}</div>
                </div>
                <span className={`chip ${t.status === 'checked-in' ? 'chip-selected' : ''}`}>
                  {t.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold tabular">{value}</div>
    </div>
  );
}

function TicketCard({ t }) {
  const days = daysUntil(t.event?.startsAt);
  return (
    <article className="card overflow-hidden">
      <div className={`relative h-20 bg-gradient-to-br ${t.event?.coverColor || 'from-brand-500 to-rose-500'} text-white`}>
        {t.event?.bannerUrl && (
          <img src={t.event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        )}
        <div className="relative h-full px-5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-90">{countdownLabel(days)}</div>
            <div className="font-extrabold tracking-tight truncate">{t.eventTitle}</div>
          </div>
          <span className="font-mono text-xs bg-white/15 ring-1 ring-white/20 rounded-md px-2 py-1">
            {t.code}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-zinc-700">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-brand-600" /> {fmtDate(t.event?.startsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5 text-brand-600" /> {t.ticketTypeName || '—'}
          </span>
          {t.event?.location && (
            <span className="inline-flex items-center gap-1.5 sm:col-span-2">
              <MapPin className="h-3.5 w-3.5 text-brand-600" /> {t.event.location}
            </span>
          )}
          {t.accommodationName && (
            <span className="inline-flex items-center gap-1.5 sm:col-span-2">
              <BedDouble className="h-3.5 w-3.5 text-brand-600" /> {t.accommodationName}
            </span>
          )}
          {t.roomLabel && (
            <span className="inline-flex items-center gap-1.5 sm:col-span-2 text-zinc-500">
              ↳ {t.roomLabel}
            </span>
          )}
          {t.seatLabel && (
            <span className="inline-flex items-center gap-1.5 sm:col-span-2 font-semibold text-amber-700">
              Seat <span className="tabular">{t.seatLabel}</span>
            </span>
          )}
        </div>

        {t.event?.schedule?.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer font-bold uppercase tracking-wider text-zinc-500 hover:text-ink">
              Schedule
            </summary>
            <ul className="mt-2 space-y-1.5">
              {t.event.schedule.slice(0, 3).map((s, i) => (
                <li key={i}>
                  <span className="font-semibold text-zinc-700">{s.day}:</span>{' '}
                  <span className="text-zinc-600">{s.items.slice(0, 2).join(' · ')}</span>
                </li>
              ))}
              {t.event.schedule.length > 3 && (
                <li>
                  <Link to={`/tickets/${t.code}`} className="text-brand-700 font-semibold">
                    See full schedule →
                  </Link>
                </li>
              )}
            </ul>
          </details>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Link to={`/tickets/${t.code}`} className="btn-primary flex-1 min-w-[8rem]">
            View ticket <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => downloadICS({ ticket: t, event: t.event })}
            className="btn-ghost"
            disabled={!t.event?.startsAt}
            title="Add to calendar"
          >
            <CalendarPlus className="h-4 w-4" />
          </button>
          <Link to={`/tickets/${t.code}/edit`} className="btn-ghost" title="Edit registration">
            <Pencil className="h-4 w-4" />
          </Link>
          <Link to={`/tickets/${t.code}`} className="btn-ghost" title="Download / Print">
            <Download className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
