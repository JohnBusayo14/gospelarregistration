import { useEffect, useState } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, AlertCircle, GripVertical,
} from 'lucide-react';

const TYPES = [
  { id: 'text',     label: 'Short text',   needsOptions: false },
  { id: 'textarea', label: 'Long text',    needsOptions: false },
  { id: 'email',    label: 'Email',        needsOptions: false },
  { id: 'phone',    label: 'Phone',        needsOptions: false },
  { id: 'choice',   label: 'Single choice',needsOptions: true  },
];

// Slug helper — turns the question label into a stable id when the user
// hasn't picked one. Inline so the designer stays self-contained.
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

// Normalise a question for export. Strips trailing whitespace, drops empty
// options, fills in a slug-id when missing. Called every time questions
// change so the parent always receives clean data.
function normalize(q) {
  return {
    id:          q.id || slugifyId(q.label),
    type:        q.type || 'text',
    label:       String(q.label || '').trim(),
    required:    !!q.required,
    options:     q.type === 'choice'
      ? (q.options || []).map((o) => String(o).trim()).filter(Boolean)
      : null,
    placeholder: String(q.placeholder || '').trim(),
  };
}

// Lift-up form-builder for customQuestions. The parent owns the persisted
// list and passes a single onChange — the designer manages its own
// editing state, validates, and bubbles a normalized list back on every
// change. No internal save: the parent is responsible for persisting
// whenever it wants (typically when the event itself is saved).
export default function QuestionDesigner({ questions: incoming, onChange }) {
  // Local working copy. We keep the raw-edited shape (e.g. options as a
  // text-area-friendly array) and only normalise on bubble-up.
  const [questions, setQuestions] = useState(() => (incoming || []).map((q) => ({
    id:          q.id || '',
    type:        q.type || 'text',
    label:       q.label || '',
    required:    !!q.required,
    options:     Array.isArray(q.options) ? q.options : null,
    placeholder: q.placeholder || '',
  })));

  // Sync down when the parent swaps to a different event (different
  // questions identity). String compare is fine — questions are small.
  useEffect(() => {
    const incomingJson = JSON.stringify(incoming || []);
    const localJson    = JSON.stringify(questions.map(normalize));
    if (incomingJson !== localJson) {
      setQuestions((incoming || []).map((q) => ({
        id:          q.id || '',
        type:        q.type || 'text',
        label:       q.label || '',
        required:    !!q.required,
        options:     Array.isArray(q.options) ? q.options : null,
        placeholder: q.placeholder || '',
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  // Bubble up the normalised shape whenever local state changes.
  useEffect(() => {
    onChange?.(questions.map(normalize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

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

  // Type change side-effect: switching INTO choice seeds an options list;
  // switching OUT clears it so the JSON payload stays compact.
  const setType = (i, type) => setAt(i, {
    type,
    options: type === 'choice'
      ? (Array.isArray(questions[i].options) && questions[i].options.length
          ? questions[i].options
          : ['Option 1'])
      : null,
  });

  // Lightweight validation surfaces an inline warning per problem question.
  // Parent saves are not blocked here — that's the parent's call.
  const warnings = [];
  questions.forEach((q, i) => {
    if (!String(q.label || '').trim()) {
      warnings.push(`Question ${i + 1} needs a label.`);
    }
    if (q.type === 'choice') {
      const opts = (q.options || []).map((o) => String(o).trim()).filter(Boolean);
      if (opts.length < 2) {
        warnings.push(`Question ${i + 1} ("${q.label || 'untitled'}") needs at least two options.`);
      }
    }
  });
  const seen = new Set();
  questions.forEach((q) => {
    const id = q.id || slugifyId(q.label);
    if (seen.has(id)) warnings.push(`Two questions share the id "${id}".`);
    seen.add(id);
  });

  return (
    <div className="space-y-4">
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

        {warnings.length > 0 && (
          <div className="text-xs text-amber-700 space-y-0.5 max-w-md">
            {warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="inline-flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {w}
              </div>
            ))}
            {warnings.length > 3 && (
              <div className="text-on-surface-variant">+ {warnings.length - 3} more</div>
            )}
          </div>
        )}
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
                  options: e.target.value.split('\n').slice(0, 50),
                })}
                placeholder={'Yes\nNo\nMaybe'}
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                Empty lines are dropped on save. At least two non-empty options required.
              </p>
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
