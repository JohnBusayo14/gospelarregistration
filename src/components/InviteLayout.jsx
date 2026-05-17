import { Outlet } from 'react-router-dom';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)';

// Bare-bones layout for share-link landings (/r/:eventId).
//
// The main Layout has a top nav with Events / Tickets / Dashboard / Admin.
// That's right for the SaaS console but wrong for a public invite — the
// recipient was invited to one event, and exposing every other surface
// invites confusion (and lets them browse to events they weren't invited
// to). This layout shows only the brand mark + the registration screen;
// no navigation, no footer links.
export default function InviteLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-outline-variant/30 print:hidden">
        <div className="mx-auto max-w-lg px-4 h-14 flex items-center gap-3">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white font-display font-extrabold text-sm shadow-glow"
            style={{ backgroundImage: PRIMARY_GRADIENT }}
          >
            G
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-display font-extrabold tracking-tight text-on-surface text-sm">
              Gospelar
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant mt-0.5">
              You're invited
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-32">
        <div className="mx-auto max-w-lg px-4 py-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
