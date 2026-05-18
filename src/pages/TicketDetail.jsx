import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Mail, BedDouble, CalendarDays, MapPin, Ticket as TicketIcon,
  Copy, Check, CalendarPlus, Pencil, Download, IdCard, DoorOpen, Armchair, Sparkles,
} from 'lucide-react';
import { api } from '../api.js';
import { downloadICS } from '../lib/download.js';
import { groupTypeStyle, roleStyle, roleLabel } from '../mockData.js';
import TicketTag from '../components/TicketTag.jsx';

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

// Single icon-prominent action button. Used in the toolbar above the ticket
// hero. Renders as a circular icon with the label below — same affordance
// whether it's a <Link> or a <button>.
function ActionTile({ icon: Icon, label, hint, onClick, to, disabled, primary }) {
  const circleClass = primary
    ? 'bg-zinc-900 text-white shadow-glow ring-zinc-900/10 group-hover:bg-zinc-800'
    : 'bg-white text-zinc-700 ring-zinc-200 group-hover:bg-zinc-50 group-hover:text-zinc-900';

  const inner = (
    <>
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ring-1 transition-all duration-200 group-hover:scale-105 ${circleClass}`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-600 leading-tight text-center max-w-[72px]">
        {label}
      </span>
    </>
  );

  const wrap = `group flex flex-col items-center gap-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`;

  if (to) {
    return <Link to={to} title={hint || label} className={wrap}>{inner}</Link>;
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={hint || label} className={wrap}>
      {inner}
    </button>
  );
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
    // Pass the loaded ticket so the helper doesn't have to rediscover it in
    // localStorage — on a device that opened this ticket via a shared link,
    // the localStorage copy never existed.
    await api.sendConfirmationEmail(ticket || code);
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
  const role = roleStyle(ticket.role || 'attendee');

  // Stub width chosen so a U-notch can be cut on the perforation line at a
  // fixed offset from the right edge. Kept identical across viewports so the
  // single mask-image declaration below works without media queries.
  const STUB_WIDTH = 200;
  const notchOffset = `calc(100% - ${STUB_WIDTH}px)`;
  const heroMaskStyle = {
    // Two radial gradients carve U-cuts at top + bottom of the perforation.
    // mask-composite: intersect means a pixel is opaque only if BOTH masks
    // are opaque — combining the two cuts into the same card silhouette.
    maskImage:
      `radial-gradient(circle 14px at ${notchOffset} 0, transparent 99%, black 100%),
       radial-gradient(circle 14px at ${notchOffset} 100%, transparent 99%, black 100%)`,
    maskComposite: 'intersect',
    WebkitMaskImage:
      `radial-gradient(circle 14px at ${notchOffset} 0, transparent 99%, black 100%),
       radial-gradient(circle 14px at ${notchOffset} 100%, transparent 99%, black 100%)`,
    WebkitMaskComposite: 'source-in',
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Back link sits above the action rail so the toolbar stays uncluttered. */}
      <div className="print:hidden">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All tickets
        </Link>
      </div>

      {/* Icon-prominent action rail. Each tile is a labeled circular button
          so the affordance is obvious without a hover/title. */}
      <div className="print:hidden card px-5 py-5">
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          <ActionTile
            icon={Pencil}
            label="Edit"
            hint="Edit attendee details"
            to={`/tickets/${code}/edit`}
          />
          <ActionTile
            icon={CalendarPlus}
            label="Calendar"
            hint={event?.startsAt ? 'Save .ics calendar file' : 'Event date not set'}
            onClick={() => downloadICS({ ticket, event })}
            disabled={!event?.startsAt}
          />
          <ActionTile
            icon={emailed ? Check : Mail}
            label={emailing ? 'Sending' : emailed ? 'Sent' : 'Email'}
            hint="Re-send the confirmation email"
            onClick={resend}
            disabled={emailing}
          />
          <ActionTile
            icon={IdCard}
            label="Badge"
            hint="Open the printable badge"
            to={`/tickets/${code}/badge`}
          />
          <ActionTile
            icon={Download}
            label="Download"
            hint="Print or save the ticket as PDF"
            onClick={() => window.print()}
            primary
          />
        </div>
      </div>

      {/* Quick-flash tag — what an attendee shows at the gate without scrolling. */}
      <section className="print:hidden">
        <div className="flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Quick-flash tag
        </div>
        <TicketTag ticket={ticket} />
        <p className="mt-2 text-xs text-zinc-500">
          Show this on your phone for fast entry, or scroll down for the full ticket.
        </p>
      </section>

      {/* ─── PILOT-STYLE HERO TICKET ──────────────────────────────────────
          Black main body holds the event identity (vertical YOUR TICKET
          tagline + huge event title). White stub on the right holds the
          QR + scan code. Notches are cut into the perforation seam via
          mask-image so the page background shows through the U-cuts. */}
      <article className="relative print:shadow-none">
        <div
          className="relative grid grid-cols-[1fr_200px] min-h-[380px] rounded-3xl overflow-hidden shadow-ambient-lg ring-1 ring-black/5"
          style={heroMaskStyle}
        >
          {/* DARK BODY */}
          <div className="relative bg-zinc-900 text-white pl-12 pr-6 py-8 sm:pl-14 sm:pr-8 sm:py-10 flex flex-col justify-between min-w-0">
            {/* Vertical YOUR TICKET tagline pinned to the left edge. */}
            <span
              className="absolute left-3 sm:left-4 top-1/2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.42em] text-white/40 whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
            >
              Your ticket to attend
            </span>

            {/* Subtle role accent stripe along the role color. Mirrors the
                badge color the door staff will look for. */}
            <div className={`absolute inset-y-8 left-9 sm:left-11 w-px bg-gradient-to-b ${role.badgeColor} opacity-50`} />

            {/* TOP: brand + meta */}
            <div className="space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/50">
                  Gospelar · Admission
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.16em] bg-white/10 text-white ring-1 ring-white/15">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  {roleLabel(ticket.role || 'attendee')}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-[0.95] tracking-tight">
                {ticket.eventTitle || 'Untitled event'}
              </h1>

              {event && (
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {fmtRange(event.startsAt, event.endsAt)}
                  </span>
                  {event.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {event.location}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* BOTTOM: attendee identity */}
            <div className="pt-6 mt-6 border-t border-white/10 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                Attendee
              </div>
              <div className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {ticket.attendeeName || 'Guest'}
              </div>
              {ticket.attendeeEmail && (
                <div className="text-xs text-white/55 truncate">{ticket.attendeeEmail}</div>
              )}
            </div>
          </div>

          {/* Dashed perforation line — sits between the two halves, just
              short of the notches so the dashes don't visually crash into
              the U-cuts. */}
          <div
            className="absolute top-7 bottom-7 border-l border-dashed border-zinc-300 pointer-events-none print:border-zinc-400"
            style={{ right: `${STUB_WIDTH}px` }}
          />

          {/* WHITE STUB — QR + code + status */}
          <div className="bg-white flex flex-col items-center justify-center gap-3 px-4 py-6">
            <img
              src={qrSrc(ticket.code, 200)}
              alt={`QR for ${ticket.code}`}
              className="h-32 w-32 sm:h-36 sm:w-36 rounded-lg"
            />
            <button
              onClick={copyCode}
              className="font-mono text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 text-zinc-700 hover:text-zinc-900 transition-colors"
            >
              {ticket.code}
              {copied
                ? <Check className="h-3 w-3 text-emerald-600" />
                : <Copy className="h-3 w-3 text-zinc-400" />}
            </button>
            <span
              className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] ${
                checkedIn
                  ? 'bg-emerald-100 text-emerald-700'
                  : ticket.status === 'confirmed'
                    ? 'bg-zinc-100 text-zinc-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
              {ticket.status}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 text-center px-1">
              Scan at check-in
            </span>
          </div>
        </div>
      </article>

      {/* ─── DETAILS TABLE ───────────────────────────────────────────────
          Everything that doesn't belong on the visual ticket — full meta
          for the registrant's own records, structured for quick scan. */}
      <article className="card p-6 sm:p-8 space-y-3 text-sm">
        <h2 className="font-display text-base font-bold tracking-tight text-zinc-900 mb-2 flex items-center gap-2">
          <TicketIcon className="h-4 w-4 text-brand-600" strokeWidth={1.75} />
          Ticket details
        </h2>

        <Row label="Attendee" value={<span className="font-bold text-base">{ticket.attendeeName}</span>} />
        <Row label="Email" value={ticket.attendeeEmail || <span className="text-zinc-400">—</span>} />
        {ticket.attendeePhone && <Row label="Phone" value={ticket.attendeePhone} />}
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
        <Row label="Ticket type" value={
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
        {ticket.roomLabel && (
          <Row label="Room" value={
            <span className="inline-flex items-center gap-1.5">
              <DoorOpen className="h-3.5 w-3.5 text-brand-600" /> {ticket.roomLabel}
            </span>
          } />
        )}
        {ticket.seatLabel && (
          <Row label="Seat" value={
            <span className="inline-flex items-center gap-1.5 font-bold tabular">
              <Armchair className="h-3.5 w-3.5 text-brand-600" /> {ticket.seatLabel}
            </span>
          } />
        )}
        <Row label="Purchased" value={new Date(ticket.purchasedAt).toLocaleString()} />
        {ticket.checkedInAt && (
          <Row label="Checked in" value={new Date(ticket.checkedInAt).toLocaleString()} />
        )}
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
      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 w-28 pt-0.5 shrink-0">{label}</span>
      <span className="flex-1 text-ink min-w-0 break-words">{value}</span>
    </div>
  );
}
