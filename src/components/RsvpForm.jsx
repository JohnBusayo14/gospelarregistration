import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../authContext.jsx';
import { api } from '../api.js';
import SeatMap from './SeatMap.jsx';
import { assignSeats } from '../lib/assignment.js';

// Short-form RSVP renderer. Used when an event has `customQuestions` set
// (e.g. the wedding template) — Register.jsx renders THIS instead of the
// long default attendee form.
//
// Convention for mapping answers back to attendee identity columns:
//   answers.name        → attendee firstName (lastName left blank)
//   answers.email       → attendee email
//   answers.phone       → attendee phone
//   answers.plus_one    → "Yes, a plus-one" creates a second attendee
//   answers.plus_one_name → that second attendee's first name
//
// Any other questions become free-form answers stored on every minted
// ticket in `event_tickets.custom_answers` (JSONB) — admins can read them
// from the ticket detail page.
//
// On success, calls `onComplete(result)` with the same shape as api.register,
// so the host page's existing confirmation block fires automatically.
//
// `previewMode` (optional): when true, the submit button is disabled and
// the form acts as a live preview only — used by CreateEvent so the
// organizer can see what attendees will see while editing the questions.
export default function RsvpForm({ event, onComplete, previewMode = false }) {
  const { user } = useAuth();
  const questions = event.customQuestions || [];

  // Initial values: empty strings, except for an `email` question we seed
  // with the signed-in user's email so RSVPs don't ask people to retype
  // what we already know.
  const [answers, setAnswers] = useState(() => {
    const seed = {};
    for (const q of questions) {
      if (q.id === 'email' && user?.email) seed[q.id] = user.email;
      else seed[q.id] = '';
    }
    return seed;
  });

  // Once auth resolves AFTER the form mounted, fill in the email if blank.
  useEffect(() => {
    if (!user?.email) return;
    setAnswers((prev) => {
      const hasEmailQ = questions.some((q) => q.id === 'email');
      if (!hasEmailQ || prev.email) return prev;
      return { ...prev, email: user.email };
    });
  }, [user?.email, questions]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (id) => (e) =>
    setAnswers((p) => ({ ...p, [id]: typeof e === 'string' ? e : e.target.value }));

  const ticketTypeId = event.ticketTypes?.[0]?.id;
  const eventTitle   = event.title || 'this event';

  // Bringing-a-plus-one detection — only relevant when the template defines
  // a question with id "plus_one" whose chosen option starts with "Yes".
  const bringsPlusOne = useMemo(() => {
    const v = answers.plus_one || '';
    return /^yes/i.test(String(v).trim());
  }, [answers.plus_one]);

  // Seat selection — only meaningful for events with a seating grid set.
  // We fetch existing tickets once at mount to grey out taken seats; the
  // user picks 1 (or 2 with plus-one) seat labels that ride along in the
  // register payload. Leaving picks blank means "let the backend auto-
  // assign", same fallback the long wizard uses.
  const hasSeating = !!(event.seating?.rows > 0 && event.seating?.seatsPerRow > 0);
  const seatCount  = bringsPlusOne ? 2 : 1;
  const [takenSeats, setTakenSeats] = useState([]);
  const [seatPicks, setSeatPicks]   = useState(['']);

  useEffect(() => {
    // Keep seatPicks length in sync with attendee count (1 or 2). Pad with
    // '' for new slots; truncate when plus-one is toggled off.
    setSeatPicks((prev) => {
      const out = prev.slice(0, seatCount);
      while (out.length < seatCount) out.push('');
      return out;
    });
  }, [seatCount]);

  useEffect(() => {
    if (!hasSeating || previewMode) return;
    let cancelled = false;
    api.listEventTickets(event.id)
      .then((rows) => {
        if (cancelled) return;
        const taken = (rows || []).map((t) => t.seatLabel || '').filter(Boolean);
        setTakenSeats(taken);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [event.id, hasSeating, previewMode]);

  function toggleSeat(label) {
    setSeatPicks((prev) => {
      const next = prev.slice();
      const at = next.indexOf(label);
      if (at >= 0) { next[at] = ''; return next; }
      const empty = next.indexOf('');
      if (empty >= 0) { next[empty] = label; return next; }
      return next; // all slots full — clicking grey seats is already blocked
    });
  }

  function autoPickSeats() {
    const pseudo = takenSeats.map((seatLabel) => ({ eventId: event.id, seatLabel }));
    const picks  = assignSeats({ event, existingTickets: pseudo, count: seatCount });
    setSeatPicks(picks);
  }

  // Did the registrant decline? Templates vary on the question id —
  // wedding uses "rsvp", baby-dedication and mens-fellowship use "attending".
  // Either with a "No"-prefixed answer counts as declining; we still record
  // it so the organizer sees the response on the guest list.
  const decliningRsvp = useMemo(() => {
    const v = answers.rsvp || answers.attending || '';
    return /^no/i.test(String(v).trim());
  }, [answers.rsvp, answers.attending]);

  function validate() {
    for (const q of questions) {
      if (!q.required) continue;
      const v = String(answers[q.id] || '').trim();
      if (!v) {
        setError(`${q.label} is required.`);
        return false;
      }
      if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        setError(`Enter a valid email for "${q.label}".`);
        return false;
      }
    }
    if (bringsPlusOne) {
      const name = String(answers.plus_one_name || '').trim();
      if (!name) {
        setError("Please share your plus-one's name.");
        return false;
      }
    }
    return true;
  }

  async function submit(e) {
    e?.preventDefault?.();
    if (previewMode) return; // no-op in preview
    setError('');
    if (!validate()) return;
    if (!ticketTypeId) {
      setError('This event has no ticket type set up yet. Tell the organizer.');
      return;
    }

    // "No, I can't make it" path — record the regret as a single ticket
    // marked declined so the couple's guest list shows the response. We
    // still issue a ticket because the existing data model stores RSVPs
    // as tickets; admins filter by custom_answers.rsvp on the dashboard.
    //
    // Map every standard answer id (title / sex / region / district / …)
    // into the attendee object so the backend stores them as proper
    // attendee_profile JSON, matching what the long-form attendee wizard
    // would have produced. This means ticket, badge, and admin views
    // continue to read flat fields without knowing about customAnswers.
    const attendees = [answersToAttendee(answers)];
    if (bringsPlusOne && !decliningRsvp) {
      attendees.push({
        ...answersToAttendee({}),
        firstName: String(answers.plus_one_name || '').trim(),
      });
    }

    // Pass seatLabels only when the user has picked every slot — otherwise
    // an all-blank array would short-circuit the backend's auto-assigner.
    // Declines never carry seat picks; the registrant won't be there.
    const fullySeated = hasSeating && !decliningRsvp
      && seatPicks.length === attendees.length
      && seatPicks.every(Boolean);

    setSubmitting(true);
    try {
      const result = await api.register(event.id, {
        ticketTypeId,
        attendees,
        customAnswers: answers,
        ...(fullySeated ? { seatLabels: seatPicks } : {}),
      });
      onComplete?.(result);
    } catch (err) {
      setError(err?.message || 'Could not submit your RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Group consecutive related questions into side-by-side pairs on sm+
  // screens (single column on mobile). Keeps a 22-field church form
  // readable instead of stacked single-column on a laptop.
  const rows = pairRows(questions, bringsPlusOne);

  return (
    <form
      onSubmit={submit}
      className="max-w-2xl mx-auto card p-4 sm:p-7 lg:p-9 space-y-5 sm:space-y-7"
    >
      <header className="space-y-1.5">
        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-on-surface">
          {eventTitle}
        </h1>
        {event.tagline && (
          <p className="text-xs sm:text-sm text-on-surface-variant">{event.tagline}</p>
        )}
      </header>

      <div className="space-y-4 sm:space-y-5">
        {rows.map((row, ri) => (
          row.length === 2 ? (
            <div key={ri} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <Field q={row[0]} value={answers[row[0].id] ?? ''} onChange={set(row[0].id)} />
              <Field q={row[1]} value={answers[row[1].id] ?? ''} onChange={set(row[1].id)} />
            </div>
          ) : (
            <Field key={ri} q={row[0]} value={answers[row[0].id] ?? ''} onChange={set(row[0].id)} />
          )
        ))}
      </div>

      {/* Seat picker — only on events with a seating grid, and hidden while
          the user is declining (no seat needed). Optional: leave the picks
          blank and the backend auto-assigns at submit. */}
      {hasSeating && !decliningRsvp && (
        <div className="space-y-3 pt-2 border-t border-outline-variant/30">
          <div>
            <label className="label flex items-center gap-1.5">
              <span>Pick your seat{seatCount === 2 ? 's' : ''}</span>
              <span className="text-on-surface-variant text-[10px] font-normal normal-case tracking-normal">
                — optional, we'll auto-assign if you skip
              </span>
            </label>
          </div>
          <SeatMap
            rows={event.seating.rows}
            seatsPerRow={event.seating.seatsPerRow}
            takenSeats={takenSeats}
            selected={seatPicks}
            quantity={seatCount}
            onToggle={toggleSeat}
            onAutoPick={autoPickSeats}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3 border border-red-100">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || previewMode}
        className="btn-primary w-full !py-3.5 justify-center text-sm sm:text-base sticky bottom-2 sm:static z-10"
        title={previewMode ? 'Preview mode — submit disabled' : undefined}
      >
        {previewMode
          ? 'Preview — submit disabled'
          : submitting
            ? 'Sending RSVP…'
            : decliningRsvp
              ? 'Send my regrets'
              : bringsPlusOne
                ? 'RSVP for two'
                : 'Send my RSVP'}
      </button>
    </form>
  );
}

// Ids that pair up nicely as 2-column rows on sm+ screens. Order matters:
// the first id must appear immediately before the second in the questions
// list for the pair to fire — otherwise both fall back to full-width rows.
// Keeps the layout predictable for templates with custom orderings.
const PAIR_IDS = [
  ['first_name',     'last_name'],
  ['city',           'country'],
  ['region',         'district'],
  ['emergency_name', 'emergency_phone'],
  ['phone',          'email'],
];

function pairRows(questions, bringsPlusOne) {
  const visible = questions.filter((q) =>
    !(q.id === 'plus_one_name' && !bringsPlusOne)
  );
  const rows = [];
  for (let i = 0; i < visible.length; i++) {
    const a = visible[i];
    const b = visible[i + 1];
    const pair = b && PAIR_IDS.some(([x, y]) => a.id === x && b.id === y);
    // Don't pair textarea / choice with anything — they need full width.
    if (pair && a.type !== 'textarea' && a.type !== 'choice'
             && b.type !== 'textarea' && b.type !== 'choice') {
      rows.push([a, b]);
      i++;
    } else {
      rows.push([a]);
    }
  }
  return rows;
}

function Field({ q, value, onChange }) {
  const baseLabel = (
    <label className="label flex items-center gap-1.5">
      <span>{q.label}</span>
      {q.required && <span className="text-red-500">*</span>}
    </label>
  );

  if (q.type === 'choice') {
    const options = q.options || [];

    // Long option lists (>8) — render as a native <select> so the form
    // doesn't grow a 28-tall column of button cards. Native picker is
    // also way nicer on mobile (wheel/sheet UI on iOS, dropdown on Android).
    if (options.length > 8) {
      return (
        <div className="space-y-2">
          {baseLabel}
          <select
            className="input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="" disabled>Select…</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    // Short option lists — keep the tactile button-card style. Two-column
    // grid on sm+ when there are 4+ options so they don't stack as tall.
    const useGrid = options.length >= 4;
    return (
      <div className="space-y-2">
        {baseLabel}
        <div className={`grid gap-2 ${useGrid ? 'sm:grid-cols-2' : ''}`}>
          {options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`text-left rounded-xl border px-4 py-3 text-sm transition ${
                  selected
                    ? 'border-primary-700 bg-primary-50 text-primary-900 shadow-glow'
                    : 'border-outline-variant/40 hover:border-primary-300 hover:bg-primary-50/40 text-on-surface'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.type === 'textarea') {
    return (
      <div className="space-y-2">
        {baseLabel}
        <textarea
          className="input min-h-[100px] resize-y"
          placeholder={q.placeholder || ''}
          value={value}
          onChange={onChange}
        />
      </div>
    );
  }

  // text / email / phone
  const inputType = q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : 'text';
  return (
    <div className="space-y-2">
      {baseLabel}
      <input
        type={inputType}
        className="input"
        placeholder={q.placeholder || ''}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

// Map the standard answer ids (defined in templates.js as STD_IDENTITY /
// STD_CONTACT / STD_LOCATION / STD_CONVENTION / STD_CLOSING) into the
// attendee object the backend stores in event_tickets columns +
// attendee_profile JSON. Also supports the wedding template's legacy
// single `name` field as a fallback for first_name.
function answersToAttendee(a = {}) {
  const firstName = String(a.first_name || a.name || '').trim();
  const lastName  = String(a.last_name || '').trim();
  return {
    firstName:          firstName || 'Guest',
    lastName,
    title:              String(a.title || '').trim(),
    sex:                String(a.sex || '').trim(),
    maritalStatus:      String(a.status || '').trim(),
    ageBracket:         String(a.age_bracket || '').trim(),
    phone:              String(a.phone || '').trim(),
    email:              String(a.email || '').trim().toLowerCase(),
    city:               String(a.city || '').trim(),
    country:            String(a.country || '').trim(),
    region:             String(a.region || '').trim(),
    district:           String(a.district || '').trim(),
    assembly:           String(a.assembly || '').trim(),
    conventionLocation: String(a.convention_location || '').trim(),
    dietary:            String(a.dietary || '').trim(),
    emergencyName:      String(a.emergency_name || '').trim(),
    emergencyPhone:     String(a.emergency_phone || '').trim(),
    otherInfo:          String(a.other_info || '').trim(),
  };
}
