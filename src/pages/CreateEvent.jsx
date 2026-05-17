import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronUp,
  Calendar, MapPin, Lock, Globe, Plus, Trash2, Share2, Image as ImageIcon, Save,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';
import { GRADIENT_PRESETS } from '../mockData.js';
import { slugify } from '../eventStore.js';
import ShareEventModal from '../components/ShareEventModal.jsx';

// "Google-Form-style" event creator for any signed-in user. The form is
// deliberately spare by default — title, when, where, capacity, public-vs-
// private — and reveals every other knob (ticket tiers, accommodation,
// cover gradient, banner, schedule) behind an Advanced disclosure for
// power users. Submit hits POST /api/events; the backend stamps
// creator_email from the session token so the user owns the event.

const SINGLE_TICKET_ID = 'rsvp';

function emptyEvent() {
  return {
    title: '',
    summary: '',
    location: '',
    startsAt: '',
    endsAt: '',
    capacity: 50,
    // A single default RSVP-style free ticket — the simple form doesn't
    // expose multi-tier pricing. Advanced mode replaces this list wholesale.
    ticketTypes: [{
      id: SINGLE_TICKET_ID,
      name: 'RSVP',
      role: 'attendee',
      priceCents: 0,
      capacity: 50,
      sold: 0,
      description: '',
    }],
    accommodation: [],
    schedule: [],
    coverColor: GRADIENT_PRESETS[0].classes,
    bannerUrl: '',
    requiresLogin: false,
  };
}

function toLocalDT(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalDT(local) {
  return local ? new Date(local).toISOString() : '';
}

export default function CreateEvent() {
  const { user, isSuperAdmin } = useAuth();
  const nav = useNavigate();
  const [ev, setEv] = useState(emptyEvent);
  const [advanced, setAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  const id = useMemo(() => slugify(ev.title || ''), [ev.title]);

  function patch(delta) { setEv((p) => ({ ...p, ...delta })); }

  // Keep the single-ticket capacity in lockstep with the simple "capacity"
  // field so a normal user doesn't have to know about ticket tiers. Advanced
  // mode lets them break this link by editing ticketTypes directly.
  function setCapacity(n) {
    const next = Math.max(1, Math.min(10000, parseInt(n, 10) || 1));
    setEv((p) => ({
      ...p,
      capacity: next,
      ticketTypes: p.ticketTypes.length === 1
        ? [{ ...p.ticketTypes[0], capacity: next }]
        : p.ticketTypes,
    }));
  }

  async function submit() {
    setError('');
    if (!ev.title.trim())    { setError('Event title is required.'); return; }
    if (!id)                 { setError('Title must contain at least one letter or number.'); return; }
    if (!ev.startsAt)        { setError('Pick a start date and time.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...ev,
        id,
        startsAt: fromLocalDT(ev.startsAt),
        endsAt:   fromLocalDT(ev.endsAt),
        // Stamped server-side from session token, but we mirror it locally
        // for the success state. Server is the source of truth.
        creatorEmail: user?.email || null,
        _isNew: true,
      };
      const saved = await api.saveUserEvent(payload);
      setCreated(saved);
    } catch (e) {
      setError(e?.message || 'Could not create the event.');
    } finally {
      setSubmitting(false);
    }
  }

  // Success view — emphasises the shareable /r/:id link, no website tour.
  if (created) {
    const shareUrl = `${window.location.origin}/r/${created.id}`;
    return (
      <div className="max-w-lg mx-auto card p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-tertiary mx-auto" />
          <h1 className="text-2xl font-extrabold tracking-tight">Event created</h1>
          <p className="text-sm text-on-surface-variant">
            <strong>{created.title}</strong> is live. Share the link below — anyone with it can register.
          </p>
        </div>

        <div className="surface-inset p-4 rounded-lg space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Registration link
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="input font-mono text-xs flex-1"
            />
            <button onClick={() => setShareOpen(true)} className="btn-primary !px-3">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          {created.requiresLogin && (
            <p className="text-[11px] text-on-surface-variant">
              <Lock className="inline h-3 w-3 mr-1" />
              Registrants must sign in (Google or magic link) before they can fill the form.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Link to="/dashboard" className="btn-soft">Back to dashboard</Link>
          <button
            onClick={() => { setCreated(null); setEv(emptyEvent()); }}
            className="btn-soft"
          >
            Create another
          </button>
        </div>

        <ShareEventModal event={created} open={shareOpen} onClose={() => setShareOpen(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Create event</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Fill in the basics, hit Publish — you'll get a shareable link to send out. Like a Google Form, but with tickets and check-in built in.
        </p>
      </div>

      {/* — Basics (always visible) — */}
      <div className="card p-5 sm:p-6 space-y-5">
        <div>
          <label className="label">Event title *</label>
          <input
            className="input"
            placeholder="E.g. Youth Camp 2026"
            value={ev.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          {ev.title && (
            <p className="text-[11px] text-on-surface-variant mt-1.5">
              Share link will be <span className="font-mono">/r/{id || '…'}</span>
            </p>
          )}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[5rem] resize-y"
            placeholder="What is this event about? (optional)"
            value={ev.summary}
            onChange={(e) => patch({ summary: e.target.value })}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Starts *
            </label>
            <input
              type="datetime-local"
              className="input"
              value={ev.startsAt}
              onChange={(e) => patch({ startsAt: e.target.value })}
            />
          </div>
          <div>
            <label className="label inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Ends
            </label>
            <input
              type="datetime-local"
              className="input"
              value={ev.endsAt}
              onChange={(e) => patch({ endsAt: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Location
          </label>
          <input
            className="input"
            placeholder="E.g. Main Auditorium, Lagos"
            value={ev.location}
            onChange={(e) => patch({ location: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Capacity</label>
          <input
            type="number"
            min="1"
            className="input w-32"
            value={ev.capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <p className="text-[11px] text-on-surface-variant mt-1.5">
            How many people total can register.
          </p>
        </div>

        {/* Public vs login-required */}
        <div className="space-y-2">
          <div className="label">Who can register?</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => patch({ requiresLogin: false })}
              className={`text-left rounded-lg ring-1 p-3 transition ${
                !ev.requiresLogin
                  ? 'ring-brand-600 bg-brand-50/60'
                  : 'ring-outline-variant/20 hover:ring-outline-variant/40'
              }`}
            >
              <div className="font-bold text-sm flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-brand-600" /> Anyone with the link
              </div>
              <div className="text-[11px] text-on-surface-variant mt-1">
                No sign-in required. Best for open invites you share on WhatsApp / SMS.
              </div>
            </button>
            <button
              type="button"
              onClick={() => patch({ requiresLogin: true })}
              className={`text-left rounded-lg ring-1 p-3 transition ${
                ev.requiresLogin
                  ? 'ring-brand-600 bg-brand-50/60'
                  : 'ring-outline-variant/20 hover:ring-outline-variant/40'
              }`}
            >
              <div className="font-bold text-sm flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-brand-600" /> Signed-in users only
              </div>
              <div className="text-[11px] text-on-surface-variant mt-1">
                Registrants must sign in with Google or a magic-link email first.
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* — Advanced (collapsed by default) — */}
      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="w-full p-4 flex items-center justify-between text-sm font-bold hover:bg-zinc-50"
        >
          <span className="inline-flex items-center gap-2">
            Advanced settings
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Tickets · Cover · Banner
            </span>
          </span>
          {advanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {advanced && (
          <div className="border-t border-outline-variant/30 p-5 sm:p-6 space-y-6">
            {/* Cover gradient */}
            <div>
              <div className="label">Cover gradient</div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {GRADIENT_PRESETS.map((g) => (
                  <button
                    key={g.classes}
                    type="button"
                    onClick={() => patch({ coverColor: g.classes })}
                    aria-label={g.name}
                    className={`h-12 rounded-lg ring-2 transition bg-gradient-to-br ${g.classes} ${
                      ev.coverColor === g.classes ? 'ring-brand-600' : 'ring-transparent hover:ring-zinc-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Banner URL */}
            <div>
              <label className="label inline-flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Banner image URL
              </label>
              <input
                className="input"
                placeholder="https://… (optional, overlays the gradient)"
                value={ev.bannerUrl}
                onChange={(e) => patch({ bannerUrl: e.target.value })}
              />
            </div>

            {/* Multi-tier tickets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label !mb-0">Ticket tiers</div>
                  <div className="text-[11px] text-on-surface-variant">
                    Default is one free RSVP tier. Add paid / VIP / student tiers if needed.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEv((p) => ({
                    ...p,
                    ticketTypes: [
                      ...p.ticketTypes,
                      {
                        id: `tier-${p.ticketTypes.length + 1}`,
                        name: 'New tier',
                        role: 'attendee',
                        priceCents: 0,
                        capacity: 20,
                        sold: 0,
                        description: '',
                      },
                    ],
                  }))}
                  className="btn-soft"
                >
                  <Plus className="h-4 w-4" /> Add tier
                </button>
              </div>
              <div className="space-y-2">
                {ev.ticketTypes.map((t, i) => (
                  <div key={t.id} className="rounded-lg ring-1 ring-outline-variant/20 p-3 space-y-2">
                    <div className="grid sm:grid-cols-[1fr_120px_120px_auto] gap-2 items-end">
                      <div>
                        <label className="label">Name</label>
                        <input
                          className="input"
                          value={t.name}
                          onChange={(e) => setEv((p) => ({
                            ...p,
                            ticketTypes: p.ticketTypes.map((x, j) => j === i ? { ...x, name: e.target.value } : x),
                          }))}
                        />
                      </div>
                      <div>
                        <label className="label">Price (¢)</label>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          value={t.priceCents}
                          onChange={(e) => setEv((p) => ({
                            ...p,
                            ticketTypes: p.ticketTypes.map((x, j) => j === i ? { ...x, priceCents: parseInt(e.target.value, 10) || 0 } : x),
                          }))}
                        />
                      </div>
                      <div>
                        <label className="label">Capacity</label>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          value={t.capacity}
                          onChange={(e) => setEv((p) => ({
                            ...p,
                            ticketTypes: p.ticketTypes.map((x, j) => j === i ? { ...x, capacity: parseInt(e.target.value, 10) || 0 } : x),
                          }))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEv((p) => ({
                          ...p,
                          ticketTypes: p.ticketTypes.filter((_, j) => j !== i),
                        }))}
                        disabled={ev.ticketTypes.length === 1}
                        className="btn-ghost !h-10 disabled:opacity-30"
                        title={ev.ticketTypes.length === 1 ? 'Keep at least one tier' : 'Remove tier'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isSuperAdmin && (
              <div className="rounded-lg ring-1 ring-amber-200 bg-amber-50/60 p-3 text-xs text-on-surface">
                You're signed in as a super admin. For the full editor (accommodation, seating map, schedule, banner upload), use the{' '}
                <Link to="/admin/events/new" className="font-semibold text-brand-700 underline">classic admin form</Link>.
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="text-sm text-muted-coral">{error}</div>}

      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="btn-soft">Cancel</Link>
        <button onClick={submit} disabled={submitting} className="btn-primary">
          <Save className="h-4 w-4" />
          {submitting ? 'Publishing…' : 'Publish event'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
