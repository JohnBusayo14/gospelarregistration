import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2, Save, X, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { GRADIENT_PRESETS } from '../mockData.js';
import { slugify } from '../lib/slug.js';
import { useChurch } from '../churchContext.jsx';

function emptyChurch() {
  return {
    id: '',
    name: '',
    slug: '',
    contactEmail: '',
    location: '',
    tagline: '',
    logoColor: GRADIENT_PRESETS[0].classes,
    _isNew: true,
  };
}

export default function AdminChurches() {
  const { church: current, setCurrent, reload } = useChurch();
  const [churches, setChurches] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  async function refresh() {
    setChurches(await api.listChurches());
  }
  useEffect(() => { refresh(); }, []);

  async function save() {
    setErr('');
    if (!editing.name.trim()) { setErr('Name is required.'); return; }
    const payload = {
      ...editing,
      id: editing.id || slugify(editing.name) || `church-${Date.now()}`,
      slug: editing.slug || slugify(editing.name),
    };
    await api.saveChurch(payload);
    setEditing(null);
    await refresh();
    await reload();
  }

  async function remove(id) {
    if (!confirm('Delete this church? Existing events keep their churchId but become orphaned.')) return;
    await api.deleteChurch(id);
    await refresh();
    await reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Churches</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Each church is a separate tenant. Events, attendees, and check-ins are scoped to one.
          </p>
        </div>
        <button onClick={() => setEditing(emptyChurch())} className="btn-primary">
          <Plus className="h-4 w-4" /> New church
        </button>
      </div>

      {editing && (
        <ChurchEditor
          value={editing}
          onCancel={() => { setEditing(null); setErr(''); }}
          onChange={setEditing}
          onSave={save}
          error={err}
        />
      )}

      {churches.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">No churches yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {churches.map((c) => {
            const isCurrent = c.id === current?.id;
            return (
              <article key={c.id} className="card overflow-hidden">
                <div className={`h-20 bg-gradient-to-br ${c.logoColor} text-white flex items-end px-5 pb-3`}>
                  <Building2 className="h-5 w-5 mr-2" strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{c.slug}</span>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <div className="font-bold tracking-tight">{c.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{c.location || '—'}</div>
                  </div>
                  {c.tagline && <p className="text-sm text-zinc-600 line-clamp-2">{c.tagline}</p>}
                  <div className="text-xs text-zinc-500 font-mono truncate">{c.contactEmail}</div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-tertiary">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <button onClick={() => setCurrent(c.id)} className="btn-soft !text-xs">
                        Switch to
                      </button>
                    )}
                    <button onClick={() => setEditing({ ...c, _isNew: false })} className="btn-ghost !px-2" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(c.id)} className="btn-ghost !px-2 text-muted-coral hover:bg-muted-coral/10" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChurchEditor({ value, onChange, onSave, onCancel, error }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold tracking-tight">{value._isNew ? 'New church' : `Edit ${value.name || 'church'}`}</h2>
        <button onClick={onCancel} className="btn-ghost !px-2"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Church name</label>
          <input className="input" value={value.name} onChange={set('name')} placeholder="Grace Collective" />
        </div>
        <div>
          <label className="label">URL slug</label>
          <input className="input font-mono" value={value.slug} onChange={set('slug')} placeholder="grace" />
        </div>
        <div>
          <label className="label">Contact email</label>
          <input className="input" type="email" value={value.contactEmail} onChange={set('contactEmail')} placeholder="hello@church.org" />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" value={value.location} onChange={set('location')} placeholder="Denver, CO" />
        </div>
      </div>

      <div>
        <label className="label">Tagline</label>
        <input className="input" value={value.tagline} onChange={set('tagline')} placeholder="A non-denominational church for the city." />
      </div>

      <div>
        <label className="label">Brand color</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange({ ...value, logoColor: g.classes })}
              className={`h-12 rounded-lg bg-gradient-to-br ${g.classes} ring-2 transition ${
                value.logoColor === g.classes ? 'ring-brand-600' : 'ring-transparent hover:ring-zinc-300'
              }`}
              title={g.label}
            />
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-muted-coral">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-soft">Cancel</button>
        <button onClick={onSave} className="btn-primary">
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}
