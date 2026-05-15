import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';

const EDITABLE_FIELDS = [
  ['attendeeName',   'Full name',          'text',  true ],
  ['attendeeEmail',  'Email',              'email', true ],
  ['attendeePhone',  'Phone',              'tel',   false],
  ['ageGroup',       'Age group',          'select',false],
  ['dietary',        'Dietary needs',      'text',  false],
  ['emergencyName',  'Emergency contact',  'text',  false],
  ['emergencyPhone', 'Emergency phone',    'tel',   false],
];

export default function TicketEdit() {
  const { code } = useParams();
  const nav = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTicket(code).then((t) => {
      setTicket(t);
      if (t) {
        setForm({
          attendeeName:   t.attendeeName   || '',
          attendeeEmail:  t.attendeeEmail  || '',
          attendeePhone:  t.attendeePhone  || '',
          ageGroup:       t.ageGroup       || 'adult',
          dietary:        t.dietary        || '',
          emergencyName:  t.emergencyName  || '',
          emergencyPhone: t.emergencyPhone || '',
        });
      }
    });
  }, [code]);

  if (!ticket) return <div className="text-zinc-500">Loading…</div>;
  if (!form)   return null;

  if (ticket.status === 'checked-in') {
    return (
      <div className="max-w-lg mx-auto card p-8 text-center space-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight">This ticket is already checked in</h1>
        <p className="text-zinc-500">Edits are locked once an attendee has been admitted at the door.</p>
        <Link to={`/tickets/${code}`} className="btn-primary">Back to ticket</Link>
      </div>
    );
  }

  async function save() {
    setError('');
    if (!form.attendeeName.trim()) { setError('Name is required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.attendeeEmail)) { setError('Valid email required.'); return; }
    setSaving(true);
    try {
      await api.updateTicket(code, form);
      setSavedAt(Date.now());
      setTimeout(() => nav(`/tickets/${code}`), 900);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link to={`/tickets/${code}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to ticket
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Update registration</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {ticket.eventTitle} · <span className="font-mono">{ticket.code}</span>
        </p>
      </div>

      <div className="card p-6 space-y-4">
        {EDITABLE_FIELDS.map(([key, label, type, required]) => (
          <div key={key}>
            <label className="label">
              {label} {required && <span className="text-muted-coral">*</span>}
            </label>
            {type === 'select' ? (
              <select
                className="input"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              >
                <option value="child">Child (under 13)</option>
                <option value="teen">Teen (13–17)</option>
                <option value="adult">Adult (18+)</option>
              </select>
            ) : (
              <input
                type={type}
                className="input"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            )}
          </div>
        ))}

        {error && <div className="text-sm text-muted-coral">{error}</div>}

        <div className="flex items-center justify-between pt-2">
          {savedAt ? (
            <span className="text-sm text-tertiary inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          ) : <span />}
          <div className="flex gap-2">
            <Link to={`/tickets/${code}`} className="btn-soft">Cancel</Link>
            <button onClick={save} disabled={saving} className="btn-primary">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Ticket type, accommodation, and event date can’t be edited here — contact the organizer for changes to those.
      </p>
    </div>
  );
}
