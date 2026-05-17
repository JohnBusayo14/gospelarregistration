import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Image as ImageIcon, Calendar, MapPin, Save, CheckCircle2,
  Share2, Lock, Plus, X,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';
import { useChurch } from '../churchContext.jsx';
import { GRADIENT_PRESETS, ROOM_TYPES, TICKET_ROLES } from '../mockData.js';
import { slugify } from '../eventStore.js';
import ShareEventModal from '../components/ShareEventModal.jsx';

const DEFAULT_TICKET_TYPES = [
  { id: 'free',    name: 'Free',     role: 'attendee', priceCents:     0, capacity:  50, sold: 0, description: 'Complimentary admission.' },
  { id: 'regular', name: 'Regular',  role: 'attendee', priceCents: 10000, capacity: 200, sold: 0, description: 'Standard attendee ticket.' },
  { id: 'vip',     name: 'VIP',      role: 'attendee', priceCents: 25000, capacity:  30, sold: 0, description: 'Premium seating and reception access.' },
  { id: 'student', name: 'Student',  role: 'attendee', priceCents:  5000, capacity:  50, sold: 0, description: 'Valid student ID required at check-in.' },
  { id: 'worker',  name: 'Worker',   role: 'staff',    priceCents:     0, capacity:  40, sold: 0, description: 'For volunteers and ministry workers.' },
];

const emptyAccommodation = () => ({
  id: 'lodging', name: '', type: 'lodge', sharing: 'shared',
  bedsPerRoom: 4, priceCents: 0, capacity: 0, taken: 0, description: '',
});

const emptyTicket = () => ({
  id: `tier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  name: '', role: 'attendee', priceCents: 0, capacity: 0, sold: 0, description: '',
});

const emptyScheduleDay = () => ({ day: '', items: [''] });

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
    schedule: [emptyScheduleDay()],
    seating: { rows: 0, seatsPerRow: 0 },
    ticketTypes: DEFAULT_TICKET_TYPES.map((t) => ({ ...t })),
    accommodation: [],
    requiresLogin: false,
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

const IconBtn = ({ onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="shrink-0 h-9 w-9 rounded-full grid place-items-center text-zinc-400 hover:text-muted-coral hover:bg-muted-coral/10 transition"
  >
    {children}
  </button>
);

export default function CreateEvent() {
  const { user } = useAuth();
  const { church } = useChurch();
  const [ev, setEv] = useState(() => emptyEvent(''));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [created, setCreated] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (church?.id) {
      setEv((p) => p.churchId ? p : { ...p, churchId: church.id });
    }
  }, [church]);

  const idPreview = useMemo(() => slugify(ev.title || ''), [ev.title]);

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
            onClick={() => { setCreated(null); setEv(emptyEvent(church?.id || '')); }}
            className="btn-soft"
          >
            Create another
          </button>
        </div>

        <ShareEventModal event={created} open={shareOpen} onClose={() => setShareOpen(false)} />
      </div>
    );
  }

  const set  = (k) => (e) => setEv((p) => ({ ...p, [k]: e.target.value }));
  const setF = (k, v) => setEv((p) => ({ ...p, [k]: v }));

  // Schedule (per-day, per-line) ------------------------------------------
  const updateDay  = (i, patch) => setF('schedule',
    ev.schedule.map((d, x) => x === i ? { ...d, ...patch } : d),
  );
  const addDay     = () => setF('schedule', [...ev.schedule, emptyScheduleDay()]);
  const removeDay  = (i) => setF('schedule', ev.schedule.filter((_, x) => x !== i));
  const addLine    = (i) => updateDay(i, { items: [...(ev.schedule[i].items || []), ''] });
  const updateLine = (i, j, val) => updateDay(i, {
    items: ev.schedule[i].items.map((it, y) => y === j ? val : it),
  });
  const removeLine = (i, j) => updateDay(i, {
    items: ev.schedule[i].items.filter((_, y) => y !== j),
  });

  // Ticket types ----------------------------------------------------------
  const updateTicket = (i, patch) => setF('ticketTypes',
    ev.ticketTypes.map((t, x) => x === i ? { ...t, ...patch } : t),
  );
  const addTicket    = () => setF('ticketTypes', [...ev.ticketTypes, emptyTicket()]);
  const removeTicket = (i) => setF('ticketTypes', ev.ticketTypes.filter((_, x) => x !== i));

  // Accommodation ---------------------------------------------------------
  const accommodationEnabled = ev.accommodation.length > 0;
  const acc = accommodationEnabled ? ev.accommodation[0] : null;
  const addAccommodation    = () => setF('accommodation', [emptyAccommodation()]);
  const removeAccommodation = () => setF('accommodation', []);
  const updateAcc = (patch) => setF('accommodation',
    [{ ...(ev.accommodation[0] || emptyAccommodation()), ...patch }],
  );

  async function save() {
    if (!ev.title.trim())  { setErr('Title is required.'); return; }
    if (!ev.startsAt)      { setErr('Pick a start date and time.'); return; }
    setSaving(true); setErr('');
    try {
      const scheduleOut = ev.schedule
        .map((d) => ({
          day: (d.day || '').trim(),
          items: (d.items || []).map((s) => s.trim()).filter(Boolean),
        }))
        .filter((d) => d.day || d.items.length);

      const payload = {
        ...ev,
        id: ev.id || slugify(ev.title) || `event-${Date.now()}`,
        startsAt:             fromLocalDT(ev.startsAt) || ev.startsAt,
        endsAt:               fromLocalDT(ev.endsAt)   || ev.endsAt,
        registrationDeadline: fromLocalDT(ev.registrationDeadline) || ev.registrationDeadline,
        schedule:      scheduleOut,
        ticketTypes:   ev.ticketTypes.filter((t) => t.name?.trim()),
        accommodation: ev.accommodation.filter((a) => a.name?.trim()),
        requiresLogin: ev.requiresLogin,
        creatorEmail:  user?.email || null,
        _isNew: true,
      };
      const saved = await api.saveUserEvent(payload);
      setCreated(saved);
    } catch (e) {
      setErr(e?.message || 'Could not create the event.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save event'}
        </button>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight">New event</h1>

      {err && <div className="card p-4 text-sm text-muted-coral bg-muted-coral/10">{err}</div>}

      {/* DETAILS ----------------------------------------------------------- */}
      <Section title="Details" hint="Title, summary, location, and dates.">
        <div>
          <label className="label">Title</label>
          <input className="input" value={ev.title} onChange={set('title')} placeholder="Spring Renewal Retreat 2026" />
          {ev.title && (
            <p className="text-[11px] text-on-surface-variant mt-1.5">
              Share link will be <span className="font-mono">/r/{idPreview || '…'}</span>
            </p>
          )}
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

      {/* BANNER ------------------------------------------------------------ */}
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

      {/* SEATING ----------------------------------------------------------- */}
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

      {/* SCHEDULE ---------------------------------------------------------- */}
      <Section title="Schedule" hint="Daily breakdown shown on the event page.">
        <div className="space-y-4">
          {ev.schedule.map((d, i) => (
            <div key={i} className="ring-1 ring-zinc-200 rounded-xl p-4 space-y-2 bg-white/40">
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="Day name (e.g. Friday)"
                  value={d.day}
                  onChange={(e) => updateDay(i, { day: e.target.value })}
                />
                {ev.schedule.length > 1 && (
                  <IconBtn onClick={() => removeDay(i)} label="Remove day">
                    <X className="h-4 w-4" />
                  </IconBtn>
                )}
              </div>
              {(d.items || []).map((line, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    placeholder="9:00 AM — Morning session"
                    value={line}
                    onChange={(e) => updateLine(i, j, e.target.value)}
                  />
                  <IconBtn onClick={() => removeLine(i, j)} label="Remove line">
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
              ))}
              <button type="button" onClick={() => addLine(i)} className="btn-soft text-xs">
                <Plus className="h-3.5 w-3.5" /> Add line
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addDay} className="btn-soft">
          <Plus className="h-4 w-4" /> Add day
        </button>
      </Section>

      {/* TICKET TYPES ------------------------------------------------------ */}
      <Section title="Ticket types" hint="What attendees can buy. Capacity gates registration.">
        <div className="space-y-3">
          {ev.ticketTypes.map((t, i) => (
            <div key={t.id} className="ring-1 ring-zinc-200 rounded-xl p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px_auto] items-end">
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input"
                    value={t.name}
                    onChange={(e) => updateTicket(i, { name: e.target.value })}
                    placeholder="Regular"
                  />
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
                <IconBtn onClick={() => removeTicket(i)} label="Remove ticket type">
                  <X className="h-4 w-4" />
                </IconBtn>
              </div>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] items-end">
                <div>
                  <label className="label">Badge role</label>
                  <div className="flex gap-1.5 p-1 rounded-full ring-1 ring-zinc-200 bg-zinc-50 w-fit">
                    {TICKET_ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => updateTicket(i, { role: r.id })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                          t.role === r.id
                            ? 'bg-white ring-1 ring-brand-600 text-brand-700 shadow-sm'
                            : 'text-zinc-500 hover:text-ink'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
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
            </div>
          ))}
        </div>
        <button type="button" onClick={addTicket} className="btn-soft">
          <Plus className="h-4 w-4" /> Add ticket type
        </button>
      </Section>

      {/* ACCOMMODATION ----------------------------------------------------- */}
      <Section title="Accommodation (optional)" hint="Rooms or lodging attendees can choose during registration. Capacity and occupancy track per option.">
        {!accommodationEnabled && (
          <>
            <p className="text-sm text-on-surface-variant">
              No accommodation options. Add one if attendees need lodging.
            </p>
            <button type="button" onClick={addAccommodation} className="btn-soft">
              <Plus className="h-4 w-4" /> Add accommodation option
            </button>
          </>
        )}

        {acc && (() => {
          const cap = acc.capacity || 0;
          const taken = acc.taken || 0;
          const left = Math.max(0, cap - taken);
          const pct = cap > 0 ? Math.min(100, Math.round((taken / cap) * 100)) : 0;
          const barColor = pct >= 100 ? 'bg-muted-coral' : pct >= 80 ? 'bg-calm-amber' : 'bg-primary-500';
          return (
            <div className="ring-1 ring-zinc-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-end">
                <IconBtn onClick={removeAccommodation} label="Remove accommodation">
                  <X className="h-4 w-4" />
                </IconBtn>
              </div>
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
    </div>
  );
}
