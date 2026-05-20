import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, IdCard, Ticket as TicketIcon } from 'lucide-react';
import { api } from '../api.js';
import Badge, { BadgePair } from '../components/Badge.jsx';
import TicketCard from '../components/TicketCard.jsx';

// Front + back lanyard badge AND the landscape conference ticket — one page,
// both artefacts. The "Print" button hides the chrome via the existing
// print:hidden utilities so any combination prints cleanly.
export default function TicketBadge() {
  const { code } = useParams();
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  // Lets the user toggle between the printable badge (portrait, 2 sides)
  // and the conference-ticket (landscape with stub). Both sit on the same
  // route so the URL stays clean.
  const [view, setView] = useState('badge'); // 'badge' | 'ticket'

  useEffect(() => {
    (async () => {
      const t = await api.getTicket(code);
      setTicket(t);
      if (t?.eventId) {
        const ev = await api.getEvent(t.eventId);
        setEvent(ev);
        if (ev?.churchId) setChurch(await api.getChurch(ev.churchId));
      }
      setLoading(false);
    })();
  }, [code]);

  if (loading) return <div className="text-zinc-500">Loading…</div>;
  if (!ticket) {
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-500">Ticket not found.</p>
        <Link to="/tickets" className="btn-soft mt-4">Back to tickets</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link to={`/tickets/${code}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to ticket
        </Link>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="print:hidden">
        <h1 className="text-3xl font-extrabold tracking-tight">Badge & ticket</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Front + back of the printable lanyard badge, and the landscape conference ticket with stub.
          Switch between the two below.
        </p>
      </div>

      {/* View toggle — keeps the print sheet focused on one artefact at a time */}
      <div className="print:hidden inline-flex rounded-full p-1 bg-surface-container-low ring-1 ring-outline-variant/30">
        <ToggleBtn active={view === 'badge'}  onClick={() => setView('badge')}  icon={IdCard}     label="Lanyard badge" />
        <ToggleBtn active={view === 'ticket'} onClick={() => setView('ticket')} icon={TicketIcon} label="Conference ticket" />
      </div>

      {view === 'badge' ? (
        <section className="space-y-3">
          <div className="print:hidden flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-primary-700" /> Front
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" /> Back
            </span>
            <span className="text-zinc-400 normal-case tracking-normal font-normal">
              Print on 2.5″ × 4″ portrait lanyard stock.
            </span>
          </div>
          <div className="py-8 print:py-0">
            <BadgePair ticket={ticket} event={event} church={church} />
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="print:hidden text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            <span className="text-zinc-400 normal-case tracking-normal font-normal">
              Landscape conference ticket — tear along the dashed line to keep the stub.
            </span>
          </div>
          <div className="py-6 print:py-0 flex justify-center">
            <TicketCard ticket={ticket} event={event} />
          </div>
        </section>
      )}
    </div>
  );
}

function ToggleBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-white text-on-surface ring-1 ring-primary-100 shadow-sm'
          : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </button>
  );
}
