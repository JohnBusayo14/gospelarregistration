import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Mail, Ticket as TicketIcon } from 'lucide-react';
import { api } from '../api.js';
import { roleStyle, roleLabel } from '../mockData.js';
import { useAuth } from '../authContext.jsx';

function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return null; }
}

// PILOT-style ticket card. All-black face, single notch cut at the top of a
// dashed perforation line that splits a narrow YOUR TICKET strip from the
// dominant event title — the same composition as the reference image. The
// dashed line ends at a matching notch at the bottom for visual symmetry.
function TicketStub({ ticket }) {
  const eventDate = fmtDate(ticket.eventStartsAt);
  const role = roleStyle(ticket.role || 'attendee');

  // Perforation line sits at ~24% from the left edge. The notch mask is keyed
  // to the same percentage so the cuts land exactly on the seam. Using % (not
  // px) means the notch stays put regardless of card width.
  const PERF = '24%';
  const cardMask = {
    maskImage:
      `radial-gradient(circle 12px at ${PERF} 0%, transparent 99%, black 100%),
       radial-gradient(circle 12px at ${PERF} 100%, transparent 99%, black 100%)`,
    maskComposite: 'intersect',
    WebkitMaskImage:
      `radial-gradient(circle 12px at ${PERF} 0%, transparent 99%, black 100%),
       radial-gradient(circle 12px at ${PERF} 100%, transparent 99%, black 100%)`,
    WebkitMaskComposite: 'source-in',
  };

  return (
    <Link
      to={`/tickets/${ticket.code}`}
      className="group block transition-all duration-300 hover:-translate-y-1"
    >
      <div
        className="relative aspect-[4/3] bg-zinc-900 text-white rounded-3xl shadow-ambient-lg ring-1 ring-black/5 group-hover:shadow-glow overflow-hidden"
        style={cardMask}
      >
        {/* Dashed perforation line. Stops short of the notches so it doesn't
            visually crash into the U-cuts. */}
        <div
          className="absolute top-5 bottom-5 border-l border-dashed border-white/25 pointer-events-none"
          style={{ left: PERF }}
        />

        {/* LEFT STRIP — vertical YOUR TICKET tagline, centered along the
            short side of the strip. Lives in absolute layout because writing-
            mode plays badly with flex sizing for one-off labels. */}
        <span
          className="absolute top-1/2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.42em] text-white/55 whitespace-nowrap"
          style={{
            left: `calc(${PERF} / 2)`,
            transform: 'translate(-50%, -50%) rotate(180deg)',
            writingMode: 'vertical-rl',
          }}
        >
          Your ticket to attend
        </span>

        {/* RIGHT FACE — brand, event title (the visual focal point), and the
            attendee footer. Padding-left clears the perforation gutter. */}
        <div
          className="absolute inset-y-0 right-0 flex flex-col px-5 sm:px-7 py-5 sm:py-6"
          style={{ left: PERF }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/40">
            Gospelar
          </div>

          {/* Event title — the PILOT-logo position. Lets the title speak for
              the ticket; no other competing element in this band. */}
          <div className="flex-1 flex items-center justify-center px-2">
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold leading-[0.95] tracking-tight text-center line-clamp-3">
              {ticket.eventTitle || 'Untitled event'}
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white truncate">
                {ticket.attendeeName || 'Guest'}
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-gradient-to-r ${role.badgeColor} text-white`}>
                {roleLabel(ticket.role || 'attendee')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/45">
              <span className="font-mono tracking-tight">{ticket.code}</span>
              {eventDate && (
                <>
                  <span className="h-0.5 w-0.5 rounded-full bg-white/45" />
                  <span>{eventDate}</span>
                </>
              )}
            </div>
          </div>
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tickets.length === 0 ? (
          <div className="card p-10 text-center text-zinc-500 sm:col-span-2 lg:col-span-3 flex flex-col items-center gap-3">
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
