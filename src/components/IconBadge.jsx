// Shared icon wrapper. Renders a lucide-react icon (outline by default) on
// a tinted, rounded background — the "icon with a colorful pill behind it"
// pattern used across every screen for visual punch.
//
// Usage:
//   <IconBadge icon={Mail} tone="primary" size="md" />
//   <IconBadge icon={CheckCircle2} tone="success" size="sm" />
//   <IconBadge icon={Bell} tone="warning" />
//
// Defaults: tone="primary", size="md", bold stroke. Pass any standard
// lucide prop via `iconProps` if you need to override (e.g. fill).
//
// Sizes (Tailwind classes):
//   xs — 24px / icon 12px       (inline, next to short labels)
//   sm — 32px / icon 14px       (table cells, list rows)
//   md — 40px / icon 18px       (page-section headers — default)
//   lg — 48px / icon 22px       (hero stats, empty states)
//
// Tones (background + foreground pair, all in the Tailwind palette):
//   primary  — sky blue
//   accent   — violet (the brand-secondary)
//   success  — emerald
//   warning  — amber
//   danger   — rose
//   info     — cyan
//   neutral  — zinc

const SIZE_CLASSES = {
  xs: { box: 'h-6 w-6 rounded-md',     icon: 'h-3 w-3' },
  sm: { box: 'h-8 w-8 rounded-lg',     icon: 'h-3.5 w-3.5' },
  md: { box: 'h-10 w-10 rounded-xl',   icon: 'h-[18px] w-[18px]' },
  lg: { box: 'h-12 w-12 rounded-2xl',  icon: 'h-[22px] w-[22px]' },
};

const TONE_CLASSES = {
  primary: 'bg-sky-100 text-sky-700 ring-sky-200/60',
  accent:  'bg-violet-100 text-violet-700 ring-violet-200/60',
  success: 'bg-emerald-100 text-emerald-700 ring-emerald-200/60',
  warning: 'bg-amber-100 text-amber-700 ring-amber-200/60',
  danger:  'bg-rose-100 text-rose-700 ring-rose-200/60',
  info:    'bg-cyan-100 text-cyan-700 ring-cyan-200/60',
  neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200/60',
};

export default function IconBadge({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  className = '',
  ringed = false,
  iconProps = {},
  ...rest
}) {
  if (!Icon) return null;
  const s = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const t = TONE_CLASSES[tone] || TONE_CLASSES.primary;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center shrink-0 ${s.box} ${t} ${ringed ? 'ring-1' : ''} ${className}`}
      {...rest}
    >
      <Icon
        className={s.icon}
        // strokeWidth 2.25 is the sweet spot for "bold but still outline" —
        // 2 is the lucide default; >2.5 starts looking chunky.
        strokeWidth={iconProps.strokeWidth ?? 2.25}
        {...iconProps}
      />
    </span>
  );
}
