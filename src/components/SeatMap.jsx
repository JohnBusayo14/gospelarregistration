// Interactive seat picker.
//
// Renders the auditorium grid for an event and lets the user pick exactly
// `quantity` seats. Taken seats (from existing tickets) are disabled. Auto-
// suggestion comes from assignSeats(); the user can override per-seat or
// reset to the suggestion.

import { useMemo } from 'react';
import { Sparkles, Armchair } from 'lucide-react';

const ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // skip I/O — same alphabet as assignment.js

function rowLabel(rowIndex) {
  const n = ROW_LETTERS.length;
  if (rowIndex < n) return ROW_LETTERS[rowIndex];
  const first  = ROW_LETTERS[Math.floor(rowIndex / n) - 1];
  const second = ROW_LETTERS[rowIndex % n];
  return `${first}${second}`;
}

export default function SeatMap({
  rows, seatsPerRow,
  takenSeats = [],   // string[] — seat labels already issued
  selected   = [],   // string[] — current picks, may include '' placeholders
  quantity,
  onToggle,          // (label: string) => void
  onAutoPick,        // () => void
}) {
  const takenSet = useMemo(() => new Set(takenSeats), [takenSeats]);
  const pickedSet = useMemo(() => new Set(selected.filter(Boolean)), [selected]);
  const remaining = quantity - pickedSet.size;

  return (
    <div className="space-y-4">
      {/* Legend + status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
          <LegendDot className="bg-white ring-1 ring-zinc-300" label="Available" />
          <LegendDot className="bg-brand-600" label="Your pick" />
          <LegendDot className="bg-zinc-300" label="Taken" />
        </div>
        <button
          type="button"
          onClick={onAutoPick}
          className="btn-soft inline-flex items-center gap-1.5 text-xs"
          title="Fill remaining seats with the best contiguous block"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto-pick
        </button>
      </div>

      {/* Stage marker */}
      <div className="mx-auto max-w-md rounded-full bg-zinc-100 text-center py-1.5 text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500">
        Stage / Front
      </div>

      {/* Seat grid — horizontally scrollable on narrow screens so a 20-wide
          row doesn't blow out the card. */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="space-y-1.5">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex items-center gap-1.5 justify-center">
                <div className="w-6 text-right text-[11px] font-bold text-zinc-400 tabular">
                  {rowLabel(r)}
                </div>
                {Array.from({ length: seatsPerRow }).map((__, c) => {
                  const label  = `${rowLabel(r)}${c + 1}`;
                  const taken  = takenSet.has(label);
                  const picked = pickedSet.has(label);
                  const full   = !picked && remaining <= 0;
                  const disabled = taken || full;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => !disabled && onToggle(label)}
                      disabled={disabled}
                      title={taken ? `${label} — taken` : full ? `${label} — deselect another seat first` : label}
                      className={[
                        'h-7 w-7 shrink-0 rounded-md text-[10px] font-bold transition flex items-center justify-center',
                        picked
                          ? 'bg-brand-600 text-white ring-1 ring-brand-700 shadow-sm'
                          : taken
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : full
                              ? 'bg-white text-zinc-300 ring-1 ring-zinc-200 cursor-not-allowed'
                              : 'bg-white text-zinc-600 ring-1 ring-zinc-300 hover:ring-brand-400 hover:bg-brand-50',
                      ].join(' ')}
                    >
                      {picked ? (c + 1) : (
                        <Armchair className={`h-3.5 w-3.5 ${taken ? 'opacity-50' : ''}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selection summary */}
      <div className="rounded-lg ring-1 ring-outline-variant/20 p-3 bg-zinc-50/40 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-600">
            Selected{' '}
            <span className="font-bold text-ink tabular">{pickedSet.size}</span>
            <span className="text-zinc-400"> / {quantity}</span>
          </span>
          {remaining > 0 && (
            <span className="text-xs text-zinc-500">
              Tap {remaining} more seat{remaining === 1 ? '' : 's'} or use Auto-pick.
            </span>
          )}
          {remaining === 0 && (
            <span className="text-xs font-semibold text-tertiary">Ready to continue.</span>
          )}
        </div>
        {pickedSet.size > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.filter(Boolean).map((s, i) => (
              <span key={`${s}-${i}`} className="chip chip-selected font-mono tabular">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LegendDot({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${className}`} />
      <span>{label}</span>
    </span>
  );
}
