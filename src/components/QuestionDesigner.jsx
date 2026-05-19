import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, CheckCircle2, AlertCircle,
  GripVertical,
} from 'lucide-react';
import { api } from '../api.js';

const TYPES = [
  { id: 'text',     label: 'Short text',   needsOptions: false },
  { id: 'textarea', label: 'Long text',    needsOptions: false },
  { id: 'email',    label: 'Email',        needsOptions: false },
  { id: 'phone',    label: 'Phone',        needsOptions: false },
  { id: 'choice',   label: 'Single choice',needsOptions: true  },
];

// Slug helper — turns the question label into a stable id when the user
// hasn't picked one. Inline (rather than importing lib/slug) so the
// designer stays self-contained.
function slugifyId(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    || `q_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyQuestion() {
  return {
    id:        '',
    type:      'text',
    label:     '',
    required:  false,
    options:   null,
    placeholder: '',
  };
}

// Compare two arrays of question objects for the "unsaved changes" badge.
// JSON.stringify is fine here — questions are small and shape is flat.
function questionsEqual(a, b) {
  const norm = (qs) => JSON.stringify((qs || []).map((q) => ({
    id: q.id || '',
    type: q.type || 'text',
    label: q.label || '',
    required: !!q.required,
    options: Array.isArray(q.options) ? q.options : null,
    placeholder: q.placeholder || '',
  })));
  return norm(a) === norm(b);
}

// Inline form-builder for the event's customQuestions list. Lives on
// /events/:id/register as the "Customize" tab. Save round-trips through
// api.saveUserEvent, which PUTs the full event payload — the backend
// rejects edits from non-creators (super-admin override applies).
export default function QuestionDesigner({ event, onSaved }) {
  const [questions, setQuestions] = useState(() =>
    (event.customQuestions || []).map((q) => ({
      id:          q.id || '',
      type:        q.type || 'text',
      label:       q.label || '',
      required:    !!q.required,
      options:     Array.isArray(q.options) ? q.options : null,
      placeholder: q.placeholder || '',
    })),
  );
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState('');

  // Reset local state when the event changes from upstream (e.g. an outside
  // refresh). Keeps the designer in sync without forcing a remount.
  useEffect(() => {
    setQuestions((event.customQuestions || []).map((q) => ({
      id:          q.id || '',
      type:        q.type || 'text',
      label:       q.label || '',
      required:    !!q.required,
      options:     Array.isArray(q.options) ? q.options : null,
      placeholder: q.placeholder || '',
    })));
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(
    () => !questionsEqual(questions, event.customQuestions),
    [questions, event.customQuestions],
  );

  const setAt = (i, patch) => setQuestions((p) =>
    p.map((q, x) => x === i ? { ...q, ...patch } : q),
  );

  const move = (i, dir) => setQuestions((p) => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const next = p.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const remove = (i) => setQuestions((p) => p.filter((_, x) => x !== i));
  const add    = ()  => setQuestions((p) => [...p, emptyQuestion()]);

  // Type change side-effect: a choice question needs at least one option;
  // switching away from choice clears the option list so the JSON payload
  // stays compact.
  const setType = (i, type) => setAt(i, {
    type,
    options: type === 'choice'
      ? (Array.isArray(questions[i].options) && questions[i].options.length
          ? questions[i].options
          : ['Option 1'])
      : null,
  });

  function validate() {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!String(q.label || '').trim()) {
        setError(`Question ${i + 1} needs a label.`);
        return false;
      }
      if (q.type === 'choice') {
        const opts = (q.options || []).map((o) => String(o).trim()).filter(Boolean);
        if (opts.length < 2) {
          setError(`Question ${i + 1} ("${q.label}") needs at least two options.`);
          return false;
        }
      }
    }
    // ID uniqueness — generate them on save from the label if missing.
    const seen = new Set();
    for (const q of questions) {
      const id = q.id || slugifyId(q.label);
      if (seen.has(id)) {
        setError(`Two questions share the id "${id}". Edit one of them.`);
        return false;
      }
      seen.add(id);
    }
    setError('');
    return true;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const normalized = questions.map((q) => ({
        id:          q.id || slugifyId(q.label),
        type:        q.type || 'text',
        label:       String(q.label || '').trim(),
        required:    !!q.required,
        options:     q.type === 'choice'
          ? (q.options || []).map((o) => String(o).trim()).filter(Boolean)
          : null,
        placeholder: String(q.placeholder || '').trim(),
      }));
      const updated = { ...event, customQuestions: normalized };
      const result  = await api.saveUserEvent(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.(result || updated);
    } catch (e) {
      setError(e?.message || 'Could not save changes. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
          Customize the form your guests will fill out
        </h2>
        <p className="text-sm text-on-surface-variant">
          Add, edit, or reorder the questions. Changes apply to every new
          registration the moment you save.
        </p>
      </header>

      <div className="space-y-3">
        {questions.length === 0 && (
          <div className="card p-8 text-center text-on-surface-variant">
            No questions yet. Add the first one below.
          </div>
        )}

        {questions.map((q, i) => (
          <QuestionCard
            key={i}
            index={i}
            total={questions.length}
            q={q}
            onChange={(patch) => setAt(i, patch)}
            onTypeChange={(t) => setType(i, t)}
            onMove={(d) => move(i, d)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={add}
          className="btn-soft inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add question
        </button>

        <div className="flex items-center gap-3">
          {error && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </span>
          )}
          {!error && dirty && !saved && (
            <span className="text-xs text-on-surface-variant">Unsaved changes</span>
          )}
          {saved && !dirty && (
            <span className="inline-flex items-center gap-1.5 text-xs text-tertiary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ index, total, q, onChange, onTypeChange, onMove, onRemove }) {
  const typeMeta = TYPES.find((t) => t.id === q.type) || TYPES[0];
  return (
    <div className="card p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-1.5 text-on-surface-variant">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="h-6 w-6 rounded hover:bg-surface-variant/60 disabled:opacity-30 inline-flex items-center justify-center"
            title="Move up"
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <GripVertical className="h-3.5 w-3.5 opacity-50" />
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="h-6 w-6 rounded hover:bg-surface-variant/60 disabled:opacity-30 inline-flex items-center justify-center"
            title="Move down"
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="grid sm:grid-cols-[1fr_180px] gap-3">
            <div>
              <label className="label">Question label</label>
              <input
                className="input"
                value={q.label}
                onChange={(e) => onChange({ label: e.target.value })}
                placeholder="e.g. What's your name?"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={q.type}
                onChange={(e) => onTypeChange(e.target.value)}
              >
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="label">Placeholder (optional)</label>
              <input
                className="input"
                value={q.placeholder || ''}
                onChange={(e) => onChange({ placeholder: e.target.value })}
                placeholder="Shown inside the empty field"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface cursor-pointer select-none pb-2">
              <input
                type="checkbox"
                checked={!!q.required}
                onChange={(e) => onChange({ required: e.target.checked })}
                className="h-4 w-4 accent-primary-700"
              />
              Required
            </label>
          </div>

          {typeMeta.needsOptions && (
            <div>
              <label className="label">Options — one per line</label>
              <textarea
                className="input min-h-[90px] resize-y font-mono text-xs"
                value={(q.options || []).join('\n')}
                onChange={(e) => onChange({
                  options: e.target.value.split('\n').map((s) => s).slice(0, 50),
                })}
                placeholder={'Yes\nNo\nMaybe'}
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                Empty lines are dropped on save. At least two non-empty options required.
              </p>
            </div>
          )}

          {q.id && (
            <div className="text-[10px] font-mono text-on-surface-variant">
              id: <span className="font-semibold">{q.id}</span>
              <span className="text-on-surface-variant/70">
                {' '}— auto-derived from the label on save if you leave it blank.
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="btn-ghost !px-2 text-red-500 hover:bg-red-50"
          title="Delete this question"
          aria-label="Delete question"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
