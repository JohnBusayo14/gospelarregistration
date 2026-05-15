import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { api } from '../api.js';

function qrSrc(code, size = 240) {
  const data = `${window.location.origin}/check-in?code=${encodeURIComponent(code)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }) : '—';
}

// Visual preview of the confirmation email — the same content the backend
// will render server-side when /api/tickets/:code/email is wired up.
export default function EmailPreview() {
  const { code } = useParams();
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    api.getTicket(code).then(async (t) => {
      setTicket(t);
      if (t?.eventId) setEvent(await api.getEvent(t.eventId));
    });
  }, [code]);

  if (!ticket) return <div className="text-zinc-500">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link to={`/tickets/${code}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to ticket
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Confirmation email preview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          This is what {ticket.attendeeEmail} receives after registering. Real send is wired when the backend `/api/tickets/:code/email` endpoint ships.
        </p>
      </div>

      {/* Faux email-client chrome */}
      <div className="card overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-3 text-xs">
          <div className="flex justify-between text-zinc-500">
            <span>From: <strong className="text-ink">tickets@gospelar.app</strong></span>
            <span>{new Date(ticket.purchasedAt).toLocaleString()}</span>
          </div>
          <div className="text-zinc-500 mt-1">To: <strong className="text-ink">{ticket.attendeeEmail}</strong></div>
          <div className="text-zinc-500 mt-1">Subject: <strong className="text-ink">You’re registered — {ticket.eventTitle}</strong></div>
        </div>

        {/* Email body */}
        <div className="px-6 sm:px-8 py-8 text-[15px] leading-relaxed text-ink">
          <div className={`rounded-lg bg-gradient-to-br ${event?.coverColor || 'from-brand-500 to-rose-500'} text-white px-5 py-6 mb-6`}>
            <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">You’re in!</div>
            <div className="mt-1 text-xl font-extrabold tracking-tight">{ticket.eventTitle}</div>
          </div>

          <p>Hi {ticket.attendeeName.split(' ')[0]},</p>
          <p className="mt-3">
            Thanks for registering for <strong>{ticket.eventTitle}</strong>. Your ticket is below — show this QR code at check-in or use your code <span className="font-mono font-bold">{ticket.code}</span>.
          </p>

          <div className="my-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <img src={qrSrc(ticket.code)} alt="QR" className="h-44 w-44 ring-1 ring-zinc-200 rounded-lg bg-white" />
            <dl className="text-sm space-y-2 w-full">
              <Row label="Event"    value={ticket.eventTitle} />
              <Row label="When"     value={event ? fmtDate(event.startsAt) : '—'} />
              <Row label="Where"    value={event?.location || '—'} />
              <Row label="Ticket"   value={ticket.ticketTypeName || '—'} />
              {ticket.accommodationName && <Row label="Room" value={ticket.accommodationName} />}
              <Row label="Code"     value={<span className="font-mono">{ticket.code}</span>} />
            </dl>
          </div>

          <p>
            Need to make changes? Reply to this email and we’ll help. Look forward to seeing you{event?.location ? ` at ${event.location.split(',')[0]}` : ''}.
          </p>
          <p className="mt-4">Grace and peace,<br/><strong>The Gospelar team</strong></p>

          <hr className="my-6 border-zinc-200" />
          <p className="text-xs text-zinc-500">
            This is an automated confirmation. Save this email — you’ll need the QR code for entry.
          </p>
        </div>
      </div>

      <div className="card p-5 flex items-center gap-3 bg-calm-amber/10">
        <Mail className="h-5 w-5 text-calm-amber flex-shrink-0" />
        <p className="text-sm text-calm-amber">
          <strong>Heads up:</strong> until the backend email endpoint ships, real emails are not actually delivered.
          Each "send" is logged to <code className="font-mono text-xs">localStorage["gospelar.email-log.v1"]</code>.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 w-16 pt-0.5">{label}</dt>
      <dd className="flex-1 text-ink">{value}</dd>
    </div>
  );
}
