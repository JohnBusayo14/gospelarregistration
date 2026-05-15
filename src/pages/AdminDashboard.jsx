import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Plus, Users, Ticket, DollarSign, Pencil, Trash2, BedDouble, UsersRound } from 'lucide-react';
import { api } from '../api.js';
import { totalSeatsTaken, totalSeatsTotal, totalBeds, bedsFilled, roomTypeLabel, groupTypeStyle } from '../mockData.js';
import { useChurch } from '../churchContext.jsx';

export default function AdminDashboard() {
  const [allEvents, setAllEvents] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const { church } = useChurch();
  const nav = useNavigate();

  async function reload() {
    // Fetch events + tickets in parallel so the group rollup has data on first paint.
    const [evs, tks] = await Promise.all([
      api.adminEvents(),
      api.listTickets(''),
    ]);
    setAllEvents(evs);
    setAllTickets(tks);
  }
  useEffect(() => { reload(); }, []);

  async function remove(id) {
    if (!confirm('Delete this event?')) return;
    await api.deleteEvent(id);
    reload();
  }

  // Scope to the church the admin is currently managing. Legacy events with
  // no churchId stay visible everywhere so we don't hide work mid-migration.
  const events = church
    ? allEvents.filter((e) => !e.churchId || e.churchId === church.id)
    : allEvents;

  const totalRegistrations = events.reduce((s, e) => s + totalSeatsTaken(e), 0);
  const totalRevenueCents  = events.reduce(
    (s, e) => s + (e.ticketTypes || []).reduce((x, t) => x + (t.sold || 0) * (t.priceCents || 0), 0),
    0,
  );
  const eventsWithBeds = events.filter((e) => (e.accommodation || []).length > 0);
  const totalBedsAll   = events.reduce((s, e) => s + totalBeds(e),   0);
  const bedsFilledAll  = events.reduce((s, e) => s + bedsFilled(e),  0);

  // Group rollup — every batch registered with a `groupId` shows up as one row.
  // Scope to events visible to this church admin so cross-tenant groups don't
  // leak into the table. Tickets without `groupId` are solo registrations and
  // skip the rollup.
  const eventIds = new Set(events.map((e) => e.id));
  const groupRollup = (() => {
    const byId = new Map();
    for (const t of allTickets) {
      if (!t.groupId || !eventIds.has(t.eventId)) continue;
      const key = t.groupId;
      const row = byId.get(key) || {
        groupId: t.groupId, groupName: t.groupName, groupType: t.groupType,
        groupLeadEmail: t.groupLeadEmail, eventId: t.eventId, eventTitle: t.eventTitle,
        ticketCount: 0, checkedIn: 0,
      };
      row.ticketCount += 1;
      if (t.status === 'checked-in') row.checkedIn += 1;
      byId.set(key, row);
    }
    // Newest first by groupId substring is meaningless — sort by ticketCount DESC
    // so the largest groups float up where the admin spots them first.
    return [...byId.values()].sort((a, b) => b.ticketCount - a.ticketCount);
  })();
  const totalGroupTickets = groupRollup.reduce((s, g) => s + g.ticketCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {church
              ? <>Managing <strong className="text-ink">{church.name}</strong> · {events.length} event{events.length === 1 ? '' : 's'}</>
              : <>Manage events, registrations, and check-in.</>}
          </p>
        </div>
        <Link to="/admin/events/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New event
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active events', value: events.length, icon: Users },
          { label: 'Registrations', value: totalRegistrations, icon: Ticket },
          { label: 'Beds filled',   value: totalBedsAll ? `${bedsFilledAll}/${totalBedsAll}` : '—', icon: BedDouble },
          { label: 'Revenue',       value: `$${(totalRevenueCents / 100).toLocaleString()}`, icon: DollarSign },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            <div className="mt-2 text-3xl font-extrabold tabular">{s.value}</div>
          </div>
        ))}
      </div>

      {groupRollup.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-2">
            <h2 className="font-bold tracking-tight inline-flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-brand-600" /> Group registrations
            </h2>
            <span className="text-xs text-zinc-500">
              {groupRollup.length} group{groupRollup.length === 1 ? '' : 's'} · {totalGroupTickets} ticket{totalGroupTickets === 1 ? '' : 's'}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3 font-bold">Group</th>
                <th className="text-left px-5 py-3 font-bold">Event</th>
                <th className="text-left px-5 py-3 font-bold">Lead</th>
                <th className="text-right px-5 py-3 font-bold">Tickets</th>
                <th className="text-right px-5 py-3 font-bold">Checked in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {groupRollup.map((g) => {
                const style = groupTypeStyle(g.groupType);
                return (
                  <tr key={g.groupId} className="hover:bg-zinc-25">
                    <td className="px-5 py-3">
                      <div className="font-semibold flex items-center gap-2">
                        {style && <span>{style.emoji}</span>}
                        <span>{g.groupName}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5 font-mono">{g.groupId}</div>
                    </td>
                    <td className="px-5 py-3 text-zinc-700">{g.eventTitle}</td>
                    <td className="px-5 py-3 text-zinc-700 text-xs">{g.groupLeadEmail || '—'}</td>
                    <td className="px-5 py-3 text-right tabular font-semibold">{g.ticketCount}</td>
                    <td className="px-5 py-3 text-right tabular text-tertiary">{g.checkedIn}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {eventsWithBeds.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-brand-600" />
            <h2 className="font-bold tracking-tight">Accommodation occupancy</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {eventsWithBeds.map((ev) => (
              <li key={ev.id} className="p-5">
                <div className="font-semibold mb-3">{ev.title}</div>
                <ul className="space-y-2.5">
                  {ev.accommodation.map((a) => {
                    const cap = a.capacity || 0;
                    const taken = a.taken || 0;
                    const pct = cap ? Math.min(100, Math.round((taken / cap) * 100)) : 0;
                    const barColor = pct >= 100 ? 'bg-muted-coral' : pct >= 80 ? 'bg-calm-amber' : 'bg-primary-500';
                    return (
                      <li key={a.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.5fr_2fr_auto] gap-3 items-center text-sm">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{a.name}</div>
                          <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap gap-1.5">
                            <span className="chip">{roomTypeLabel(a.type)}</span>
                            <span className={`chip ${a.sharing === 'private' ? 'chip-selected' : ''}`}>
                              {a.sharing === 'private' ? 'Private' : 'Shared'}
                            </span>
                          </div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="tabular text-xs text-zinc-700 whitespace-nowrap text-right">
                          {taken}/{cap}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="font-bold tracking-tight">All events</h2>
        </div>
        {events.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">
            No events yet.{' '}
            <Link to="/admin/events/new" className="text-brand-700 font-semibold">Create the first one →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3 font-bold">Event</th>
                <th className="text-left px-5 py-3 font-bold">Date</th>
                <th className="text-left px-5 py-3 font-bold">Seats</th>
                <th className="text-left px-5 py-3 font-bold">Tickets</th>
                <th className="text-right px-5 py-3 font-bold w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {events.map((ev) => {
                const total = totalSeatsTotal(ev);
                const taken = totalSeatsTaken(ev);
                const pct = total ? Math.round((taken / total) * 100) : 0;
                return (
                  <tr
                    key={ev.id}
                    className="hover:bg-zinc-25 cursor-pointer"
                    onClick={() => nav(`/admin/events/${ev.id}/edit`)}
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold">{ev.title}</div>
                      <div className="text-xs text-zinc-500">{ev.location}</div>
                    </td>
                    <td className="px-5 py-3 text-zinc-700">
                      {ev.startsAt ? new Date(ev.startsAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-zinc-700 w-48">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="tabular text-xs text-zinc-600">{taken}/{total}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-700">{(ev.ticketTypes || []).length}</td>
                    <td
                      className="px-5 py-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link to={`/admin/events/${ev.id}/edit`} className="btn-ghost !px-2" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => remove(ev.id)} className="btn-ghost !px-2 text-muted-coral hover:bg-muted-coral/10" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
