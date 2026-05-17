import { roleStyle, roleLabel, groupTypeStyle } from '../mockData.js';

// Digital "tag" — the fast-flash variant of the ticket. Designed for the
// attendee to pull up on their phone at the gate or in the queue: large
// readable name + role-coloured chevron, big mono code, optional seat/group
// chips, and a small embedded QR. Sits inline on the ticket page and is also
// re-used as the hero of the confirmation email (HTML-rendered server-side).
//
// Props
//   ticket  — Ticket object as returned by /api/tickets/:code (camelCase).
//   compact — when true, drops the seat/group chips for tight spaces (eg the
//             confirmation success card on Register's last step).
//   showQr  — render the small QR in the corner (default: true). Set to false
//             on pages that already show a full-size QR alongside.
export default function TicketTag({ ticket, compact = false, showQr = true }) {
  if (!ticket) return null;
  const role = roleStyle(ticket.role || 'attendee');
  const group = ticket.groupName ? groupTypeStyle(ticket.groupType) : null;
  const initials = (ticket.attendeeName || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');
  const photoSrc = photoToSrc(ticket.attendeePhoto);

  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=` +
    encodeURIComponent(
      `${typeof window !== 'undefined' ? window.location.origin : ''}/check-in?code=${encodeURIComponent(ticket.code || '')}`,
    );

  return (
    <article
      className="relative overflow-hidden rounded-2xl ring-1 ring-zinc-200 bg-white shadow-ambient"
      aria-label={`Ticket tag for ${ticket.attendeeName || 'attendee'}`}
    >
      {/* Role colour stripe down the left side — instantly readable from across
          the queue line ("green = staff, gold = speaker, blue = attendee"). */}
      <div className={`absolute inset-y-0 left-0 w-2 bg-gradient-to-b ${role.badgeColor}`} />

      <div className="pl-5 pr-4 py-4 flex items-center gap-4">
        {/* Avatar — kept aligned with Badge.jsx so the tag and the printed
            badge feel like one family. Shows the attendee's photo when one
            was provided, gradient initials otherwise. */}
        {photoSrc ? (
          <img
            src={photoSrc}
            alt=""
            className={`h-12 w-12 rounded-xl object-cover ring-1 ring-white shadow-sm flex-shrink-0 bg-gradient-to-br ${role.badgeColor}`}
          />
        ) : (
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${role.badgeColor} text-white flex items-center justify-center font-extrabold text-lg flex-shrink-0`}>
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header row: role pill + event title */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.14em] bg-gradient-to-r ${role.badgeColor} text-white`}>
              <span className="h-1 w-1 rounded-full bg-white/70" />
              {roleLabel(ticket.role || 'attendee')}
            </span>
            {ticket.eventTitle && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 truncate">
                {ticket.eventTitle}
              </span>
            )}
          </div>

          {/* Name + code */}
          <div className="mt-0.5 font-extrabold text-[15px] tracking-tight text-ink truncate">
            {ticket.attendeeName || 'Attendee'}
          </div>
          <div className="font-mono text-xs text-zinc-600 mt-0.5">{ticket.code}</div>

          {!compact && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {ticket.ticketTypeName && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-zinc-100 text-zinc-700">
                  {ticket.ticketTypeName}
                </span>
              )}
              {ticket.seatLabel && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800">
                  Seat {ticket.seatLabel}
                </span>
              )}
              {ticket.roomLabel && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-sky-50 text-sky-700 truncate max-w-[10rem]">
                  {ticket.roomLabel.replace(/^.+ · /, '')}
                </span>
              )}
              {group && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${group.chip}`}>
                  <span>{group.emoji}</span>
                  <span className="truncate max-w-[8rem]">{ticket.groupName}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {showQr && (
          <img
            src={qrUrl}
            alt={`QR for ${ticket.code}`}
            className="h-16 w-16 rounded-lg ring-1 ring-zinc-200 bg-white flex-shrink-0"
          />
        )}
      </div>
    </article>
  );
}

// Mirror of Badge.jsx photoToSrc — normalises a stored photo (data URL,
// raw base64, or http URL) into something usable as an <img src>. Kept inline
// to avoid a one-line shared util.
function photoToSrc(photo) {
  if (!photo) return null;
  const s = String(photo);
  if (s.startsWith('data:') || s.startsWith('http')) return s;
  return `data:image/jpeg;base64,${s}`;
}
