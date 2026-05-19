import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Calendar, MapPin, Ticket as TicketIcon, BedDouble,
  Armchair, Mail, Phone, User as UserIcon, Users,
} from 'lucide-react';
import { api } from '../api.js';

function qrSrc(code, size = 220) {
  const data = `${window.location.origin}/check-in?code=${encodeURIComponent(code)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }) : '—';
}

// Normalise a stored photo to a usable <img src>. Mirrors Badge.jsx's helper
// so the email preview can render the same headshot the printed badge does.
function photoToSrc(photo) {
  if (!photo) return null;
  const s = String(photo);
  if (s.startsWith('data:') || s.startsWith('http')) return s;
  return `data:image/jpeg;base64,${s}`;
}

// Visual preview of the confirmation email — the same content the backend
// will render server-side when /api/tickets/:code/email is wired up. The
// body doubles as the attendee's digital badge: big headshot, prominent
// seat number, and the full identity / logistics breakdown.
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

  const photo = photoToSrc(ticket.attendeePhoto || ticket.attendeeProfile?.photo);
  const initials = (ticket.attendeeName || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');
  const profile = ticket.attendeeProfile || {};
  const firstName = (ticket.attendeeName || '').split(' ')[0] || 'there';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link to={`/tickets/${code}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to ticket
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Confirmation email preview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          This is what {ticket.attendeeEmail} receives after registering — the body doubles as their digital badge.
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
          <div className="text-zinc-500 mt-1">Subject: <strong className="text-ink">You're registered — {ticket.eventTitle}</strong></div>
        </div>

        {/* ── EMAIL BODY ─────────────────────────────────────────────── */}
        <div className="px-5 sm:px-8 py-8 text-[15px] leading-relaxed text-ink">
          {/* Hero gradient band */}
          <div className={`rounded-2xl bg-gradient-to-br ${event?.coverColor || 'from-brand-500 to-rose-500'} text-white px-6 py-7 relative overflow-hidden`}>
            {event?.bannerUrl && (
              <img src={event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            )}
            <div className="relative">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] opacity-90">You're in!</div>
              <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                {ticket.eventTitle}
              </div>
              {event?.tagline && (
                <div className="mt-2 text-sm opacity-90">{event.tagline}</div>
              )}
            </div>
          </div>

          <p className="mt-6">Hi {firstName},</p>
          <p className="mt-2">
            Thanks for registering. Save this email — it doubles as your badge for the gate.
          </p>

          {/* ── BADGE CARD ───────────────────────────────────────────── */}
          <div className="mt-6 rounded-2xl ring-1 ring-zinc-200 overflow-hidden bg-white">
            {/* Identity row — big photo + name + ticket type */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 px-6 pt-7 pb-5 bg-gradient-to-b from-zinc-50 to-white">
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover ring-4 ring-white shadow-ambient flex-shrink-0"
                />
              ) : (
                <div className={`h-28 w-28 sm:h-32 sm:w-32 rounded-2xl bg-gradient-to-br ${event?.coverColor || 'from-brand-500 to-rose-500'} text-white flex items-center justify-center font-display font-extrabold text-4xl ring-4 ring-white shadow-ambient flex-shrink-0`}>
                  {initials || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Attendee</div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink leading-tight">
                  {ticket.attendeeName || 'Attendee'}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  {ticket.ticketTypeName && (
                    <span className="inline-block rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1">
                      <TicketIcon className="inline h-3 w-3 mr-1" strokeWidth={2.25} />
                      {ticket.ticketTypeName}
                    </span>
                  )}
                  {ticket.role && ticket.role !== 'attendee' && (
                    <span className="inline-block rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1">
                      {ticket.role}
                    </span>
                  )}
                  {ticket.groupId && (
                    <span className="inline-block rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-100 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1">
                      <Users className="inline h-3 w-3 mr-1" strokeWidth={2.25} />
                      Group {String(ticket.groupId).slice(-6)}
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-[13px] text-zinc-600">
                  {ticket.attendeeEmail && (
                    <div className="inline-flex items-center gap-1.5 justify-center sm:justify-start w-full sm:w-auto sm:mr-4">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span className="truncate">{ticket.attendeeEmail}</span>
                    </div>
                  )}
                  {ticket.attendeePhone && (
                    <div className="inline-flex items-center gap-1.5 justify-center sm:justify-start w-full sm:w-auto">
                      <Phone className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>{ticket.attendeePhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Seat — biggest, most-scanned number on the badge. Skip the
                block entirely for un-seated events so the layout doesn't
                show an empty slot. */}
            {ticket.seatLabel && (
              <div className="px-6 py-5 border-t border-zinc-200 bg-amber-50/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
                    <Armchair className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Seat number</div>
                    <div className="font-display font-extrabold text-3xl sm:text-4xl tabular text-amber-900 leading-none mt-1">
                      {ticket.seatLabel}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 text-right max-w-[8rem]">
                  Show this at the door
                </span>
              </div>
            )}

            {/* Logistics grid */}
            <dl className="px-6 py-5 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field icon={Calendar}   label="When"  value={event ? fmtDate(event.startsAt) : '—'} />
              <Field icon={MapPin}     label="Where" value={event?.location || '—'} />
              {ticket.accommodationName && (
                <Field icon={BedDouble} label="Lodging" value={ticket.accommodationName} />
              )}
              {ticket.roomLabel && (
                <Field icon={BedDouble} label="Room assignment" value={ticket.roomLabel} />
              )}
              {(profile.city || profile.country) && (
                <Field icon={MapPin} label="From" value={[profile.city, profile.country].filter(Boolean).join(', ')} />
              )}
              {(profile.assembly || profile.district || profile.region) && (
                <Field icon={UserIcon} label="Assembly" value={[profile.assembly, profile.district, profile.region].filter(Boolean).join(' · ')} />
              )}
              {profile.emergencyName && (
                <Field
                  icon={Phone}
                  label="Emergency contact"
                  value={`${profile.emergencyName}${profile.emergencyPhone ? ` · ${profile.emergencyPhone}` : ''}`}
                />
              )}
              {profile.dietary && (
                <Field icon={UserIcon} label="Dietary" value={profile.dietary} />
              )}
            </dl>

            {/* QR + code footer */}
            <div className="border-t border-zinc-200 px-6 py-5 flex flex-col sm:flex-row items-center gap-5 bg-zinc-50/60">
              <img
                src={qrSrc(ticket.code)}
                alt={`QR for ${ticket.code}`}
                className="h-32 w-32 rounded-xl ring-1 ring-zinc-200 bg-white flex-shrink-0"
              />
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Ticket code</div>
                <div className="mt-1 font-mono font-extrabold text-xl tracking-[0.12em] text-ink break-all">
                  {ticket.code}
                </div>
                <p className="mt-3 text-[12.5px] text-zinc-600 leading-relaxed">
                  Scan at check-in, or share the code with staff if the QR won't scan.
                </p>
              </div>
            </div>
          </div>

          {/* Closing copy */}
          <p className="mt-6">
            Need to make changes? Reply to this email and we'll help. Look forward to seeing you{event?.location ? ` at ${event.location.split(',')[0]}` : ''}.
          </p>
          <p className="mt-4">Grace and peace,<br/><strong>The Gospelar team</strong></p>

          <hr className="my-6 border-zinc-200" />
          <p className="text-xs text-zinc-500">
            This is an automated confirmation. Save this email — you'll need the QR code and your seat number for entry.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 flex-shrink-0 mt-0.5">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      )}
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</dt>
        <dd className="text-ink font-semibold text-sm mt-0.5 break-words">{value || '—'}</dd>
      </div>
    </div>
  );
}
