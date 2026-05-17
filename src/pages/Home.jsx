import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Ticket, ScanLine, Users,
  Share2, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useAuth } from '../authContext.jsx';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Create events in minutes',
    body: 'Retreats, camps, breakfasts, conferences — set seats, pricing tiers, and a cover in one flow.',
  },
  {
    icon: Share2,
    title: 'Share a single link',
    body: 'Send a clean invite link over WhatsApp or SMS. Recipients land on a focused, chrome-less registration page.',
  },
  {
    icon: Ticket,
    title: 'Tickets, badges & email',
    body: 'Attendees get a ticket they can edit, a printable badge, and a clean confirmation email — out of the box.',
  },
  {
    icon: ScanLine,
    title: 'Fast door check-in',
    body: 'Scan tickets at the door or look them up by name. No app install, works on any phone.',
  },
  {
    icon: Users,
    title: 'Seat assignments',
    body: 'Hand-place attendees on a seat map, or let the system assign rows automatically as people register.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for churches',
    body: 'Multi-church workspaces, role-based admin, and an audit trail of every registration and edit.',
  },
];

const STEPS = [
  { n: '01', title: 'Create your event', body: 'Pick a date, location, and seat plan. Add tiers if you need them.' },
  { n: '02', title: 'Share the invite',  body: 'Copy your invite link or QR — recipients register on mobile in seconds.' },
  { n: '03', title: 'Check people in',   body: 'Scan tickets at the door, print badges, and track attendance live.' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* Hero — generic landing, no specific event. */}
      <section className="relative overflow-hidden rounded-2xl text-white shadow-ambient-lg">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(135deg, #061f4c 0%, #0b3a8a 45%, #1656c2 100%)' }}
        />
        <div
          className="absolute -top-32 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: '#b9d3ff' }}
        />
        <div
          className="absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: '#a4f3d1' }}
        />

        <div className="relative px-8 sm:px-16 py-20 sm:py-28 max-w-3xl">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-rail"
            style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
          >
            <Sparkles className="h-3 w-3" strokeWidth={2} />
            For Christian events &amp; gatherings
          </span>
          <h1 className="mt-6 font-display text-5xl sm:text-display-lg leading-[1.05] tracking-tight">
            Christian events,<br />simplified.
          </h1>
          <p className="mt-5 text-white/85 text-lg max-w-xl leading-relaxed">
            One place to create, register, manage tickets, and check in for retreats, camps,
            and church gatherings. Built mobile-first for the way invites really travel.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Link
                to="/events/new"
                className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-ambient"
              >
                Create an event <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-ambient"
              >
                Get started <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            )}
            <Link
              to="/events"
              className="btn text-white backdrop-blur-rail"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              Browse events
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid. */}
      <section>
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-headline-sm text-on-surface">
            Everything you need to run an event
          </h2>
          <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">
            From the first invite to the last person through the door — Gospelar handles the
            registration plumbing so your team can focus on the gathering itself.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="card p-8 space-y-4 hover:shadow-ambient-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-glow"
                style={{ backgroundImage: 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)' }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div className="font-display font-bold text-lg tracking-tight text-on-surface">
                {title}
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works. */}
      <section>
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-headline-sm text-on-surface">How it works</h2>
          <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">
            Three steps from idea to a room full of people.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="card p-8 space-y-3">
              <span className="font-display text-3xl font-extrabold text-primary-700 tracking-tight">
                {n}
              </span>
              <div className="font-display font-bold text-lg tracking-tight text-on-surface">
                {title}
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA. */}
      <section className="relative overflow-hidden rounded-2xl text-white shadow-ambient-lg">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)' }}
        />
        <div className="relative px-8 sm:px-14 py-14 sm:py-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">
              Ready to open registration?
            </h2>
            <p className="mt-3 text-white/85 text-sm leading-relaxed">
              Spin up your first event in a few minutes — no setup call required.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Link
                to="/events/new"
                className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-ambient"
              >
                Create an event <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-ambient"
              >
                Sign in to get started <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
