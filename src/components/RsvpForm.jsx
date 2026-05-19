import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../authContext.jsx';
import { api } from '../api.js';

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
    const attendees = [{
      firstName: String(answers.name || '').trim() || 'Guest',
      lastName:  '',
      email:     String(answers.email || '').trim().toLowerCase(),
      phone:     String(answers.phone || '').trim(),
    }];
    if (bringsPlusOne && !decliningRsvp) {
      attendees.push({
        firstName: String(answers.plus_one_name || '').trim(),
        lastName:  '',
        email:     '',
        phone:     '',
      });
    }

    setSubmitting(true);
    try {
      const result = await api.register(event.id, {
        ticketTypeId,
        attendees,
        customAnswers: answers,
      });
      onComplete?.(result);
    } catch (err) {
      setError(err?.message || 'Could not submit your RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto card p-6 sm:p-8 space-y-6">
      <header className="space-y-1.5">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
          {eventTitle}
        </h1>
        {event.tagline && (
          <p className="text-sm text-on-surface-variant">{event.tagline}</p>
        )}
      </header>

      <div className="space-y-5">
        {questions.map((q) => {
          // Conditional reveal — only show "plus-one name" once the user
          // has said yes to the plus-one question. Keeps the form short.
          if (q.id === 'plus_one_name' && !bringsPlusOne) return null;
          return (
            <Field key={q.id} q={q} value={answers[q.id] ?? ''} onChange={set(q.id)} />
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3 border border-red-100">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || previewMode}
        className="btn-primary w-full !py-3 justify-center"
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

function Field({ q, value, onChange }) {
  const baseLabel = (
    <label className="label flex items-center gap-1.5">
      <span>{q.label}</span>
      {q.required && <span className="text-red-500">*</span>}
    </label>
  );

  if (q.type === 'choice') {
    return (
      <div className="space-y-2">
        {baseLabel}
        <div className="grid gap-2">
          {(q.options || []).map((opt) => {
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
