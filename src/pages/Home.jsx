import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Calendar, Ticket, ScanLine, Award, Mail, LayoutDashboard,
  Share2, ShieldCheck, Users, MapPin, Sparkles, Check,
} from 'lucide-react';
import { useAuth } from '../authContext.jsx';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

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
  { icon: Calendar, title: 'Set up an event in minutes',           body: 'A guided editor for date, location, ticket tiers, accommodation, and a seat map — no spreadsheet juggling.' },
  { icon: Share2,   title: 'One link, mobile-first',                body: 'Share a chrome-less invite page over WhatsApp or SMS. Recipients register in under a minute on any phone.' },
  { icon: Ticket,   title: 'Tickets, badges, and email — built in', body: 'Attendees get a real ticket, a printable badge, and a clean confirmation email. Reminders fire on schedule.' },
  { icon: ScanLine, title: 'Door check-in that scales',             body: 'Scan a QR or search by name. Real-time headcount on every device. Works for 50 attendees or 5,000.' },
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

// Reveal-on-scroll helper. Adds `data-revealed=true` to the element when
// it crosses the viewport — paired with CSS that fades / slides it into
// place. Pure IntersectionObserver, no library.
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute('data-revealed', 'true');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const tab = TAB_CONTENT[activeTab];

  return (
    // Pull out of Layout's max-w-6xl container AND its page padding so the
    // page is one continuous blue surface from edge to edge.
    <div
      className="relative overflow-hidden -my-8 sm:-my-14 text-white bg-[#061b4d]"
      style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}
    >
      {/* ── Decorative animated background ────────────────────────────────
          Three layers stacked behind every section:
          1. Soft radial gradient mesh — gives the deep navy depth so it
             doesn't read as one flat slab.
          2. Star-field — tiny dots positioned via a repeating gradient.
          3. Floating orbs — three blurred discs that drift independently. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Mesh — slowly shifts hue across the page */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage: `
              radial-gradient(at 8% 12%,  rgba(59,130,246,0.45) 0px, transparent 45%),
              radial-gradient(at 92% 18%, rgba(99, 102, 241, 0.30) 0px, transparent 45%),
              radial-gradient(at 50% 50%, rgba(22, 86, 194, 0.35) 0px, transparent 55%),
              radial-gradient(at 12% 82%, rgba(56, 189, 248, 0.25) 0px, transparent 40%),
              radial-gradient(at 88% 92%, rgba(168, 85, 247, 0.22) 0px, transparent 45%)
            `,
          }}
        />
        {/* Subtle star field */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
            backgroundSize: '36px 36px',
          }}
        />
        {/* Drifting orbs */}
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur ring-1 ring-white/15 shimmer-chip"
                style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
                For Christian gatherings &amp; events
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-7 font-display font-black tracking-tight leading-[0.95] text-5xl sm:text-7xl xl:text-8xl">
                Events that<br />
                <span className="hero-shimmer">just&nbsp;work.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-7 text-lg sm:text-xl text-blue-100/90 leading-relaxed max-w-xl mx-auto">
                Open registration in minutes. Send tickets, scan attendees at the door,
                and track every seat — from one place.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Link
                  to={isAuthenticated ? '/events/new' : '/login'}
                  className="btn bg-white text-[#0b3a8a] hover:bg-blue-50 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] text-sm group"
                >
                  {isAuthenticated ? 'Create an event' : 'Get started'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
                </Link>
                <a
                  href="#features"
                  className="btn text-white backdrop-blur ring-1 ring-white/20 hover:bg-white/15 text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  See how it works
                </a>
              </div>
            </Reveal>
          </div>

          {/* Tabbed product preview card — sits on a glass surface so the
              blue still bleeds through but content stays legible. */}
          <Reveal delay={320} className="mt-14 sm:mt-20 mx-auto max-w-6xl">
            <div className="relative rounded-3xl overflow-hidden bg-white/95 text-on-surface shadow-[0_30px_80px_-20px_rgba(8,16,80,0.6)] ring-1 ring-white/20 backdrop-blur">
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
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
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
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────────────── */}
      <section id="features" className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 pb-20 sm:pb-28">
          <Reveal>
            <div className="max-w-2xl mb-12">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                <span className="h-1 w-6 rounded-full bg-gradient-to-r from-blue-400 to-fuchsia-400" />
                Features
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight text-white">
                Everything an organizer needs in one place
              </h2>
              <p className="mt-3 text-sm sm:text-base text-blue-100/80 leading-relaxed">
                From the first invite to the last person through the door — Gospelar
                handles the plumbing so your team can focus on the gathering itself.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <article className="group relative h-full rounded-2xl bg-white/[0.06] backdrop-blur-md ring-1 ring-white/10 p-8 space-y-5 transition-all duration-500 hover:bg-white/[0.10] hover:ring-white/25 hover:-translate-y-1 overflow-hidden">
                  {/* hover glow */}
                  <span className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(99,102,241,0.25), transparent 60%)' }} />
                  <span
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_10px_30px_-12px_rgba(56,189,248,0.6)] ring-1 ring-white/20"
                    style={{ backgroundImage: PRIMARY_GRADIENT }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <div className="relative">
                    <h3 className="font-display font-bold text-lg tracking-tight text-white">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm text-blue-100/75 leading-relaxed">{body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRANDING SECTION ─────────────────────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <Reveal>
              <div>
                <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                  <span className="h-1 w-6 rounded-full bg-gradient-to-r from-pink-400 to-blue-400" />
                  Branding
                </span>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight text-white">
                  Every touchpoint feels like yours
                </h2>
                <p className="mt-3 text-sm sm:text-base text-blue-100/80 leading-relaxed">
                  Pick a cover, set a tone, and Gospelar carries it through to the
                  invite, the ticket, the email, and the badge — without your team
                  touching a design tool.
                </p>
                <ul className="mt-8 space-y-3">
                  {BRANDING_HIGHLIGHTS.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-blue-50 leading-relaxed">
                      <span
                        className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0 ring-1 ring-white/20"
                        style={{ backgroundImage: PRIMARY_GRADIENT }}
                      >
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Sample event landing mockup with two floating accent cards */}
            <Reveal delay={120}>
              <div className="relative">
                <div className="rounded-3xl p-2 sm:p-3 bg-white/[0.06] backdrop-blur-md ring-1 ring-white/10 shadow-[0_40px_80px_-20px_rgba(8,16,80,0.6)]">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden relative bg-gradient-to-br from-blue-500 via-blue-700 to-indigo-900">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.30), transparent 60%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.18), transparent 50%)',
                      }}
                    />
                    <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-white">
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] bg-white/15 backdrop-blur self-start">
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

                <div className="absolute -top-6 -right-6 hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 shadow-lg float-a">
                  <Ticket className="h-4 w-4 text-blue-200" />
                  <span className="text-xs font-semibold text-white">QR ticket sent</span>
                </div>
                <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 shadow-lg float-b">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  <span className="text-xs font-semibold text-white">Checked in: 47</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 pb-20 sm:pb-28">
          <Reveal>
            <div className="max-w-2xl mb-12">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                <span className="h-1 w-6 rounded-full bg-gradient-to-r from-blue-400 to-sky-300" />
                How it works
              </span>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight text-white">
                Three steps from idea to a room full of people
              </h2>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-5">
            {STEPS.map(({ n, title, body }, i) => (
              <Reveal key={n} delay={i * 100}>
                <div className="group rounded-2xl bg-white/[0.06] backdrop-blur-md ring-1 ring-white/10 p-8 space-y-4 transition-all duration-500 hover:bg-white/[0.10] hover:ring-white/25 hover:-translate-y-1 h-full">
                  <span className="font-display text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white to-blue-300 bg-clip-text text-transparent">
                    {n}
                  </span>
                  <div className="font-display font-bold text-lg tracking-tight text-white">{title}</div>
                  <p className="text-sm text-blue-100/75 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ───────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 pb-20 sm:pb-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl text-white p-[1px] cta-border">
              <div className="rounded-[calc(1.5rem-1px)] bg-[#08246a] p-8 sm:p-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative overflow-hidden">
                <span className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full opacity-40 blur-3xl bg-blue-400" />
                <span className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-30 blur-3xl bg-fuchsia-400" />
                <div className="max-w-xl relative">
                  <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">
                    Open your next event for registration in minutes.
                  </h2>
                  <p className="mt-3 text-white/85 text-sm sm:text-base leading-relaxed">
                    No setup call. No spreadsheet. Just a link your team can share today.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 relative">
                  <Link
                    to={isAuthenticated ? '/events/new' : '/login'}
                    className="btn bg-white text-[#0b3a8a] hover:bg-blue-50 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] group"
                  >
                    {isAuthenticated ? 'Create an event' : 'Get started'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Page-scoped styles — reveal-on-scroll, floating orbs, shimmer.
          Kept inline so the homepage doesn't bleed animation rules into
          the rest of the app. */}
      <style>{`
        /* Reveal-on-scroll */
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 700ms ease-out, transform 700ms ease-out;
          will-change: opacity, transform;
        }
        .reveal[data-revealed="true"] {
          opacity: 1;
          transform: none;
        }

        /* Hero text shimmer */
        .hero-shimmer {
          background: linear-gradient(90deg, #ffffff 0%, #c7d8ff 25%, #ffffff 50%, #c7d8ff 75%, #ffffff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer-x 8s linear infinite;
        }
        @keyframes shimmer-x {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Pill chip shimmer — subtle moving sheen */
        .shimmer-chip {
          position: relative;
          overflow: hidden;
        }
        .shimmer-chip::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
          transform: translateX(-100%);
          animation: chip-sheen 4.5s ease-in-out infinite;
        }
        @keyframes chip-sheen {
          0%, 100% { transform: translateX(-100%); }
          50%      { transform: translateX(100%); }
        }

        /* Floating background orbs */
        .orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(80px);
          opacity: 0.55;
          will-change: transform;
        }
        .orb-1 {
          width: 28rem; height: 28rem;
          top: -6rem; left: -4rem;
          background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
          animation: drift-a 22s ease-in-out infinite;
        }
        .orb-2 {
          width: 32rem; height: 32rem;
          top: 30%; right: -8rem;
          background: radial-gradient(circle, #a855f7 0%, transparent 70%);
          animation: drift-b 28s ease-in-out infinite;
        }
        .orb-3 {
          width: 24rem; height: 24rem;
          bottom: -5rem; left: 30%;
          background: radial-gradient(circle, #38bdf8 0%, transparent 70%);
          animation: drift-c 26s ease-in-out infinite;
        }
        @keyframes drift-a {
          0%, 100% { transform: translate(0, 0)    rotate(0deg); }
          50%      { transform: translate(40px, 60px) rotate(20deg); }
        }
        @keyframes drift-b {
          0%, 100% { transform: translate(0, 0)     rotate(0deg); }
          50%      { transform: translate(-60px, 40px) rotate(-15deg); }
        }
        @keyframes drift-c {
          0%, 100% { transform: translate(0, 0)    rotate(0deg); }
          50%      { transform: translate(30px, -50px) rotate(10deg); }
        }

        /* Floating accent cards on the branding mockup */
        .float-a { animation: float-y 6s ease-in-out infinite; }
        .float-b { animation: float-y 7.5s ease-in-out infinite reverse; }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }

        /* Conic-gradient border for the CTA card */
        .cta-border {
          background: conic-gradient(from 90deg at 50% 50%,
            rgba(255,255,255,0) 0%,
            rgba(56,189,248,0.6) 18%,
            rgba(168,85,247,0.6) 40%,
            rgba(255,255,255,0) 60%,
            rgba(56,189,248,0.6) 82%,
            rgba(255,255,255,0) 100%);
          animation: spin-slow 14s linear infinite;
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }

        /* Respect prefers-reduced-motion across the board */
        @media (prefers-reduced-motion: reduce) {
          .reveal { transition: none; opacity: 1; transform: none; }
          .hero-shimmer, .shimmer-chip::after,
          .orb, .float-a, .float-b, .cta-border {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// Stylized mockup per tab. Lives unchanged on the white preview panel so
// each tab can show a recognisable in-product surface (registration card,
// PILOT-style ticket, check-in list, badge, email, seat map).
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
