import { Link } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Heart, Baby, GraduationCap, Users, Smile,
  Tent, Megaphone, Music, Coffee, FileText,
} from 'lucide-react';
import { EVENT_TEMPLATES } from '../templates.js';

// lucide-react has no runtime icon lookup; templates ship an iconKey string
// and we resolve it here. Keeping the registry colocated with the renderer
// avoids a separate icon-registry module for nine entries.
const ICONS = {
  Heart, Baby, GraduationCap, Users, Smile, Tent, Megaphone, Music, Coffee,
};

function TemplateCard({ template }) {
  const Icon = ICONS[template.iconKey] || FileText;
  return (
    <Link
      to={`/events/new?template=${template.id}`}
      className="group relative block rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
    >
      {/* Accent header — a slice of the gradient the resulting event will use,
          so picking a template gives the user a preview of its visual tone. */}
      <div className={`h-24 bg-gradient-to-br ${template.accentClass} relative`}>
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_60%)]" />
        <div className="absolute left-5 -bottom-6 h-12 w-12 rounded-2xl bg-white shadow-ambient ring-1 ring-black/5 flex items-center justify-center">
          <Icon className="h-5 w-5 text-zinc-800" strokeWidth={1.75} />
        </div>
      </div>

      <div className="bg-white px-5 pt-9 pb-5 space-y-3">
        <h3 className="font-display text-base font-bold tracking-tight text-zinc-900">
          {template.name}
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
          {template.tagline}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            Template
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-700 group-hover:text-zinc-900 transition-colors">
            Use this
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Templates() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-[0.18em]">
          <Sparkles className="h-3 w-3" strokeWidth={2} />
          New
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
          Start from a template
        </h1>
        <p className="text-sm text-zinc-500 max-w-2xl leading-relaxed">
          Pick the closest match to your event. We'll pre-fill the title, schedule,
          ticket tiers, and accommodation — you just edit the bits that are yours and hit save.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {EVENT_TEMPLATES.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}

        {/* Escape hatch — for users whose event doesn't match a template. */}
        <Link
          to="/events/new"
          className="group relative block rounded-2xl overflow-hidden ring-1 ring-dashed ring-zinc-300 bg-white/60 transition-all duration-300 hover:bg-white hover:ring-zinc-400"
        >
          <div className="h-full min-h-[240px] p-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 group-hover:bg-zinc-900 group-hover:text-white text-zinc-700 flex items-center justify-center transition-colors">
              <FileText className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-base font-bold tracking-tight text-zinc-900">
              Start from scratch
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-full sm:max-w-[200px]">
              Open a blank event form and build it the way you want.
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-700">
              Blank event
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
