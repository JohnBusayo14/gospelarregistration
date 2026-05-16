import { roleStyle, roleLabel } from '../mockData.js';

// One badge = 3.4" × 2.13" (CR80 / credit-card / standard name-tag size).
// We pin the pixel size so multiple badges land on a printed sheet uniformly
// regardless of the surrounding page CSS.
//
// The design is shared by all roles; only the color band + role chip change.
// `compact` shrinks chrome for the multi-up print sheet, where many badges
// share a page.
export default function Badge({ ticket, event, church, compact = false }) {
  const role = roleStyle(ticket?.role || 'attendee');
  const initials = (ticket?.attendeeName || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');

  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=` +
    encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in?code=${encodeURIComponent(ticket?.code || '')}`);

  return (
    <article
      className={`relative overflow-hidden rounded-xl bg-white ring-1 ring-zinc-300 print:ring-zinc-400 ${
        compact ? 'shadow-none' : 'shadow-ambient'
      }`}
      style={{ width: '3.4in', height: '2.13in' }}
    >
      {/* Role color band (top) */}
      <div className={`h-7 w-full bg-gradient-to-r ${role.badgeColor} flex items-center justify-between px-3 text-white`}>
        <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em]">
          <span className={`h-1.5 w-1.5 rounded-full ${role.dot} ring-2 ring-white/40`} />
          {role.label}
        </div>
        {church && (
          <span className="text-[8px] font-semibold uppercase tracking-[0.16em] truncate max-w-[1.6in]">
            {church.name}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[auto_1fr] gap-2.5 p-2.5">
        {/* Initials avatar */}
        <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${role.badgeColor} text-white flex items-center justify-center font-extrabold text-lg flex-shrink-0`}>
          {initials}
        </div>

        <div className="min-w-0 flex flex-col justify-between leading-tight">
          <div className="min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-zinc-400 truncate">
              {ticket?.eventTitle || event?.title || ''}
            </div>
            <div className="font-extrabold text-[15px] text-ink truncate mt-0.5">
              {ticket?.attendeeName || 'Attendee'}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {ticket?.ticketTypeName && (
              <span className="inline-block rounded-full bg-zinc-100 text-zinc-700 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5">
                {ticket.ticketTypeName}
              </span>
            )}
            {ticket?.seatLabel && (
              <span className="inline-block rounded-full bg-amber-100 text-amber-800 text-[9px] font-extrabold tracking-wide px-1.5 py-0.5">
                Seat {ticket.seatLabel}
              </span>
            )}
            {ticket?.roomLabel && (
              <span className="inline-block rounded-full bg-zinc-100 text-zinc-700 text-[9px] font-semibold tracking-wide px-1.5 py-0.5 truncate max-w-[1.6in]">
                {ticket.roomLabel.replace(/^.+ · /, '')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: QR + code + church logo */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          {church && (
            <span
              className={`h-5 w-5 rounded-md bg-gradient-to-br ${church.logoColor} ring-1 ring-white/50`}
              title={church.name}
            />
          )}
          <span className="font-mono text-[9px] tracking-wider text-zinc-500">
            {ticket?.code || ''}
          </span>
        </div>
        <img
          src={qrUrl}
          alt={`QR for ${ticket?.code || 'ticket'}`}
          className="h-12 w-12 rounded ring-1 ring-zinc-200 bg-white"
        />
      </div>

      {/* Print crop marks at the corners */}
      <span className="hidden print:block absolute top-0 left-0 h-1 w-1 border-t border-l border-zinc-500" />
      <span className="hidden print:block absolute top-0 right-0 h-1 w-1 border-t border-r border-zinc-500" />
      <span className="hidden print:block absolute bottom-0 left-0 h-1 w-1 border-b border-l border-zinc-500" />
      <span className="hidden print:block absolute bottom-0 right-0 h-1 w-1 border-b border-r border-zinc-500" />
    </article>
  );
}

export { roleLabel };
