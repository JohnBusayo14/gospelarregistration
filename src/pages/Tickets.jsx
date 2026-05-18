import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Mail, CalendarDays, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { api } from '../api.js';
import { groupTypeStyle, roleStyle, roleLabel } from '../mockData.js';
import { useAuth } from '../authContext.jsx';

function qrSrc(code, size = 160) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}`;
}

function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return null; }
}

// PILOT-style ticket stub card: dark main body on the left with the event
// title as the dominant element, a dashed perforation, and a white "tear-off"
// stub on the right with the QR + status. The vertical YOUR TICKET label
// hugs the left edge for that physical-ticket feel.
function TicketStub({ ticket }) {
  const eventDate = fmtDate(ticket.eventStartsAt);
  const g = ticket.groupName ? groupTypeStyle(ticket.groupType) : null;
  const role = roleStyle(ticket.role || 'attendee');
  const checkedIn = ticket.status === 'checked-in';

  return (
    <Link
      to={`/tickets/${ticket.code}`}
      className="group block transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative grid grid-cols-[1fr_128px] h-44 sm:h-48 overflow-hidden rounded-2xl shadow-ambient-lg ring-1 ring-black/5 group-hover:shadow-glow">
        {/* DARK MAIN BODY */}
        <div className="relative bg-zinc-900 text-white pl-9 pr-5 py-5 flex flex-col justify-between min-w-0">
          {/* vertical brand mark on the far left edge */}
          <span
            className="absolute left-2.5 top-1/2 text-[9px] font-bold uppercase tracking-[0.4em] text-white/40 whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            Your ticket
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
              <span>Gospelar</span>
              <span className="h-0.5 w-0.5 rounded-full bg-white/40" />
              <span className="font-mono normal-case tracking-wider truncate">{ticket.code}</span>
            </div>
            <h3 className="mt-2.5 font-display text-lg sm:text-xl font-extrabold leading-[1.1] tracking-tight line-clamp-2">
              {ticket.eventTitle || 'Untitled event'}
            </h3>
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white truncate">
                {ticket.attendeeName || 'Guest'}
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-gradient-to-r ${role.badgeColor} text-white`}>
                {roleLabel(ticket.role || 'attendee')}
              </span>
            </div>
            <div className="text-[10px] text-white/55 flex items-center gap-3 flex-wrap">
              {eventDate && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {eventDate}
                </span>
              )}
              {ticket.eventLocation && (
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3" /> <span className="truncate max-w-[140px]">{ticket.eventLocation}</span>
                </span>
              )}
            </div>
            {g && (
              <div className="flex">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${g.chip}`}>
                  {g.emoji && <span>{g.emoji}</span>}
                  <span className="truncate max-w-[120px]">{ticket.groupName}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* dashed perforation between dark + light */}
        <div className="absolute top-3 bottom-3 right-[128px] border-l border-dashed border-white/35 pointer-events-none" />

        {/* WHITE STUB — QR + status */}
        <div className="bg-white flex flex-col items-center justify-center gap-2 px-3 py-4">
          <img
            src={qrSrc(ticket.code, 200)}
            alt={`QR for ${ticket.code}`}
            className="h-20 w-20 rounded-md"
          />
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              checkedIn
                ? 'bg-emerald-100 text-emerald-700'
                : ticket.status === 'confirmed'
                  ? 'bg-zinc-100 text-zinc-700'
                  : 'bg-amber-100 text-amber-700'
            }`}
          >
            {ticket.status}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Tickets() {
  const { user, isEndUser } = useAuth();
  // For signed-in end-users the email field is bypassed entirely — we auto-
  // load the tickets attached to their gmail and don't show the lookup form
  // (no need; they only see their own). Anonymous or staff users still get
  // the search-by-email lookup so a kiosk / admin can find any ticket.
  const [email, setEmail] = useState(user?.email || '');
  const [tickets, setTickets] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-load for end-users using their authenticated email. For others
    // we still hit api.listTickets('') so the staff view loads everything
    // it would have loaded before — preserves the existing behaviour.
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My tickets</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isEndUser
            ? <>Tickets registered to <strong>{user?.email}</strong>.</>
            : 'Look up tickets by email.'}
        </p>
      </div>

      {!isEndUser && (
        <form onSubmit={lookup} className="card p-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input pl-9"
            />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? 'Searching…' : 'Find tickets'}
          </button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {tickets.length === 0 ? (
          <div className="card p-10 text-center text-zinc-500 md:col-span-2 flex flex-col items-center gap-3">
            <TicketIcon className="h-8 w-8 text-zinc-300" />
            <span>{searched ? 'No tickets found for that email.' : 'Enter your email to find your tickets.'}</span>
          </div>
        ) : (
          tickets.map((t) => <TicketStub key={t.code} ticket={t} />)
        )}
      </div>
    </div>
  );
}
