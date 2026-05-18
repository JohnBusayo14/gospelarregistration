import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Image as ImageIcon, Calendar, MapPin, Save, Trash2, IdCard, Share2,
} from 'lucide-react';
import { api } from '../api.js';
import { GRADIENT_PRESETS, ROOM_TYPES } from '../mockData.js';
import { slugify } from '../lib/slug.js';
import { useChurch } from '../churchContext.jsx';
import ShareEventModal from '../components/ShareEventModal.jsx';

// The five canonical ticket types every event ships with. The editor renders
// these as a fixed table — admins can tune price/capacity/description per row
// but cannot add or remove rows. Role is implied by id (only `worker` is staff).
const DEFAULT_TICKET_TYPES = [
  { id: 'free',    name: 'Free',     role: 'attendee', priceCents:     0, capacity:  50, sold: 0, description: 'Complimentary admission.' },
  { id: 'regular', name: 'Regular',  role: 'attendee', priceCents: 10000, capacity: 200, sold: 0, description: 'Standard attendee ticket.' },
  { id: 'vip',     name: 'VIP',      role: 'attendee', priceCents: 25000, capacity:  30, sold: 0, description: 'Premium seating and reception access.' },
  { id: 'student', name: 'Student',  role: 'attendee', priceCents:  5000, capacity:  50, sold: 0, description: 'Valid student ID required at check-in.' },
  { id: 'worker',  name: 'Worker',   role: 'staff',    priceCents:     0, capacity:  40, sold: 0, description: 'For volunteers and ministry workers.' },
];

const inferTicketRole = (id) => (id === 'worker' ? 'staff' : 'attendee');

// Merge an event's stored ticketTypes onto the canonical 5 slots, so old
// events (built with the previous dynamic editor) snap back into the fixed
// layout without losing their price/capacity/description values.
function normalizeTicketTypes(incoming) {
  const byId = new Map((incoming || []).map((t) => [t.id, t]));
  return DEFAULT_TICKET_TYPES.map((def) => {
    const existing = byId.get(def.id);
    return {
      ...def,
      ...(existing || {}),
      // Force the canonical name + inferred role — admins can't override either.
      name: def.name,
      role: inferTicketRole(def.id),
    };
  });
}

// One optional accommodation block (previously an array of arbitrary rows).
const emptyAccommodation = () => ({
  id: 'lodging', name: '', type: 'lodge', sharing: 'shared',
  bedsPerRoom: 4, priceCents: 0, capacity: 0, taken: 0, description: '',
});

function emptyEvent(churchId = '') {
  return {
    id: '',
    churchId,
    title: '',
    tagline: '',
    summary: '',
    location: '',
    startsAt: '',
    endsAt: '',
    registrationDeadline: '',
    coverColor: GRADIENT_PRESETS[0].classes,
    bannerUrl: '',
    schedule: [],
    ticketTypes: DEFAULT_TICKET_TYPES.map((t) => ({ ...t })),
    accommodation: [],
    _isNew: true,
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

const Section = ({ title, hint, children }) => (
  <section className="card p-6 space-y-4">
    <header>
      <h2 className="font-bold tracking-tight">{title}</h2>
      {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
    </header>
    {children}
  </section>
);

export default function AdminEventEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { church } = useChurch();
  const isNew = !id || id === 'new';
  const [ev, setEv] = useState(isNew ? emptyEvent(church?.id || '') : null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  // Adopt the selected church into a freshly opened "new event" form so we
  // don't strand the event in a different tenant on save.
  useEffect(() => {
    if (isNew && church?.id) setEv((p) => p && !p.churchId ? { ...p, churchId: church.id } : p);
  }, [church, isNew]);

  useEffect(() => {
    if (isNew) return;
    api.getEvent(id).then((data) => {
      if (data) {
        // Normalize old events into the fixed 5-row ticket layout. Schedule
        // and accommodation arrays come through as-is; the JSX derives a
        // textarea / single block from them at render time.
        data.ticketTypes = normalizeTicketTypes(data.ticketTypes);
      }
      setEv(data ? { ...data, _isNew: false } : null);
      setLoading(false);
    });
  }, [id, isNew]);

  // Schedule textarea is rendered as a derived string. We keep the underlying
  // ev.schedule as the legacy [{day, items}] shape so EventDetails.jsx keeps
  // working unchanged — this useMemo lives above the early returns because
  // hooks must run in the same order on every render.
  const scheduleText = useMemo(
    () => (ev?.schedule?.[0]?.items || []).join('\n'),
    [ev?.schedule],
  );

  if (loading) return <div className="text-zinc-500">Loading…</div>;
  if (!ev) {
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-500">Event not found.</p>
        <Link to="/admin" className="btn-soft mt-4">Back to admin</Link>
      </div>
    );
  }

  const set  = (k) => (e) => setEv((p) => ({ ...p, [k]: e.target.value }));
  const setF = (k, v) => setEv((p) => ({ ...p, [k]: v }));

  // Schedule writer — pairs with the scheduleText useMemo above.
  const setScheduleText = (text) => {
    setF('schedule', [{ day: 'Schedule', items: text.split('\n') }]);
  };

  // Accommodation toggle — when on, the editor binds to ev.accommodation[0];
  // when off, the array is empty and the form save persists []. Toggling on
  // seeds a fresh empty block so the inputs render with defaults.
  const accommodationEnabled = ev.accommodation.length > 0;
  const acc = accommodationEnabled ? ev.accommodation[0] : null;
  const toggleAccommodation = (on) => {
    setF('accommodation', on ? [emptyAccommodation()] : []);
  };
  const updateAcc = (patch) => {
    setF('accommodation', [{ ...(ev.accommodation[0] || emptyAccommodation()), ...patch }]);
  };

  async function save() {
    if (!ev.title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try {
      // Strip blank lines from the schedule textarea on save. If the user
      // left it empty, drop the day entirely so EventDetails.jsx skips the
      // schedule block instead of rendering an empty section.
      const scheduleItems = scheduleText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const scheduleOut = scheduleItems.length
        ? [{ day: 'Schedule', items: scheduleItems }]
        : [];
      const payload = {
        ...ev,
        id: ev.id || slugify(ev.title) || `event-${Date.now()}`,
        startsAt:             fromLocalDT(ev.startsAt) || ev.startsAt,
        endsAt:               fromLocalDT(ev.endsAt)   || ev.endsAt,
        registrationDeadline: fromLocalDT(ev.registrationDeadline) || ev.registrationDeadline,
        schedule:      scheduleOut,
        ticketTypes:   ev.ticketTypes,
        accommodation: ev.accommodation.filter((a) => a.name?.trim()),
      };
      await api.saveEvent(payload);
      nav('/admin');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this event? Existing tickets keep their event title but are orphaned.')) return;
    await api.deleteEvent(ev.id);
    nav('/admin');
  }

  // Ticket types are a fixed table of 5 rows — admins edit price, capacity,
  // and description in place. No add/remove (handled by the canonical layout).
  const updateTicket = (i, patch) => setF('ticketTypes',
    ev.ticketTypes.map((t, x) => x === i ? { ...t, ...patch } : t),
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="flex flex-wrap gap-2">
          {!isNew && (
            <button type="button" onClick={() => setShareOpen(true)} className="btn-ghost">
              <Share2 className="h-4 w-4" /> Share link
            </button>
          )}
          {!isNew && (
            <Link to={`/admin/events/${ev.id}/badges`} className="btn-ghost">
              <IdCard className="h-4 w-4" /> Print badges
            </Link>
          )}
          {!isNew && (
            <button onClick={remove} className="btn-ghost text-muted-coral hover:bg-muted-coral/10">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <button onClick={save} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save event'}
          </button>
        </div>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight">
        {isNew ? 'New event' : 'Edit event'}
      </h1>

      {err && <div className="card p-4 text-sm text-muted-coral bg-muted-coral/10">{err}</div>}

      <Section title="Details" hint="Title, summary, location, and dates.">
        <div>
          <label className="label">Title</label>
          <input className="input" value={ev.title} onChange={set('title')} placeholder="Spring Renewal Retreat 2026" />
        </div>
        <div>
          <label className="label">Tagline</label>
          <input className="input" value={ev.tagline} onChange={set('tagline')} placeholder="Three days of worship, teaching, and rest" />
        </div>
        <div>
          <label className="label">Summary</label>
          <textarea className="input min-h-[100px]" value={ev.summary} onChange={set('summary')} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input className="input pl-9" value={ev.location} onChange={set('location')} />
            </div>
          </div>
          <div>
            <label className="label">Registration deadline</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="datetime-local"
                className="input pl-9"
                value={toLocalDT(ev.registrationDeadline)}
                onChange={(e) => setF('registrationDeadline', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Starts at</label>
            <input
              type="datetime-local"
              className="input"
              value={toLocalDT(ev.startsAt)}
              onChange={(e) => setF('startsAt', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Ends at</label>
            <input
              type="datetime-local"
              className="input"
              value={toLocalDT(ev.endsAt)}
              onChange={(e) => setF('endsAt', e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Banner" hint="Pick a gradient or paste a banner image URL.">
        <div className={`h-32 rounded-xl bg-gradient-to-br ${ev.coverColor} relative overflow-hidden ring-1 ring-zinc-200`}>
          {ev.bannerUrl && (
            <img src={ev.bannerUrl} alt="banner preview" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute bottom-3 left-3 chip bg-white/90 text-ink">{ev.title || 'Preview'}</div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setF('coverColor', g.classes)}
              className={`h-12 rounded-lg bg-gradient-to-br ${g.classes} ring-2 transition ${
                ev.coverColor === g.classes ? 'ring-brand-600' : 'ring-transparent hover:ring-zinc-300'
              }`}
              title={g.label}
            />
          ))}
        </div>
        <div>
          <label className="label">Banner image URL (optional)</label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input className="input pl-9" value={ev.bannerUrl} onChange={set('bannerUrl')} placeholder="https://…/banner.jpg" />
          </div>
        </div>
      </Section>

      <Section title="Seating (optional)" hint="Turn on to auto-assign sequential seats at registration. Leave blank for un-seated events.">
        {(() => {
          const rows        = ev.seating?.rows || 0;
          const seatsPerRow = ev.seating?.seatsPerRow || 0;
          const totalSeats  = rows * seatsPerRow;
          const setSeating  = (patch) => setF('seating', { ...(ev.seating || {}), ...patch });
          return (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Rows</label>
                  <input
                    type="number" min="0"
                    className="input"
                    value={rows}
                    onChange={(e) => setSeating({ rows: parseInt(e.target.value || 0, 10) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">Seats per row</label>
                  <input
                    type="number" min="0"
                    className="input"
                    value={seatsPerRow}
                    onChange={(e) => setSeating({ seatsPerRow: parseInt(e.target.value || 0, 10) })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <div className="surface-inset px-4 py-3 text-sm w-full">
                    <span className="text-on-surface-variant text-xs uppercase tracking-wider font-bold">Total seats</span>
                    <div className="font-display font-extrabold text-xl tabular text-on-surface">{totalSeats || '—'}</div>
                  </div>
                </div>
              </div>
              {totalSeats > 0 && (
                <p className="text-xs text-on-surface-variant">
                  First seat: <span className="font-mono font-bold">A1</span> · Last seat:{' '}
                  <span className="font-mono font-bold">
                    {String.fromCharCode(64 + Math.min(rows, 26))}{seatsPerRow}
                  </span>. Groups registering together get consecutive seats when one row has space.
                </p>
              )}
            </>
          );
        })()}
      </Section>

      <Section title="Schedule" hint="One item per line. Shown on the event page exactly as written.">
        <textarea
          className="input min-h-[140px] font-mono text-sm leading-relaxed"
          placeholder={'Friday 7:00 PM — Opening worship\nSaturday 9:00 AM — Teaching session\nSaturday 6:00 PM — Evening service'}
          value={scheduleText}
          onChange={(e) => setScheduleText(e.target.value)}
        />
      </Section>

      <Section title="Ticket types" hint="Five canonical ticket tiers. Set price and capacity for each — leave capacity at 0 to hide a tier.">
        <div className="space-y-2">
          {ev.ticketTypes.map((t, i) => (
            <div key={t.id} className="ring-1 ring-zinc-200 rounded-lg p-4 grid gap-3 sm:grid-cols-[160px_120px_120px_1fr] items-end">
              <div>
                <label className="label">Tier</label>
                <div className="rounded-md bg-zinc-50 ring-1 ring-zinc-200 px-3 py-2 text-sm font-semibold text-ink">
                  {t.name}
                </div>
              </div>
              <div>
                <label className="label">Price (USD)</label>
                <input
                  type="number" min="0" step="1"
                  className="input"
                  value={t.priceCents / 100}
                  onChange={(e) => updateTicket(i, { priceCents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                />
              </div>
              <div>
                <label className="label">Capacity</label>
                <input
                  type="number" min="0"
                  className="input"
                  value={t.capacity}
                  onChange={(e) => updateTicket(i, { capacity: parseInt(e.target.value || 0, 10) })}
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  className="input"
                  value={t.description}
                  onChange={(e) => updateTicket(i, { description: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Accommodation (optional)" hint="Toggle on if attendees need lodging. One option per event — registrants can select it or skip during signup.">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            checked={accommodationEnabled}
            onChange={(e) => toggleAccommodation(e.target.checked)}
          />
          <span className="text-sm font-semibold text-ink">Offer accommodation for this event</span>
        </label>

        {acc && (() => {
          const cap = acc.capacity || 0;
          const taken = acc.taken || 0;
          const left = Math.max(0, cap - taken);
          const pct = cap > 0 ? Math.min(100, Math.round((taken / cap) * 100)) : 0;
          const barColor = pct >= 100 ? 'bg-muted-coral' : pct >= 80 ? 'bg-calm-amber' : 'bg-primary-500';
          return (
            <div className="ring-1 ring-zinc-200 rounded-lg p-4 space-y-3">
              <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={acc.name} onChange={(e) => updateAcc({ name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Add-on price (USD)</label>
                  <input
                    type="number" min="0" step="1"
                    className="input w-28"
                    value={acc.priceCents / 100}
                    onChange={(e) => updateAcc({ priceCents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                  />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input
                    type="number" min="0"
                    className="input w-24"
                    value={acc.capacity}
                    onChange={(e) => updateAcc({ capacity: parseInt(e.target.value || 0, 10) })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Room type</label>
                  <select
                    className="input"
                    value={acc.type || 'lodge'}
                    onChange={(e) => updateAcc({ type: e.target.value })}
                  >
                    {ROOM_TYPES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Sharing</label>
                  <div className="flex gap-2">
                    {['shared', 'private'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateAcc({ sharing: s })}
                        className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold ring-1 transition ${
                          (acc.sharing || 'shared') === s
                            ? 'ring-brand-600 bg-brand-50/50 text-brand-700'
                            : 'ring-zinc-200 hover:ring-zinc-300'
                        }`}
                      >
                        {s === 'shared' ? 'Shared' : 'Private'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-[auto_1fr] gap-3 items-end">
                <div>
                  <label className="label">Beds per room</label>
                  <input
                    type="number" min="0"
                    className="input w-28"
                    value={acc.bedsPerRoom ?? 4}
                    onChange={(e) => updateAcc({ bedsPerRoom: parseInt(e.target.value || 0, 10) })}
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    {(() => {
                      const bpr = Math.max(1, acc.bedsPerRoom || 4);
                      return cap > 0
                        ? `≈ ${Math.ceil(cap / bpr)} physical room${Math.ceil(cap / bpr) === 1 ? '' : 's'}`
                        : 'Used for auto room assignment';
                    })()}
                  </p>
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input" value={acc.description} onChange={(e) => updateAcc({ description: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold uppercase tracking-wider text-zinc-500">Occupancy</span>
                  <span className="tabular text-zinc-700">
                    <strong>{taken}</strong> / {cap} taken · {left} left
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })()}
      </Section>

      <div className="flex justify-end gap-2 pt-2">
        <Link to="/admin" className="btn-soft">Cancel</Link>
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save event'}
        </button>
      </div>

      {!isNew && (
        <ShareEventModal
          open={shareOpen}
          event={ev}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
