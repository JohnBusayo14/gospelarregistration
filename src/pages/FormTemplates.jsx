import { Link } from 'react-router-dom';
import {
  Heart, Baby, GraduationCap, Users, Smile, Tent, Megaphone, Music, Coffee,
  ChevronRight, ListChecks, Sparkles,
} from 'lucide-react';
import { EVENT_TEMPLATES } from '../templates.js';

// Map iconKey → lucide component. Mirrors the existing Templates page but
// kept local so this screen can stand alone without coupling to the other
// page's helpers.
const ICONS = {
  Heart, Baby, GraduationCap, Users, Smile, Tent, Megaphone, Music, Coffee,
};

const TYPE_LABEL = {
  text:     'Short text',
  email:    'Email',
  phone:    'Phone',
  textarea: 'Long text',
  choice:   'Single choice',
};

// Distinct from /templates (which centers the event preset — banner, schedule,
// ticket tiers). This page centers the REGISTRATION FORM: what each template
// asks every registrant, so an organizer can pick by "which form do I want
// them to fill?" rather than "which event setup do I want?". Same underlying
// EVENT_TEMPLATES list; different lens.
export default function FormTemplates() {
  const withForms = EVENT_TEMPLATES.filter((t) => Array.isArray(t.build().customQuestions) && t.build().customQuestions.length);

  return (
    <div className="space-y-8">
      <header className="space-y-2 max-w-2xl">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700">
          <span className="h-1 w-6 rounded-full" style={{ backgroundImage: 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)' }} />
          RSVP forms
        </span>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-on-surface">
          Pick the form your guests will fill out
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Every template ships with a short, mobile-first RSVP form tailored
          to that event type. Registrants get a clean question list instead
          of the long default attendee wizard — and can flip to the detailed
          form any time if they prefer.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        {withForms.map((t) => {
          const built = t.build();
          const Icon = ICONS[t.iconKey] || ListChecks;
          const questions = built.customQuestions || [];
          return (
            <article
              key={t.id}
              className="card overflow-hidden hover:shadow-ambient-lg transition-all duration-300 flex flex-col"
            >
              <div
                className={`h-2 bg-gradient-to-r ${t.accentClass || t.coverColor || 'from-primary-300 to-primary-700'}`}
              />
              <div className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col">
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-glow shrink-0 bg-gradient-to-br ${t.accentClass || t.coverColor || 'from-primary-400 to-primary-700'}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display font-bold text-lg tracking-tight text-on-surface">
                      {t.name}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      {t.tagline}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-surface-variant/40 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                      Questions ({questions.length})
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-700">
                      <Sparkles className="h-3 w-3" />
                      Short RSVP
                    </span>
                  </div>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {questions.map((q) => (
                      <li key={q.id} className="flex items-start gap-2 text-xs">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-400 shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="text-on-surface font-medium">{q.label}</span>
                          {q.required && <span className="text-red-500 ml-1">*</span>}
                          <span className="text-[10px] text-on-surface-variant ml-1.5">
                            · {TYPE_LABEL[q.type] || q.type}
                            {q.type === 'choice' && q.options ? ` (${q.options.length})` : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between gap-3 mt-auto pt-2">
                  <span className="text-[10px] text-on-surface-variant">
                    {questions.filter((q) => q.required).length} required
                  </span>
                  <Link
                    to={`/events/new?template=${t.id}`}
                    className="btn-primary inline-flex items-center gap-1.5 text-xs !py-2"
                  >
                    Use this form
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {withForms.length === 0 && (
        <div className="card p-12 text-center text-on-surface-variant">
          No form templates available yet.
        </div>
      )}
    </div>
  );
}
