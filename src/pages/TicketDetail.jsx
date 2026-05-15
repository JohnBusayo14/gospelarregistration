import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Printer, Mail, BedDouble, CalendarDays, MapPin, Ticket as TicketIcon,
  Copy, Check, CalendarPlus, Pencil, Download, IdCard,
} from 'lucide-react';
import { api } from '../api.js';
import { downloadICS } from '../lib/download.js';
import { groupTypeStyle } from '../mockData.js';

function qrSrc(code, size = 320) {
  // Encode the check-in URL so a scanner opens the staff check-in flow directly.
  const data = `${window.location.origin}/check-in?code=${encodeURIComponent(code)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

function fmtRange(start, end) {
  if (!start) return '—';
  const a = new Date(start);
  const b = end ? new Date(end) : null;
  const d = (x) => x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const t = (x) => x.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!b) return `${d(a)} · ${t(a)}`;
  const sameDay = a.toDateString() === b.toDateString();
  return sameDay ? `${d(a)} · ${t(a)} – ${t(b)}` : `${d(a)} – ${d(b)}`;
}

export default function TicketDetail() {
  const { code } = useParams();
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [emailed, setEmailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getTicket(code).then(async (t) => {
      setTicket(t);
      if (t?.eventId) setEvent(await api.getEvent(t.eventId));
      setLoading(false);
    });
  }, [code]);

  async function resend() {
    setEmailing(true);
    await api.sendConfirmationEmail(code);
    setEmailed(true);
    setEmailing(false);
    setTimeout(() => setEmailed(false), 2500);
  }

  function copyCode() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) return <div className="text-zinc-500">Loading…</div>;
  if (!ticket) {
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-500">Ticket not found.</p>
        <Link to="/tickets" className="btn-soft mt-4">Back to tickets</Link>
      </div>
    );
  }

  const checkedIn = ticket.status === 'checked-in';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link to="/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All tickets
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link to={`/tickets/${code}/edit`} className="btn-ghost">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <Link to={`/tickets/${code}/badge`} className="btn-ghost">
            <IdCard className="h-4 w-4" /> Badge
          </Link>
          <button
            onClick={() => downloadICS({ ticket, event })}
            className="btn-ghost"
            disabled={!event?.startsAt}
            title={event?.startsAt ? 'Save .ics file' : 'Event date not set'}
          >
            <CalendarPlus className="h-4 w-4" /> Add to calendar
          </button>
          <button onClick={resend} disabled={emailing} className="btn-soft">
            <Mail className="h-4 w-4" /> {emailing ? 'Sending…' : emailed ? 'Email sent' : 'Re-send email'}
          </button>
          <button onClick={() => window.print()} className="btn-primary">
            <Download className="h-4 w-4" /> Download / Print
          </button>
        </div>
      </div>

      <article className="card overflow-hidden print:shadow-none print:ring-0">
        {/* Header band */}
        <div className={`relative bg-gradient-to-br ${event?.coverColor || 'from-brand-500 to-rose-500'} text-white px-6 sm:px-10 py-8`}>
          {event?.bannerUrl && (
            <img src={event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          )}
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Admission ticket</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow">
              {ticket.eventTitle}
            </h1>
            {event && (
              <div className="mt-2 text-sm text-white/90 flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {fmtRange(event.startsAt, event.endsAt)}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Body: QR + details */}
        <div className="grid sm:grid-cols-[auto_1fr] gap-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3">
            <img
              src={qrSrc(ticket.code)}
              alt={`QR for ${ticket.code}`}
              className="h-56 w-56 rounded-xl ring-1 ring-zinc-200 bg-white"
            />
            <button onClick={copyCode} className="font-mono text-sm font-bold inline-flex items-center gap-1 hover:text-brand-700">
              {ticket.code}
              {copied ? <Check className="h-3.5 w-3.5 text-tertiary" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <Row label="Attendee"      value={<span className="font-bold text-base">{ticket.attendeeName}</span>} />
            <Row label="Email"         value={ticket.attendeeEmail} />
            {ticket.groupName && (() => {
              const g = groupTypeStyle(ticket.groupType);
              return (
                <Row label="Group" value={
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${g?.chip || 'bg-zinc-100 text-zinc-700'}`}>
                    {g && <span>{g.emoji}</span>}
                    <span>{ticket.groupName}</span>
                  </span>
                } />
              );
            })()}
            <Row label="Ticket type"   value={
              <span className="inline-flex items-center gap-1.5">
                <TicketIcon className="h-3.5 w-3.5 text-brand-600" /> {ticket.ticketTypeName || '—'}
              </span>
            } />
            {ticket.accommodationName && (
              <Row label="Accommodation" value={
                <span className="inline-flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-brand-600" /> {ticket.accommodationName}
                </span>
              } />
            )}
            <Row label="Status" value={
              <span className={`chip ${checkedIn ? 'chip-selected' : ''}`}>
                {ticket.status}
              </span>
            } />
            <Row label="Purchased" value={new Date(ticket.purchasedAt).toLocaleString()} />
            {ticket.checkedInAt && (
              <Row label="Checked in at" value={new Date(ticket.checkedInAt).toLocaleString()} />
            )}
          </div>
        </div>

        <div className="border-t border-dashed border-zinc-300 px-6 sm:px-8 py-4 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-2 print:border-zinc-400">
          <span>Present this QR at check-in. Code: <span className="font-mono">{ticket.code}</span></span>
          <span className="font-bold tracking-wider">GOSPELAR</span>
        </div>
      </article>

      {event?.schedule?.length > 0 && (
        <section className="card p-6">
          <h2 className="font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand-600" /> Event schedule
          </h2>
          <ul className="mt-3 space-y-3">
            {event.schedule.map((s, i) => (
              <li key={i}>
                <div className="text-xs font-bold tracking-wider uppercase text-brand-700">{s.day}</div>
                <ul className="mt-1 text-sm text-zinc-700 space-y-0.5">
                  {s.items.map((it, j) => <li key={j}>• {it}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 w-28 pt-0.5">{label}</span>
      <span className="flex-1 text-ink">{value}</span>
    </div>
  );
}
