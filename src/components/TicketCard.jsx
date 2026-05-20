// TicketCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Landscape, conference-ticket layout with a tear-off stub. Matches the
// reference comp: large attendee photo on the left, event title + date/time
// pills + venue + price on the main side, dashed perforation, and a stub on
// the right with condensed info + barcode.
//
// Rendering uses inline pixel sizes so the same component works on screen,
// in the email preview, and on a print sheet.
// ─────────────────────────────────────────────────────────────────────────────

import { Calendar, Clock, MapPin, Phone, Ticket as TicketIcon, Armchair } from 'lucide-react';

const PRIMARY = '#0b3a8a';

export default function TicketCard({ ticket, event }) {
  const photo = photoToSrc(ticket?.attendeePhoto || ticket?.attendeeProfile?.photo);
  const cover = event?.coverColor || 'from-primary-700 to-primary-500';
  const start = event?.startsAt ? new Date(event.startsAt) : null;
  const end   = event?.endsAt   ? new Date(event.endsAt)   : null;
  const dateLabel = start ? start.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'TBC';
  const timeLabel = formatTimeRange(start, end);
  const priceLabel = formatPrice(ticket?.priceCents);

  return (
    <article
      className="relative bg-white rounded-2xl overflow-hidden ring-1 ring-zinc-200 shadow-ambient flex"
      style={{ width: 'min(720px, 100%)', minHeight: '230px' }}
    >
      {/* ── MAIN SIDE ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Layered background: event gradient + curved white panel that
            holds the type. Matches the wavy two-tone comp. */}
        <div className={`absolute inset-0 bg-gradient-to-br ${cover}`} />
        {event?.bannerUrl && (
          <img src={event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        {/* SVG wave overlay — gives the ticket its characteristic curve */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 230"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0,0 L600,0 L600,80 C520,150 380,150 280,90 C200,40 80,30 0,80 Z"
            fill="rgba(255,255,255,0.92)"
          />
        </svg>

        <div className="relative h-full w-full px-4 sm:px-5 py-4 flex gap-4">
          {/* Photo column */}
          <div className="hidden sm:flex flex-col items-center justify-end pb-2">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-[160px] w-[120px] object-cover rounded-xl ring-2 ring-white shadow-lg"
              />
            ) : (
              <div className={`h-[160px] w-[120px] rounded-xl ring-2 ring-white shadow-lg bg-gradient-to-br ${cover} text-white flex items-center justify-center font-display font-extrabold text-3xl`}>
                {(ticket?.attendeeName || '?')
                  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
              </div>
            )}
          </div>

          {/* Copy column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="text-zinc-900">
              <div className="font-handwriting italic text-[13px] leading-none opacity-80" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                You are invited
              </div>
              <div className="font-display font-extrabold tracking-tight text-[22px] sm:text-[26px] leading-[1.05]" style={{ color: PRIMARY }}>
                {ticket?.eventTitle || event?.title || 'Event'}
              </div>
              {event?.tagline && (
                <div className="text-[12.5px] text-zinc-600 mt-1 line-clamp-2" style={{ color: PRIMARY }}>
                  {event.tagline}
                </div>
              )}
            </div>

            {/* Date + time pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Pill icon={Calendar} text={dateLabel} />
              <Pill icon={Clock}    text={timeLabel} />
            </div>

            {/* Venue + price row */}
            <div className="flex items-end justify-between gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-[12.5px] text-white/95 min-w-0">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span className="truncate">{event?.location || 'Venue TBC'}</span>
              </div>
              <div
                className="relative shrink-0 rounded-full text-white text-center px-4 py-1.5 shadow-glow"
                style={{ background: `linear-gradient(135deg, ${PRIMARY}, #1656c2)` }}
              >
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">Price</div>
                <div className="font-display font-extrabold text-[16px] leading-none tabular">{priceLabel}</div>
              </div>
            </div>

            {/* Call-for-more */}
            {(event?.contactPhone || ticket?.attendeePhone) && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-white/95">
                <Phone className="h-3 w-3" strokeWidth={2} />
                <span className="opacity-80 font-semibold uppercase tracking-wider">Call for more info</span>
                <span className="font-mono font-bold">{event?.contactPhone || ticket?.attendeePhone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PERFORATION ───────────────────────────────────────────────── */}
      <div
        className="relative w-0"
        aria-hidden
      >
        <div className="absolute inset-y-0 -left-2 w-4 flex items-center justify-center pointer-events-none">
          {/* Dashed line drawn with a tall, thin SVG so the dashes render
              identically across browsers regardless of CSS line-height. */}
          <svg width="2" height="100%" className="overflow-visible">
            <line x1="1" y1="0" x2="1" y2="100%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 5" />
          </svg>
        </div>
        {/* Notch cutouts at top + bottom (small white half-circles) */}
        <div className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-zinc-50" />
        <div className="absolute -left-2.5 -bottom-2.5 h-5 w-5 rounded-full bg-zinc-50" />
      </div>

      {/* ── STUB ──────────────────────────────────────────────────────── */}
      <div className="w-[170px] sm:w-[200px] relative overflow-hidden shrink-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${cover}`} />
        {event?.bannerUrl && (
          <img src={event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/5 to-black/40" />

        <div className="relative h-full w-full px-3.5 py-4 flex flex-col text-white">
          <div className="font-handwriting italic text-[11px] leading-none opacity-90" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Admit one
          </div>
          <div className="font-display font-extrabold text-[14px] leading-tight mt-1 line-clamp-3">
            {ticket?.eventTitle || event?.title || 'Event'}
          </div>

          <div className="mt-3 space-y-1.5 text-[11px] opacity-95">
            <StubLine icon={Calendar} text={dateLabel} />
            <StubLine icon={Clock}    text={timeLabel} />
            {event?.location && <StubLine icon={MapPin} text={event.location} />}
            {ticket?.ticketTypeName && <StubLine icon={TicketIcon} text={ticket.ticketTypeName} />}
            {ticket?.seatLabel && (
              <StubLine icon={Armchair} text={`Seat ${ticket.seatLabel}`} strong />
            )}
          </div>

          <div className="mt-auto pt-3">
            <Barcode value={ticket?.code} />
            <div className="font-mono font-bold text-[10px] tracking-[0.16em] mt-1 text-center opacity-95 truncate">
              {ticket?.code || ''}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────
function Pill({ icon: Icon, text }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white font-display font-bold text-[12.5px] tabular shadow-glow"
      style={{ background: `linear-gradient(135deg, ${PRIMARY}, #1656c2)` }}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {text}
    </span>
  );
}

function StubLine({ icon: Icon, text, strong }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2} />
      <span className={`truncate ${strong ? 'font-extrabold tabular' : ''}`}>{text}</span>
    </div>
  );
}

// Deterministic faux-barcode rendered from the ticket code. Wide enough that
// a real barcode reader is rarely needed — staff scan the QR on the badge
// instead — but it sells the ticket aesthetic.
function Barcode({ value = '' }) {
  const seed = (value || 'GOSPELAR').toString();
  const bars = [];
  for (let i = 0; i < 44; i++) {
    const code = seed.charCodeAt(i % seed.length) + i * 7;
    const w = (code % 3) + 1;
    const dark = code % 5 !== 0;
    bars.push(
      <span
        key={i}
        className={`h-full inline-block ${dark ? 'bg-white' : 'bg-transparent'}`}
        style={{ width: `${w}px` }}
      />,
    );
  }
  return (
    <div className="rounded-md bg-white/0 ring-1 ring-white/30 py-1.5 px-1 flex items-stretch gap-[2px] h-9 overflow-hidden">
      {bars}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────
function formatTimeRange(start, end) {
  if (!start) return 'Time TBC';
  const fmt = (d) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (!end || start.toDateString() !== end.toDateString()) return fmt(start);
  return `${fmt(start)} - ${fmt(end)}`;
}

function formatPrice(cents) {
  const n = Number(cents || 0);
  if (!n) return 'Free';
  return `$ ${Math.round(n / 100).toLocaleString()}`;
}

function photoToSrc(photo) {
  if (!photo) return null;
  const s = String(photo);
  if (s.startsWith('data:') || s.startsWith('http')) return s;
  return `data:image/jpeg;base64,${s}`;
}
