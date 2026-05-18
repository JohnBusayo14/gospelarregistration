import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Calendar, Ticket, ScanLine, Award, Mail, LayoutDashboard,
  Share2, ShieldCheck, Users, MapPin, Sparkles, Check,
} from 'lucide-react';
import { useAuth } from '../authContext.jsx';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

// Sky gradient — feels like an open sky behind the hero, transitioning into
// the brand navy at the bottom so the section meets the page surface cleanly.
const SKY_GRADIENT =
  'linear-gradient(180deg, #c5e0ff 0%, #6aa9ff 30%, #1656c2 65%, #0b3a8a 100%)';

const TABS = [
  { id: 'register', label: 'Register', icon: Calendar },
  { id: 'tickets',  label: 'Tickets',  icon: Ticket },
  { id: 'checkin',  label: 'Check-In', icon: ScanLine },
  { id: 'badges',   label: 'Badges',   icon: Award },
  { id: 'email',    label: 'Email',    icon: Mail },
  { id: 'seatmap',  label: 'Seat map', icon: LayoutDashboard },
];

const TAB_CONTENT = {
  register: {
    title: 'Register attendees on their phone',
    bullets: [
      'One link covers solo, family, and group registrations',
      'Fields adapt to the event — accommodation, dietary, role',
      'Auto-fill via Gospeler ID so returning attendees skip retyping',
    ],
  },
  tickets: {
    title: 'Tickets they can edit, share, and resend',
    bullets: [
      'Every attendee gets a unique code + QR',
      'Email and SMS confirmations sent automatically',
      'Self-service edits to attendee details before the event',
    ],
  },
  checkin: {
    title: 'Door check-in on any phone',
    bullets: [
      'Scan a QR or look up by name in seconds',
      'Real-time attendance counts on the admin dashboard',
      'Group check-in marks every family member at once',
    ],
  },
  badges: {
    title: 'Printable, custom-branded badges',
    bullets: [
      'Per-event template with your church branding',
      'Role chips (speaker, volunteer, attendee) auto-colored',
      'Batch-print or print on demand at the door',
    ],
  },
  email: {
    title: 'Confirmation, reminders, and broadcasts',
    bullets: [
      'Polished confirmation email with ticket, QR, and calendar invite',
      'Reminders at T-1 day and T-1 hour, dedupe-safe on retries',
      'Bulk announcements to every confirmed attendee in one click',
    ],
  },
  seatmap: {
    title: 'Auto-assign rooms and seats',
    bullets: [
      'Hand-place groups or let the system pack rows automatically',
      'Couples and families stay together by default',
      'Visual seat-map editor for admins, live to attendees',
    ],
  },
};

const FEATURES = [
  {
    icon: Calendar,
    title: 'Set up an event in minutes',
    body: 'A guided editor for date, location, ticket tiers, accommodation, and a seat map — no spreadsheet juggling.',
  },
  {
    icon: Share2,
    title: 'One link, mobile-first',
    body: 'Share a chrome-less invite page over WhatsApp or SMS. Recipients register in under a minute on any phone.',
  },
  {
    icon: Ticket,
    title: 'Tickets, badges, and email — built in',
    body: 'Attendees get a real ticket, a printable badge, and a clean confirmation email. Reminders fire on schedule.',
  },
  {
    icon: ScanLine,
    title: 'Door check-in that scales',
    body: 'Scan a QR or search by name. Real-time headcount on every device. Works for 50 attendees or 5,000.',
  },
];

const STEPS = [
  { n: '01', title: 'Create your event',  body: 'Pick a date, location, and seat plan. Add tiers if you need them.' },
  { n: '02', title: 'Share the invite',   body: 'Copy your invite link or QR. Recipients register on mobile in seconds.' },
  { n: '03', title: 'Check people in',    body: 'Scan tickets at the door, print badges, and track attendance live.' },
];

const BRANDING_HIGHLIGHTS = [
  'Pick a cover gradient or upload your own banner',
  'Custom invite-link landing scoped to one event',
  'Per-event ticket roles — attendee, volunteer, speaker',
  'Email and badge templates carry your church name',
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const tab = TAB_CONTENT[activeTab];

  return (
    // Pull out of Layout's max-w-6xl container so the hero can go full-bleed,
    // then re-inset every section's content with its own max-width.
    <div className="space-y-24 sm:space-y-32 -mx-4 sm:-mx-6 -my-8 sm:-my-14">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white" style={{ backgroundImage: SKY_GRADIENT }}>
        {/* Soft cloud orbs */}
        <div className="absolute top-20 left-[8%] h-72 w-72 rounded-full opacity-50 blur-3xl" style={{ backgroundColor: '#ffffff' }} />
        <div className="absolute top-40 right-[10%] h-96 w-96 rounded-full opacity-40 blur-3xl" style={{ backgroundColor: '#dceaff' }} />
        <div className="absolute bottom-0 left-[40%] h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ backgroundColor: '#a4c4ff' }} />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-24 sm:pb-32">
          <div className="text-center max-w-3xl mx-auto">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-rail"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              For Christian gatherings &amp; events
            </span>
            <h1 className="mt-7 font-display font-black tracking-tight leading-[0.95] text-5xl sm:text-7xl">
              Events that<br />just&nbsp;work.
            </h1>
            <p className="mt-7 text-lg sm:text-xl text-white/90 leading-relaxed max-w-xl mx-auto">
              Open registration in minutes. Send tickets, scan attendees at the door,
              and track every seat — from one place.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                to={isAuthenticated ? '/events/new' : '/login'}
                className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-ambient text-sm"
              >
                {isAuthenticated ? 'Create an event' : 'Get started'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              <a
                href="#features"
                className="btn text-white backdrop-blur-rail text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Tabbed product preview card — the focal "interactive demo" beat
              borrowed from the Fillout reference. Each tab swaps a small,
              stylized mockup so visitors can mentally browse the product
              without leaving the homepage. */}
          <div className="mt-14 sm:mt-20 mx-auto max-w-5xl">
            <div className="rounded-3xl bg-white text-on-surface shadow-ambient-lg overflow-hidden border border-white/40">
              <div className="flex items-center gap-1 px-3 sm:px-6 pt-4 overflow-x-auto border-b border-outline-variant/30">
                {TABS.map(({ id, label, icon: Icon }) => {
                  const isActive = id === activeTab;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 -mb-px text-[11px] sm:text-xs font-semibold uppercase tracking-[0.08em] whitespace-nowrap border-b-2 transition ${
                        isActive
                          ? 'border-primary-700 text-primary-700'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-5 gap-0">
                <div className="sm:col-span-2 p-7 sm:p-10 space-y-5">
                  <h3 className="font-display font-bold text-xl sm:text-2xl tracking-tight">
                    {tab.title}
                  </h3>
                  <ul className="space-y-3">
                    {tab.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-on-surface-variant leading-relaxed">
                        <span
                          className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full shrink-0"
                          style={{ backgroundImage: PRIMARY_GRADIENT }}
                        >
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="sm:col-span-3 bg-primary-50/60 p-7 sm:p-10 flex items-center justify-center min-h-[280px] border-t sm:border-t-0 sm:border-l border-outline-variant/30">
                  <TabPreview tab={activeTab} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700">
            <span className="h-1 w-6 rounded-full" style={{ backgroundImage: PRIMARY_GRADIENT }} />
            Features
          </span>
          <h2 className="mt-3 font-display text-headline-sm sm:text-display-sm tracking-tight text-on-surface">
            Everything an organizer needs in one place
          </h2>
          <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed">
            From the first invite to the last person through the door — Gospelar
            handles the plumbing so your team can focus on the gathering itself.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="card p-8 space-y-5 hover:shadow-ambient-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-glow"
                style={{ backgroundImage: PRIMARY_GRADIENT }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="font-display font-bold text-lg tracking-tight text-on-surface">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                  {body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── BRANDING SECTION ─────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700">
              <span className="h-1 w-6 rounded-full" style={{ backgroundImage: PRIMARY_GRADIENT }} />
              Branding
            </span>
            <h2 className="mt-3 font-display text-headline-sm sm:text-display-sm tracking-tight text-on-surface">
              Every touchpoint feels like yours
            </h2>
            <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Pick a cover, set a tone, and Gospelar carries it through to the
              invite, the ticket, the email, and the badge — without your team
              touching a design tool.
            </p>
            <ul className="mt-8 space-y-3">
              {BRANDING_HIGHLIGHTS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-on-surface leading-relaxed">
                  <span
                    className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                    style={{ backgroundImage: PRIMARY_GRADIENT }}
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Sample event landing mockup — illustrates what an invite recipient
              actually sees on their phone, with two floating accent cards
              hinting at what happens after they register. */}
          <div className="relative">
            <div className="card p-2 sm:p-3 shadow-ambient-lg">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden relative bg-gradient-to-br from-primary-400 via-primary-600 to-primary-900">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.25), transparent 60%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15), transparent 50%)',
                  }}
                />
                <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-white">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] bg-white/15 backdrop-blur-rail self-start">
                    Registration open
                  </span>
                  <h3 className="mt-4 font-display font-extrabold text-2xl sm:text-3xl tracking-tight">
                    Youth Camp 2026
                  </h3>
                  <p className="mt-1 text-sm text-white/85">
                    Three days of worship, teaching, and recreation.
                  </p>
                  <div className="mt-5 flex items-center gap-4 text-[11px] text-white/80 flex-wrap">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Aug 12–14</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Camp Cedar Hill</span>
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 248 / 500 seats</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 card p-3 hidden sm:flex items-center gap-2 shadow-ambient-lg">
              <Ticket className="h-4 w-4 text-primary-700" />
              <span className="text-xs font-semibold text-on-surface">QR ticket sent</span>
            </div>
            <div className="absolute -bottom-5 -left-5 card p-3 hidden sm:flex items-center gap-2 shadow-ambient-lg">
              <ShieldCheck className="h-4 w-4 text-tertiary" />
              <span className="text-xs font-semibold text-on-surface">Checked in: 47</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700">
            <span className="h-1 w-6 rounded-full" style={{ backgroundImage: PRIMARY_GRADIENT }} />
            How it works
          </span>
          <h2 className="mt-3 font-display text-headline-sm sm:text-display-sm tracking-tight text-on-surface">
            Three steps from idea to a room full of people
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="card p-8 space-y-4">
              <span className="font-display text-3xl font-extrabold text-primary-700 tracking-tight">
                {n}
              </span>
              <div className="font-display font-bold text-lg tracking-tight text-on-surface">
                {title}
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FOOTER ───────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-8">
        <div className="relative overflow-hidden rounded-3xl text-white shadow-ambient-lg" style={{ backgroundImage: PRIMARY_GRADIENT }}>
          <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ backgroundColor: '#a4c4ff' }} />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: '#dceaff' }} />
          <div className="relative px-8 sm:px-14 py-14 sm:py-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">
                Open your next event for registration in minutes.
              </h2>
              <p className="mt-3 text-white/85 text-sm sm:text-base leading-relaxed">
                No setup call. No spreadsheet. Just a link your team can share today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? '/events/new' : '/login'}
                className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-ambient"
              >
                {isAuthenticated ? 'Create an event' : 'Get started'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Stylized mockup per tab. Small, abstract, no real screenshots — enough to
// convey what the surface looks like without us shipping device frames or
// design files that have to be re-exported every release.
function TabPreview({ tab }) {
  if (tab === 'register') {
    return (
      <div className="w-full max-w-sm card p-5 space-y-4">
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Attendee 1 of 2
          </div>
          <div className="font-display font-bold text-lg text-on-surface">Sarah Adebayo</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="First name" value="Sarah" />
          <FormField label="Surname"   value="Adebayo" />
          <FormField label="Email"     value="sarah@…" />
          <FormField label="Phone"     value="+234…" />
        </div>
        <div className="rounded-xl bg-primary-50 px-3 py-2 text-[11px] font-semibold text-primary-700 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Auto-filled from Gospeler ID
        </div>
      </div>
    );
  }
  if (tab === 'tickets') {
    return (
      <div className="w-full max-w-xs rounded-3xl bg-zinc-900 text-white p-5 shadow-ambient-lg">
        <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">Gospelar</div>
        <div className="mt-5 font-display font-extrabold text-xl leading-tight">Youth Camp 2026</div>
        <div className="mt-1 text-[11px] text-white/60">Aug 12 · Camp Cedar Hill</div>
        <div className="mt-6 pt-4 border-t border-dashed border-white/20">
          <div className="text-[11px] text-white/60">Attendee</div>
          <div className="text-sm font-semibold">Sarah Adebayo</div>
          <div className="mt-3 font-mono text-xs text-white/50 tracking-tight">TKT-K4M9PX</div>
        </div>
      </div>
    );
  }
  if (tab === 'checkin') {
    const rows = [
      { name: 'Sarah Adebayo', ok: true,  time: '9:02' },
      { name: 'David Okafor',  ok: true,  time: '9:04' },
      { name: 'Mary Eze',      ok: true,  time: '9:11' },
      { name: 'John Adeyemi',  ok: false, time: '—'    },
    ];
    return (
      <div className="w-full max-w-sm space-y-2.5">
        {rows.map(({ name, ok, time }) => (
          <div key={name} className="card p-3 flex items-center gap-3">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${ok ? 'bg-tertiary/15 text-tertiary' : 'bg-on-surface-variant/15 text-on-surface-variant'}`}>
              {ok ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ScanLine className="h-4 w-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-on-surface truncate">{name}</div>
              <div className="text-[10px] text-on-surface-variant">
                {ok ? `Checked in · ${time}` : 'Awaiting check-in'}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (tab === 'badges') {
    return (
      <div className="w-full max-w-xs card p-6 text-center space-y-3 ring-2 ring-primary-200">
        <div className="h-10 w-10 rounded-lg mx-auto" style={{ backgroundImage: PRIMARY_GRADIENT }} />
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          Youth Camp 2026
        </div>
        <div className="font-display font-extrabold text-xl text-on-surface">Sarah Adebayo</div>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundImage: PRIMARY_GRADIENT }}
        >
          Volunteer
        </span>
        <div className="pt-3 mt-3 border-t border-outline-variant/30 font-mono text-xs text-on-surface-variant">
          TKT-K4M9PX
        </div>
      </div>
    );
  }
  if (tab === 'email') {
    return (
      <div className="w-full max-w-sm card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <span
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ backgroundImage: PRIMARY_GRADIENT }}
          >
            <Mail className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-on-surface">You're registered!</div>
            <div className="text-[11px] text-on-surface-variant">Youth Camp 2026 · Aug 12</div>
          </div>
        </div>
        <div className="rounded-xl bg-surface-variant/40 p-3 text-[11px] text-on-surface-variant leading-relaxed">
          Your ticket and QR code are attached. Save this email — you'll need
          the QR code at the door.
        </div>
        <button type="button" className="btn-primary w-full !py-2 text-xs">
          View your ticket
        </button>
      </div>
    );
  }
  if (tab === 'seatmap') {
    const taken   = new Set([0, 1, 5, 6, 7, 12, 13, 18, 19, 20, 24, 25]);
    const youHere = new Set([9, 10, 11]);
    return (
      <div className="w-full max-w-xs card p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-3">
          Row C · Seats 4–8
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 32 }).map((_, i) => {
            const isYou = youHere.has(i);
            const isTaken = taken.has(i);
            return (
              <div
                key={i}
                className={`aspect-square rounded ${
                  isYou
                    ? 'shadow-glow'
                    : isTaken
                      ? 'bg-on-surface-variant/30'
                      : 'bg-surface-variant border border-outline-variant/40'
                }`}
                style={isYou ? { backgroundImage: PRIMARY_GRADIENT } : undefined}
              />
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3 text-[10px] text-on-surface-variant flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded" style={{ backgroundImage: PRIMARY_GRADIENT }} /> You
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded bg-on-surface-variant/30" /> Taken
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded bg-surface-variant border border-outline-variant/40" /> Open
          </span>
        </div>
      </div>
    );
  }
  return null;
}

function FormField({ label, value }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </div>
      <div className="rounded-md bg-surface-variant/50 px-2 py-1.5 text-xs text-on-surface truncate">
        {value}
      </div>
    </div>
  );
}
