// Badge.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Portrait, lanyard-style ID badge used by both the public ticket holder
// (TicketBadge.jsx) and the admin print sheet (AdminBadges.jsx).
//
// Sizing: 2.5" × 4" — matches the most common 4-up name-tag sheets and the
// reference comp (vertical wine-bar lanyard card). Compact mode shrinks the
// chrome for the multi-up admin sheet.
//
// Props:
//   ticket  — the row from /api/tickets/:code
//   event   — its parent event (for cover gradient, banner, dates)
//   church  — multi-tenant tenant (for branding)
//   side    — 'front' (photo + name + contact + small QR) | 'back'
//             (event branding + big QR + website / social).
//             Pair them via <BadgePair> when you want both sides at once.
//   compact — smaller chrome for multi-up sheets.
//
// Photo: when `ticket.attendeePhoto` or `ticket.attendeeProfile.photo` is set
// the avatar slot renders the headshot. Falls back to gradient initials.
// ─────────────────────────────────────────────────────────────────────────────

import { roleStyle, roleLabel } from '../mockData.js';

export default function Badge({ ticket, event, church, side = 'front', compact = false }) {
  const role = roleStyle(ticket?.role || 'attendee');
  const photoSrc = photoToSrc(ticket?.attendeePhoto || ticket?.attendeeProfile?.photo);
  const cover = event?.coverColor || 'from-primary-700 to-primary-500';
  const dims = compact
    ? { width: '2.2in', height: '3.5in' }
    : { width: '2.5in', height: '4in' };

  return (
    <article
      className={`relative overflow-hidden rounded-2xl text-white ring-1 ring-black/10 print:ring-zinc-400 ${
        compact ? 'shadow-none' : 'shadow-ambient-lg'
      }`}
      style={dims}
    >
      {/* Background: event gradient + soft banner image at 30% so the card
          inherits the event's visual identity automatically. */}
      <div className={`absolute inset-0 bg-gradient-to-b ${cover}`} />
      {event?.bannerUrl && (
        <img src={event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
      )}
      {/* Vignette so type stays legible over busy banners */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/55" />

      {/* Lanyard clip — decorative top notch with a hole. Always rendered so
          the badge reads as a hanging card on screen and on paper alike. */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
        <div className="w-10 h-3 bg-zinc-900 rounded-b-md" />
        <div className="w-8 h-1 bg-white/80 rounded-full mx-auto -mt-1.5" />
      </div>

      {/* Card body */}
      <div className="relative h-full w-full px-4 pt-7 pb-3 flex flex-col">
        {side === 'front'
          ? <Front ticket={ticket} event={event} photoSrc={photoSrc} role={role} />
          : <Back  ticket={ticket} event={event} church={church} role={role} />}
      </div>

      {/* Print crop marks at the corners */}
      <span className="hidden print:block absolute top-0 left-0 h-1 w-1 border-t border-l border-zinc-500" />
      <span className="hidden print:block absolute top-0 right-0 h-1 w-1 border-t border-r border-zinc-500" />
      <span className="hidden print:block absolute bottom-0 left-0 h-1 w-1 border-b border-l border-zinc-500" />
      <span className="hidden print:block absolute bottom-0 right-0 h-1 w-1 border-b border-r border-zinc-500" />
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FRONT side — big square photo, full name in display type, role chip,
// contact line, small QR and ticket code at the bottom.
// ─────────────────────────────────────────────────────────────────────────────
function Front({ ticket, event, photoSrc, role }) {
  const initials = (ticket?.attendeeName || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');

  return (
    <>
      {/* Event ribbon at the very top */}
      <div className="text-[8px] font-bold uppercase tracking-[0.22em] opacity-95 truncate">
        {ticket?.eventTitle || event?.title || ''}
      </div>

      {/* Photo — square with rounded corners and a thick light ring, matching
          the wine-bar comp. Falls back to gradient initials. */}
      <div className="mt-3 mx-auto">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt=""
            className="h-[1.5in] w-[1.5in] rounded-2xl object-cover ring-[3px] ring-white/85 shadow-lg"
          />
        ) : (
          <div className={`h-[1.5in] w-[1.5in] rounded-2xl bg-gradient-to-br ${role.badgeColor} text-white font-display font-extrabold text-5xl flex items-center justify-center ring-[3px] ring-white/85 shadow-lg`}>
            {initials || '?'}
          </div>
        )}
      </div>

      {/* Name — display font, big, two-line ceiling */}
      <div className="mt-3 text-center font-display font-extrabold tracking-[0.04em] text-[20px] sm:text-[22px] leading-[1.05] uppercase line-clamp-2">
        {ticket?.attendeeName || 'Attendee'}
      </div>

      {/* Role / ticket type */}
      <div className="mt-1.5 text-center text-[11px] font-semibold tracking-wide opacity-95">
        {ticket?.ticketTypeName || roleLabel(ticket?.role) || '—'}
      </div>

      {/* Seat — the headline logistic number. Only renders when set. */}
      {ticket?.seatLabel && (
        <div className="mt-2 mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">Seat</span>
          <span className="font-display font-extrabold tabular text-[15px] leading-none">{ticket.seatLabel}</span>
        </div>
      )}

      {/* Contact lines */}
      <div className="mt-auto pt-3 text-center space-y-0.5 text-[10.5px] font-medium opacity-95">
        {ticket?.attendeePhone && <div className="truncate">{ticket.attendeePhone}</div>}
        {ticket?.attendeeEmail && <div className="truncate">{ticket.attendeeEmail}</div>}
      </div>

      {/* Footer code + small QR */}
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="font-mono text-[9px] tracking-[0.16em] opacity-80 truncate">
          {ticket?.code || ''}
        </span>
        <img
          src={qrSrc(ticket?.code, 100)}
          alt=""
          className="h-9 w-9 rounded bg-white ring-1 ring-white/30 p-0.5"
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BACK side — event branding, summary copy, BIG QR for fast scanning,
// website link, social row.
// ─────────────────────────────────────────────────────────────────────────────
function Back({ ticket, event, church }) {
  const summary = (event?.summary || event?.tagline || '').trim();
  const websiteHost = typeof window !== 'undefined'
    ? window.location.host.replace(/^www\./, '')
    : 'gospelar.com';

  return (
    <>
      {/* Brand mark */}
      <div className="flex items-center gap-2 pt-1">
        {church?.logoColor ? (
          <span className={`h-8 w-8 rounded-lg bg-gradient-to-br ${church.logoColor} ring-1 ring-white/40`} />
        ) : (
          <span className="h-8 w-8 rounded-lg bg-white/15 ring-1 ring-white/30 grid place-items-center text-base font-display font-extrabold">
            G
          </span>
        )}
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-95 truncate">
            {church?.name || 'Gospelar Events'}
          </div>
          <div className="text-[8px] uppercase tracking-[0.16em] opacity-70">
            Official badge
          </div>
        </div>
      </div>

      {/* Event title + summary */}
      <div className="mt-3">
        <div className="font-display font-extrabold text-[14px] leading-tight line-clamp-2">
          {ticket?.eventTitle || event?.title || ''}
        </div>
        {summary && (
          <p className="mt-2 text-[10px] leading-snug opacity-90 line-clamp-5">
            {summary}
          </p>
        )}
      </div>

      {/* Logistics — date, where, seat */}
      <div className="mt-3 space-y-1 text-[10px] font-medium opacity-95">
        {event?.startsAt && <Line label="When"  value={shortDate(event.startsAt)} />}
        {event?.location && <Line label="Where" value={event.location} />}
        {ticket?.ticketTypeName && <Line label="Ticket" value={ticket.ticketTypeName} />}
        {ticket?.seatLabel && <Line label="Seat" value={ticket.seatLabel} bold />}
      </div>

      {/* Spacer pushes the QR to the bottom of the card */}
      <div className="flex-1" />

      {/* Big QR — the back of the badge is what staff scan during check-in. */}
      <div className="mt-2 flex items-end gap-3">
        <div className="rounded-xl bg-white p-1.5 ring-1 ring-white/30">
          <img
            src={qrSrc(ticket?.code, 280)}
            alt={`QR for ${ticket?.code || 'ticket'}`}
            className="h-[1.25in] w-[1.25in] block"
          />
        </div>
        <div className="flex-1 min-w-0 pb-1">
          <div className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-70">Code</div>
          <div className="font-mono font-extrabold text-[12px] tracking-[0.14em] truncate">
            {ticket?.code || ''}
          </div>
          <div className="text-[9px] opacity-80 mt-1.5 truncate">{websiteHost}</div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// <BadgePair> — convenience renderer that lays out front + back side by side
// (stacked on small screens) so callers don't have to repeat the markup.
// ─────────────────────────────────────────────────────────────────────────────
export function BadgePair({ ticket, event, church }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-10">
      <Badge ticket={ticket} event={event} church={church} side="front" />
      <Badge ticket={ticket} event={event} church={church} side="back" />
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
function Line({ label, value, bold }) {
  return (
    <div className="flex gap-2">
      <span className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-65 w-12 pt-[1px]">{label}</span>
      <span className={`flex-1 min-w-0 truncate ${bold ? 'font-extrabold tabular' : ''}`}>{value}</span>
    </div>
  );
}

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function qrSrc(code, size = 160) {
  const data = `${typeof window !== 'undefined' ? window.location.origin : ''}/check-in?code=${encodeURIComponent(code || '')}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

// Normalise a stored photo to a usable <img src>. Accepts data URLs, raw
// base64, or http(s) URLs. Returns null when empty.
function photoToSrc(photo) {
  if (!photo) return null;
  const s = String(photo);
  if (s.startsWith('data:') || s.startsWith('http')) return s;
  return `data:image/jpeg;base64,${s}`;
}

export { roleLabel };
