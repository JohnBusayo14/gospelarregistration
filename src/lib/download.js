// Lightweight client-side download helpers — no third-party deps.

function trigger(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// RFC 5545 expects UTC timestamps as YYYYMMDDTHHMMSSZ.
function icsDate(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

// Long DESCRIPTION values must be folded at 75 octets and escaped.
function icsEscape(s = '') {
  return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildICS({ ticket, event }) {
  const uid = `${ticket.code}@gospelar.app`;
  const now = icsDate(new Date().toISOString());
  const start = icsDate(event?.startsAt);
  const end   = icsDate(event?.endsAt) || start;
  const description = [
    `Your ticket code: ${ticket.code}`,
    ticket.ticketTypeName ? `Ticket type: ${ticket.ticketTypeName}` : '',
    ticket.accommodationName ? `Accommodation: ${ticket.accommodationName}` : '',
    event?.summary || '',
  ].filter(Boolean).join('\\n\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gospelar//Registration//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(ticket.eventTitle)}`,
    `LOCATION:${icsEscape(event?.location || '')}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS({ ticket, event }) {
  const ics = buildICS({ ticket, event });
  const slug = (ticket.eventTitle || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  trigger(`${slug}-${ticket.code}.ics`, ics, 'text/calendar;charset=utf-8');
}
