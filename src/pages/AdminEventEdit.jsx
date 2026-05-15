import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Image as ImageIcon, Calendar, MapPin, Save, Trash2, Plus, X, IdCard,
} from 'lucide-react';
import { api } from '../api.js';
import { GRADIENT_PRESETS, ROOM_TYPES, TICKET_ROLES } from '../mockData.js';
import { slugify } from '../eventStore.js';
import { useChurch } from '../churchContext.jsx';

// New events start with the 5 default ticket types so admins can edit or
// delete what they don't need rather than build the list from scratch.
const DEFAULT_TICKET_TYPES = [
  { id: 'free',    name: 'Free',     role: 'attendee', priceCents:     0, capacity:  50, sold: 0, description: 'Complimentary admission.' },
  { id: 'regular', name: 'Regular',  role: 'attendee', priceCents: 10000, capacity: 200, sold: 0, description: 'Standard attendee ticket.' },
  { id: 'vip',     name: 'VIP',      role: 'attendee', priceCents: 25000, capacity:  30, sold: 0, description: 'Premium seating and reception access.' },
  { id: 'student', name: 'Student',  role: 'attendee', priceCents:  5000, capacity:  50, sold: 0, description: 'Valid student ID required at check-in.' },
  { id: 'worker',  name: 'Worker',   role: 'staff',    priceCents:     0, capacity:  40, sold: 0, description: 'For volunteers and ministry workers.' },
];

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
    schedule: [{ day: '', items: [''] }],
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

  // Adopt the selected church into a freshly opened "new event" form so we
  // don't strand the event in a different tenant on save.
  useEffect(() => {
    if (isNew && church?.id) setEv((p) => p && !p.churchId ? { ...p, churchId: church.id } : p);
  }, [church, isNew]);

  useEffect(() => {
    if (isNew) return;
    api.getEvent(id).then((data) => {
      setEv(data ? { ...data, _isNew: false } : null);
      setLoading(false);
    });
  }, [id, isNew]);

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

  async function save() {
    if (!ev.title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        ...ev,
        id: ev.id || slugify(ev.title) || `event-${Date.now()}`,
        startsAt:             fromLocalDT(ev.startsAt) || ev.startsAt,
        endsAt:               fromLocalDT(ev.endsAt)   || ev.endsAt,
        registrationDeadline: fromLocalDT(ev.registrationDeadline) || ev.registrationDeadline,
        schedule:    ev.schedule.filter((s) => s.day.trim()),
        ticketTypes: ev.ticketTypes.filter((t) => t.name.trim()),
        accommodation: ev.accommodation.filter((a) => a.name.trim()),
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

  // — Schedule helpers
  const addDay      = () => setF('schedule', [...ev.schedule, { day: '', items: [''] }]);
  const removeDay   = (i) => setF('schedule', ev.schedule.filter((_, x) => x !== i));
  const updateDay   = (i, patch) => setF('schedule', ev.schedule.map((s, x) => x === i ? { ...s, ...patch } : s));
  const addItem     = (i) => updateDay(i, { items: [...ev.schedule[i].items, ''] });
  const updateItem  = (i, j, val) => updateDay(i, {
    items: ev.schedule[i].items.map((it, y) => y === j ? val : it),
  });
  const removeItem  = (i, j) => updateDay(i, {
    items: ev.schedule[i].items.filter((_, y) => y !== j),
  });

  // — Ticket types helpers
  const addTicket    = () => setF('ticketTypes', [
    ...ev.ticketTypes,
    { id: `t${Date.now()}`, name: '', role: 'attendee', priceCents: 0, capacity: 0, sold: 0, description: '' },
  ]);
  const updateTicket = (i, patch) => setF('ticketTypes',
    ev.ticketTypes.map((t, x) => x === i ? { ...t, ...patch } : t),
  );
  const removeTicket = (i) => setF('ticketTypes', ev.ticketTypes.filter((_, x) => x !== i));

  // — Accommodation helpers
  const addAcc    = () => setF('accommodation', [
    ...ev.accommodation,
    { id: `a${Date.now()}`, name: '', type: 'lodge', sharing: 'shared', priceCents: 0, capacity: 0, taken: 0, description: '' },
  ]);
  const updateAcc = (i, patch) => setF('accommodation',
    ev.accommodation.map((a, x) => x === i ? { ...a, ...patch } : a),
  );
  const removeAcc = (i) => setF('accommodation', ev.accommodation.filter((_, x) => x !== i));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="flex flex-wrap gap-2">
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

      <Section title="Schedule" hint="Daily breakdown shown on the event page.">
        <div className="space-y-4">
          {ev.schedule.map((s, i) => (
            <div key={i} className="ring-1 ring-zinc-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  className="input"
                  placeholder="Day name (e.g. Friday)"
                  value={s.day}
                  onChange={(e) => updateDay(i, { day: e.target.value })}
                />
                <button type="button" onClick={() => removeDay(i)} className="btn-ghost !px-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {s.items.map((it, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input
                    className="input"
                    placeholder="9:00 AM — Morning session"
                    value={it}
                    onChange={(e) => updateItem(i, j, e.target.value)}
                  />
                  <button type="button" onClick={() => removeItem(i, j)} className="btn-ghost !px-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addItem(i)} className="btn-soft text-xs">
                <Plus className="h-3.5 w-3.5" /> Add line
              </button>
            </div>
          ))}
          <button type="button" onClick={addDay} className="btn-soft">
            <Plus className="h-4 w-4" /> Add day
          </button>
        </div>
      </Section>

      <Section title="Ticket types" hint="What attendees can buy. Capacity gates registration.">
        <div className="space-y-3">
          {ev.ticketTypes.map((t, i) => (
            <div key={t.id} className="ring-1 ring-zinc-200 rounded-lg p-4 space-y-3">
              <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={t.name} onChange={(e) => updateTicket(i, { name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Price (USD)</label>
                  <input
                    type="number" min="0" step="1"
                    className="input w-28"
                    value={t.priceCents / 100}
                    onChange={(e) => updateTicket(i, { priceCents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                  />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input
                    type="number" min="0"
                    className="input w-24"
                    value={t.capacity}
                    onChange={(e) => updateTicket(i, { capacity: parseInt(e.target.value || 0, 10) })}
                  />
                </div>
                <button type="button" onClick={() => removeTicket(i)} className="btn-ghost !px-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-[auto_1fr] gap-3 items-end">
                <div>
                  <label className="label">Badge role</label>
                  <div className="flex gap-1.5">
                    {TICKET_ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => updateTicket(i, { role: r.id })}
                        className={`px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition ring-1 ${
                          (t.role || 'attendee') === r.id
                            ? 'ring-brand-600 bg-brand-50 text-brand-700'
                            : 'ring-zinc-200 hover:ring-zinc-300 text-zinc-600'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input" value={t.description} onChange={(e) => updateTicket(i, { description: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addTicket} className="btn-soft">
            <Plus className="h-4 w-4" /> Add ticket type
          </button>
        </div>
      </Section>

      <Section title="Accommodation (optional)" hint="Rooms or lodging attendees can choose during registration. Capacity and occupancy track per option.">
        <div className="space-y-3">
          {ev.accommodation.length === 0 && (
            <p className="text-sm text-zinc-500">No accommodation options. Add one if attendees need lodging.</p>
          )}
          {ev.accommodation.map((a, i) => {
            const cap = a.capacity || 0;
            const taken = a.taken || 0;
            const left = Math.max(0, cap - taken);
            const pct = cap > 0 ? Math.min(100, Math.round((taken / cap) * 100)) : 0;
            const barColor = pct >= 100 ? 'bg-muted-coral' : pct >= 80 ? 'bg-calm-amber' : 'bg-primary-500';
            return (
              <div key={a.id} className="ring-1 ring-zinc-200 rounded-lg p-4 space-y-3">
                <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                  <div>
                    <label className="label">Name</label>
                    <input className="input" value={a.name} onChange={(e) => updateAcc(i, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Add-on price (USD)</label>
                    <input
                      type="number" min="0" step="1"
                      className="input w-28"
                      value={a.priceCents / 100}
                      onChange={(e) => updateAcc(i, { priceCents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                    />
                  </div>
                  <div>
                    <label className="label">Capacity</label>
                    <input
                      type="number" min="0"
                      className="input w-24"
                      value={a.capacity}
                      onChange={(e) => updateAcc(i, { capacity: parseInt(e.target.value || 0, 10) })}
                    />
                  </div>
                  <button type="button" onClick={() => removeAcc(i)} className="btn-ghost !px-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Room type</label>
                    <select
                      className="input"
                      value={a.type || 'lodge'}
                      onChange={(e) => updateAcc(i, { type: e.target.value })}
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
                          onClick={() => updateAcc(i, { sharing: s })}
                          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold ring-1 transition ${
                            (a.sharing || 'shared') === s
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

                <div>
                  <label className="label">Description</label>
                  <input className="input" value={a.description} onChange={(e) => updateAcc(i, { description: e.target.value })} />
                </div>

                {/* Occupancy bar */}
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
          })}
          <button type="button" onClick={addAcc} className="btn-soft">
            <Plus className="h-4 w-4" /> Add accommodation option
          </button>
        </div>
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
