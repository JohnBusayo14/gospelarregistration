import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Minus, Plus, Ticket as TicketIcon, BedDouble, UserPlus,
  Users,
} from 'lucide-react';
import { api } from '../api.js';
import { roomTypeLabel, GROUP_TYPES } from '../mockData.js';

const STEPS = [
  { id: 'ticket',   label: 'Ticket' },
  { id: 'people',   label: 'Attendees' },
  { id: 'room',     label: 'Accommodation' },
  { id: 'review',   label: 'Review' },
];

function priceLabel(cents) {
  return cents ? `$${(cents / 100).toFixed(0)}` : 'Free';
}

function emptyAttendee() {
  return {
    firstName: '', lastName: '', email: '', phone: '',
    ageGroup: 'adult', dietary: '', emergencyName: '', emergencyPhone: '',
  };
}

export default function Register() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ev, setEv] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);

  const [ticketTypeId, setTicketTypeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState([emptyAttendee()]);
  const [accommodationId, setAccommodationId] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  // Group registration: church groups / families / departments register
  // together. `groupMode === 'group'` shows a 3-field card on the People step
  // and stamps every minted ticket with the same groupId server-side.
  const [groupMode, setGroupMode] = useState('individual'); // 'individual' | 'group'
  const [groupType, setGroupType] = useState('church');
  const [groupName, setGroupName] = useState('');
  const [groupLeadEmail, setGroupLeadEmail] = useState('');

  useEffect(() => {
    api.getEvent(id).then((data) => {
      setEv(data);
      if (data?.ticketTypes?.[0]) setTicketTypeId(data.ticketTypes[0].id);
      if (data?.accommodation?.[0]) setAccommodationId(data.accommodation[0].id);
    });
  }, [id]);

  const ticketType = useMemo(
    () => ev?.ticketTypes.find((t) => t.id === ticketTypeId),
    [ev, ticketTypeId],
  );
  const accommodation = useMemo(
    () => ev?.accommodation.find((a) => a.id === accommodationId),
    [ev, accommodationId],
  );

  // Resize attendees array whenever quantity changes.
  useEffect(() => {
    setAttendees((prev) => {
      if (quantity === prev.length) return prev;
      if (quantity > prev.length) {
        return [...prev, ...Array(quantity - prev.length).fill(0).map(emptyAttendee)];
      }
      return prev.slice(0, quantity);
    });
  }, [quantity]);

  if (!ev) return <div className="text-zinc-500">Loading…</div>;

  const totalCents =
    (ticketType?.priceCents || 0) * quantity +
    (accommodation?.priceCents || 0) * quantity;
  const ticketLeft = (ticketType?.capacity || 0) - (ticketType?.sold || 0);

  function validateStep() {
    setError('');
    if (stepIdx === 0) {
      if (!ticketType) { setError('Pick a ticket type.'); return false; }
      if (quantity > ticketLeft) { setError(`Only ${ticketLeft} of this ticket left.`); return false; }
    }
    if (stepIdx === 1) {
      if (groupMode === 'group') {
        if (!groupName.trim()) { setError('Group name is required.'); return false; }
        if (groupLeadEmail && !/^\S+@\S+\.\S+$/.test(groupLeadEmail)) {
          setError('Lead contact email must be a valid email (or leave blank).');
          return false;
        }
      }
      for (let i = 0; i < attendees.length; i++) {
        const a = attendees[i];
        if (!a.firstName.trim() || !a.lastName.trim()) { setError(`Attendee ${i + 1}: name is required.`); return false; }
        if (!/^\S+@\S+\.\S+$/.test(a.email))           { setError(`Attendee ${i + 1}: valid email required.`); return false; }
        if (!a.phone.trim())                           { setError(`Attendee ${i + 1}: phone is required.`); return false; }
      }
    }
    if (stepIdx === 2) {
      if ((ev.accommodation?.length || 0) > 0 && !accommodation) {
        setError('Pick an accommodation option.');
        return false;
      }
    }
    if (stepIdx === 3) {
      if (!consent) { setError('Please agree to the event terms.'); return false; }
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    // Skip accommodation step if event has no accommodation options.
    if (stepIdx === 1 && (ev.accommodation?.length || 0) === 0) {
      setStepIdx(3);
    } else {
      setStepIdx((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }
  function back() {
    if (stepIdx === 3 && (ev.accommodation?.length || 0) === 0) {
      setStepIdx(1);
    } else {
      setStepIdx((s) => Math.max(s - 1, 0));
    }
  }

  async function submit() {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      // Build the optional group block. Leave it null for solo registrations
      // so server can branch on `payload.group` without truthy gymnastics.
      const groupPayload = groupMode === 'group' ? {
        type:      groupType,
        name:      groupName.trim(),
        leadEmail: groupLeadEmail.trim() || (attendees[0]?.email || ''),
      } : null;

      const result = await api.register(id, {
        ticketTypeId,
        accommodationId: accommodation ? accommodationId : null,
        attendees,
        group: groupPayload,
      });

      // Fire confirmation channels for each ticket — kicked off in parallel,
      // failures non-blocking. Email always; SMS only if the attendee provided
      // a phone (the SMS endpoint also re-checks the opt-in flag server-side).
      (result.tickets || []).forEach((t) => {
        api.sendConfirmationEmail(t.code);
        if (t.attendeePhone) api.sendConfirmationSms(t.code);
      });

      // Schedule pre-event reminders. Two windows by default (T-1 day,
      // T-1 hour) — backend dedupe key is (ticketCode, kind), so re-running
      // submit on a network retry won't double-queue.
      if (ev?.startsAt) {
        const startMs = new Date(ev.startsAt).getTime();
        const dayBefore  = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
        const hourBefore = new Date(startMs -  1 * 60 * 60 * 1000).toISOString();
        (result.tickets || []).forEach((t) => {
          if (startMs - Date.now() > 24 * 60 * 60 * 1000) {
            api.scheduleReminder({ ticketCode: t.code, sendAt: dayBefore,  kind: 'event_t_minus_1d', channels: ['email'] });
          }
          if (startMs - Date.now() > 1 * 60 * 60 * 1000) {
            api.scheduleReminder({ ticketCode: t.code, sendAt: hourBefore, kind: 'event_t_minus_1h', channels: ['email'] });
          }
        });
      }

      setConfirmation(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    const codes = confirmation.tickets || [];
    const groupRow = codes[0]?.groupName
      ? GROUP_TYPES.find((g) => g.id === codes[0].groupType) || null
      : null;
    return (
      <div className="max-w-lg mx-auto card p-8 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-tertiary mx-auto" />
        <h1 className="text-2xl font-extrabold tracking-tight">You’re registered!</h1>
        {groupRow && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${groupRow.chip}`}>
            <span>{groupRow.emoji}</span>
            <span>{codes[0].groupName}</span>
            <span className="text-zinc-500 font-normal">· {codes.length} {codes.length === 1 ? 'ticket' : 'tickets'}</span>
          </div>
        )}
        <p className="text-zinc-600">
          {codes.length === 1
            ? <>Confirmation sent to <strong>{codes[0].attendeeEmail}</strong>. Your ticket code is <span className="font-mono font-bold text-ink">{codes[0].code}</span>.</>
            : <>You have <span className="font-bold">{codes.length}</span> tickets. A confirmation has been sent to each attendee.</>}
        </p>
        {codes.length > 1 && (
          <ul className="text-sm text-left bg-zinc-50 rounded-lg p-3 space-y-1">
            {codes.map((t) => (
              <li key={t.code} className="flex items-center justify-between">
                <span>{t.attendeeName}</span>
                <Link to={`/tickets/${t.code}`} className="font-mono text-xs text-brand-700 hover:underline">{t.code}</Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {codes.length === 1 && (
            <Link to={`/tickets/${codes[0].code}`} className="btn-primary">View ticket</Link>
          )}
          {codes.length > 1 && (
            <Link to="/tickets" className="btn-primary">View tickets</Link>
          )}
          {codes[0] && (
            <Link to={`/tickets/${codes[0].code}/email`} className="btn-soft">Preview email</Link>
          )}
          <Link to="/events" className="btn-soft">Back to events</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to event
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Register</h1>
        <p className="text-sm text-zinc-500 mt-1">for {ev.title}</p>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2 text-xs font-semibold">
        {STEPS.map((s, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] ${
                done ? 'bg-tertiary text-white' : active ? 'bg-brand-600 text-white' : 'bg-zinc-200 text-zinc-600'
              }`}>{done ? '✓' : i + 1}</span>
              <span className={active ? 'text-ink' : 'text-zinc-500'}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="text-zinc-300">—</span>}
            </li>
          );
        })}
      </ol>

      {/* Step body */}
      <div className="card p-6">
        {stepIdx === 0 && (
          <div className="space-y-5">
            <h2 className="font-bold tracking-tight flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-brand-600" /> Select a ticket
            </h2>
            <div className="space-y-2">
              {ev.ticketTypes.map((t) => {
                const left = (t.capacity || 0) - (t.sold || 0);
                const disabled = left <= 0;
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-4 rounded-lg ring-1 cursor-pointer transition ${
                      disabled ? 'opacity-50 cursor-not-allowed ring-outline-variant/15'
                      : ticketTypeId === t.id ? 'ring-primary-600 bg-primary-50/60'
                      : 'ring-outline-variant/15 hover:ring-outline-variant/40'
                    }`}
                  >
                    <input
                      type="radio" name="tt"
                      checked={ticketTypeId === t.id}
                      onChange={() => !disabled && setTicketTypeId(t.id)}
                      disabled={disabled}
                      className="accent-brand-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{t.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular">{priceLabel(t.priceCents)}</div>
                      <div className="text-xs text-zinc-500">{disabled ? 'Sold out' : `${left} left`}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div>
              <label className="label">Quantity</label>
              <div className="inline-flex items-center rounded-lg ring-1 ring-outline-variant/20 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 hover:bg-zinc-50 disabled:opacity-30"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 tabular font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(ticketLeft || 10, q + 1))}
                  className="px-3 py-2 hover:bg-zinc-50 disabled:opacity-30"
                  disabled={quantity >= (ticketLeft || 10)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                One attendee form per ticket. You can buy up to {ticketLeft || 0} of this type.
              </p>
            </div>
          </div>
        )}

        {stepIdx === 1 && (
          <div className="space-y-5">
            <h2 className="font-bold tracking-tight flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-brand-600" /> Attendee details
            </h2>

            {/* Group mode toggle — registrar picks "I'm registering a group"
                to surface 3 extra fields. Skips the 3-field block entirely
                for solo registrations so the form stays light by default. */}
            <div className="rounded-lg ring-1 ring-outline-variant/20 p-3 bg-zinc-50/40">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Registration type
              </div>
              <div className="inline-flex rounded-lg ring-1 ring-outline-variant/20 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setGroupMode('individual')}
                  className={`px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                    groupMode === 'individual' ? 'bg-brand-50 text-brand-700' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <UserPlus className="h-4 w-4" /> Individual
                </button>
                <button
                  type="button"
                  onClick={() => setGroupMode('group')}
                  className={`px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 border-l border-zinc-200 ${
                    groupMode === 'group' ? 'bg-brand-50 text-brand-700' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <Users className="h-4 w-4" /> Group
                </button>
              </div>

              {groupMode === 'group' && (
                <div className="mt-4 grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="label">Group type</label>
                    <div className="flex flex-wrap gap-2">
                      {GROUP_TYPES.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGroupType(g.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold ring-1 transition ${
                            groupType === g.id
                              ? 'ring-brand-600 bg-brand-50 text-brand-700'
                              : 'ring-zinc-200 text-zinc-600 hover:ring-zinc-300'
                          }`}
                        >
                          <span className="mr-1">{g.emoji}</span>{g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Group name</label>
                    <input
                      className="input"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder={
                        groupType === 'church'     ? 'e.g. Cell Group 12, Lagos Province' :
                        groupType === 'family'     ? 'e.g. The Adeyemi Family' :
                                                     'e.g. Choir Department'
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Lead contact email</label>
                    <input
                      type="email"
                      className="input"
                      value={groupLeadEmail}
                      onChange={(e) => setGroupLeadEmail(e.target.value)}
                      placeholder="(defaults to attendee 1)"
                    />
                  </div>
                </div>
              )}
            </div>

            {attendees.map((a, i) => (
              <div key={i} className="ring-1 ring-outline-variant/20 rounded-lg p-4 space-y-3">
                <div className="font-semibold text-sm">Attendee {i + 1}</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">First name</label>
                    <input className="input" value={a.firstName}
                      onChange={(e) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, firstName: e.target.value } : x))} />
                  </div>
                  <div>
                    <label className="label">Last name</label>
                    <input className="input" value={a.lastName}
                      onChange={(e) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, lastName: e.target.value } : x))} />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input" value={a.email}
                      onChange={(e) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, email: e.target.value } : x))} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={a.phone}
                      onChange={(e) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, phone: e.target.value } : x))} />
                  </div>
                  <div>
                    <label className="label">Age group</label>
                    <select className="input" value={a.ageGroup}
                      onChange={(e) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, ageGroup: e.target.value } : x))}>
                      <option value="child">Child (under 13)</option>
                      <option value="teen">Teen (13–17)</option>
                      <option value="adult">Adult (18+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Dietary needs (optional)</label>
                    <input className="input" value={a.dietary}
                      onChange={(e) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, dietary: e.target.value } : x))} />
                  </div>
                  <div>
                    <label className="label">Emergency contact name</label>
                    <input className="input" value={a.emergencyName}
                      onChange={(e) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, emergencyName: e.target.value } : x))} />
                  </div>
                  <div>
                    <label className="label">Emergency contact phone</label>
                    <input className="input" value={a.emergencyPhone}
                      onChange={(e) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, emergencyPhone: e.target.value } : x))} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {stepIdx === 2 && (
          <div className="space-y-5">
            <h2 className="font-bold tracking-tight flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-brand-600" /> Accommodation
            </h2>
            <p className="text-xs text-zinc-500">One option for the whole group ({quantity} {quantity === 1 ? 'person' : 'people'}).</p>
            <div className="space-y-2">
              {ev.accommodation.map((a) => {
                const cap = a.capacity || 0;
                const left = cap - (a.taken || 0);
                const disabled = left < quantity;
                const pct = cap ? Math.min(100, Math.round(((a.taken || 0) / cap) * 100)) : 0;
                return (
                  <label
                    key={a.id}
                    className={`block p-4 rounded-lg ring-1 cursor-pointer transition ${
                      disabled ? 'opacity-50 cursor-not-allowed ring-outline-variant/15'
                      : accommodationId === a.id ? 'ring-primary-600 bg-primary-50/60'
                      : 'ring-outline-variant/15 hover:ring-outline-variant/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio" name="acc"
                        checked={accommodationId === a.id}
                        onChange={() => !disabled && setAccommodationId(a.id)}
                        disabled={disabled}
                        className="mt-1 accent-brand-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{a.name}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="chip">{roomTypeLabel(a.type)}</span>
                          <span className={`chip ${a.sharing === 'private' ? 'chip-selected' : ''}`}>
                            {a.sharing === 'private' ? 'Private' : 'Shared'}
                          </span>
                        </div>
                        {a.description && <div className="text-xs text-zinc-500 mt-1.5">{a.description}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold tabular">
                          {a.priceCents ? `+${priceLabel(a.priceCents)}/person` : 'Included'}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {disabled ? `Need ${quantity}, ${left} left` : `${left} of ${cap} left`}
                        </div>
                      </div>
                    </div>
                    {cap > 0 && (
                      <div className="mt-3 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${pct >= 100 ? 'bg-muted-coral' : pct >= 80 ? 'bg-calm-amber' : 'bg-brand-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {stepIdx === 3 && (
          <div className="space-y-5">
            <h2 className="font-bold tracking-tight">Review &amp; confirm</h2>
            <dl className="text-sm space-y-2">
              <Row label="Event" value={ev.title} />
              {groupMode === 'group' && (
                <Row label="Group" value={
                  <span>
                    <span className="font-semibold">{groupName}</span>
                    <span className="text-zinc-500"> · {GROUP_TYPES.find((g) => g.id === groupType)?.label}</span>
                  </span>
                } />
              )}
              <Row label="Ticket" value={`${ticketType?.name} × ${quantity}`} />
              {accommodation && <Row label="Accommodation" value={`${accommodation.name} × ${quantity}`} />}
              <Row label="Attendees" value={
                <ul className="text-right">
                  {attendees.map((a, i) => (
                    <li key={i}>{a.firstName} {a.lastName} · <span className="text-zinc-500">{a.email}</span></li>
                  ))}
                </ul>
              } />
              <Row label="Total" value={<span className="font-extrabold text-base">{priceLabel(totalCents)}</span>} />
            </dl>
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I agree to the event terms and acknowledge that photos may be taken during the event.</span>
            </label>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-muted-coral">{error}</div>}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <button onClick={back} disabled={stepIdx === 0} className="btn-soft">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {stepIdx < STEPS.length - 1 ? (
          <button onClick={next} className="btn-primary">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={submitting} className="btn-primary">
            {submitting ? 'Submitting…' : `Complete registration · ${priceLabel(totalCents)}`}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="py-3 flex items-start justify-between gap-4">
      <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500 pt-0.5">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
