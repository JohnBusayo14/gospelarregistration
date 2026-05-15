import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { api } from '../api.js';
import Badge from '../components/Badge.jsx';

// Single attendee badge — designed for one-off printing or sharing as PDF.
export default function TicketBadge() {
  const { code } = useParams();
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link to={`/tickets/${code}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to ticket
        </Link>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer className="h-4 w-4" /> Print badge
        </button>
      </div>

      <div className="print:hidden">
        <h1 className="text-3xl font-extrabold tracking-tight">Badge preview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Print at 100% scale on cardstock. The badge is sized to CR80 (3.4″ × 2.13″).
        </p>
      </div>

      <div className="flex justify-center py-8 print:py-0">
        <Badge ticket={ticket} event={event} church={church} />
      </div>
    </div>
  );
}
