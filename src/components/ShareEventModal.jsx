import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Copy, Check, Share2, MessageCircle, Mail, Globe, QrCode, Send,
} from 'lucide-react';

// Wraps the public registration URL with optional `?ref=` tracking. We keep
// `ref` on the share side so admins can attribute new sign-ups back to the
// person / channel that promoted the event.
//
// We point share links at `/r/:eventId` rather than `/events/:id` because the
// `/r/` route renders without the top-level nav (Events / Tickets / Admin),
// so an SMS/WhatsApp recipient lands on a focused, mobile-first registration
// screen instead of a marketing-style event page with admin surfaces visible.
function buildShareUrl(event, ref = '') {
  if (typeof window === 'undefined') return '';
  const base = `${window.location.origin}/r/${event.id}`;
  if (!ref.trim()) return base;
  return `${base}?ref=${encodeURIComponent(ref.trim())}`;
}

function qrSrc(url, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

export default function ShareEventModal({ event, open, onClose }) {
  const [ref, setRef] = useState('');
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef(null);

  // Close on Escape and on overlay click — simple modal contract, no portal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const url = useMemo(() => (event ? buildShareUrl(event, ref) : ''), [event, ref]);
  const subject = event ? `You're invited: ${event.title}` : '';
  const body    = event
    ? `Hey — I think you'd love this event:\n\n${event.title}\n${event.tagline || ''}\n\nRegister here:\n${url}\n`
    : '';

  if (!open || !event) return null;

  async function copy() {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function nativeShare() {
    if (!navigator.share) { copy(); return; }
    try { await navigator.share({ title: event.title, text: event.tagline, url }); } catch {}
  }

  function openHref(href) {
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose?.()}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="card w-full max-w-lg overflow-hidden">
        <header className="px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-headline-sm text-on-surface">Share registration link</h2>
            <p className="text-xs text-on-surface-variant mt-1 truncate">
              {event.title}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-6 pb-6 space-y-5">
          {/* URL row */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Registration URL
            </label>
            <div className="flex gap-2">
              <input value={url} readOnly className="input font-mono text-xs flex-1" onFocus={(e) => e.target.select()} />
              <button onClick={copy} className="btn-primary !px-3" title="Copy link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Optional referrer tag */}
          <div>
            <label className="label">Referrer tag (optional)</label>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. pastor-mike, instagram, whatsapp"
              className="input"
            />
            <p className="text-[11px] text-on-surface-variant mt-1.5">
              Adds <span className="font-mono">?ref=</span> to the link. Every registration that comes through it is tagged so you can see who brought who.
            </p>
          </div>

          {/* QR */}
          <div className="surface-inset p-5 flex items-center gap-4">
            <img
              src={qrSrc(url)}
              alt="Registration QR"
              className="h-32 w-32 rounded-lg ring-1 ring-outline-variant/20 bg-white"
            />
            <div className="text-xs text-on-surface-variant leading-relaxed">
              <div className="font-bold uppercase tracking-wider text-on-surface mb-1 flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" /> Quick QR
              </div>
              Print this on a flyer or pull it up on a phone screen — anyone with a camera can scan straight to the registration page.
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ActionButton onClick={nativeShare} icon={Share2} label="Share…" />
            <ActionButton
              onClick={() => openHref(`https://wa.me/?text=${encodeURIComponent(`${event.title}\n${url}`)}`)}
              icon={MessageCircle}
              label="WhatsApp"
            />
            <ActionButton
              onClick={() => openHref(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)}
              icon={Mail}
              label="Email"
            />
            <ActionButton
              onClick={() => openHref(`sms:?&body=${encodeURIComponent(`${event.title} — ${url}`)}`)}
              icon={Send}
              label="SMS"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn-ghost !py-3 flex-col !gap-1"
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </button>
  );
}
