import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../api.js';

// Where we stash the pending registration before redirecting to the
// payment provider. Keyed by reference so multiple concurrent payments
// (rare but possible) don't collide.
const PENDING_KEY = 'gospelar.pending-paid-registration.v1';

function loadPending(reference) {
  if (!reference) return null;
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
    return all[reference] || null;
  } catch { return null; }
}
function clearPending(reference) {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
    delete all[reference];
    localStorage.setItem(PENDING_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// Try to read whichever query param the provider uses to expose the
// reference of the completed transaction. Paystack uses `reference`,
// Flutterwave uses `tx_ref`, Stripe uses `session_id` (we pass it through
// callback_url ourselves via {CHECKOUT_SESSION_ID}).
function pickReference(searchParams, fallbackProvider) {
  const ref      = searchParams.get('reference');
  const trxref   = searchParams.get('trxref');
  const txRef    = searchParams.get('tx_ref');
  const session  = searchParams.get('session_id');
  const provider = (searchParams.get('provider') || fallbackProvider || '').toLowerCase();
  if (provider === 'stripe' && session)        return { reference: session,  provider };
  if (provider === 'flutterwave' && txRef)     return { reference: txRef,    provider };
  if (provider === 'paystack' && (ref || trxref)) return { reference: ref || trxref, provider };
  return { reference: ref || trxref || txRef || session || '', provider };
}

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Three phases: verifying provider → registering tickets → done/error.
  const [phase, setPhase]   = useState('verifying');
  const [error, setError]   = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Stripe cancel path. Stripe redirects with ?cancelled=1 when the
      // user backs out of Checkout; nothing to verify or roll back.
      if (searchParams.get('cancelled')) {
        if (!cancelled) {
          setPhase('error');
          setError('Payment was cancelled before completion.');
        }
        return;
      }

      const { reference, provider } = pickReference(searchParams, '');
      if (!reference) {
        if (!cancelled) { setPhase('error'); setError('No payment reference found in the callback URL.'); }
        return;
      }

      const pending = loadPending(reference);
      if (!pending) {
        if (!cancelled) {
          setPhase('error');
          setError('Could not find the pending registration on this device.');
          setDetail('Did the payment redirect take you to a different browser? Reopen the link on the device you started the payment on.');
        }
        return;
      }

      // 1. Verify the payment with the provider.
      let verifyResult;
      try {
        verifyResult = await api.verifyEventPayment({
          reference,
          provider: provider || pending.provider,
          paymentSessionToken: pending.paymentSessionToken,
        });
      } catch (e) {
        if (!cancelled) {
          setPhase('error');
          setError(e?.message || 'Could not verify the payment.');
        }
        return;
      }
      if (!verifyResult?.ok) {
        if (!cancelled) {
          setPhase('error');
          setError(verifyResult?.error || 'Payment verification failed.');
        }
        return;
      }

      // 2. Hand the proof token to the actual registration endpoint.
      if (!cancelled) setPhase('registering');
      let registerResult;
      try {
        registerResult = await api.register(pending.eventId, {
          ...pending.payload,
          paymentProofToken: verifyResult.paymentProofToken,
        });
      } catch (e) {
        if (!cancelled) {
          setPhase('error');
          setError(e?.message || 'Payment was accepted but ticket creation failed. Contact the event organizer with the reference below.');
          setDetail(`Reference: ${reference}`);
        }
        return;
      }

      const tickets = registerResult?.tickets || [];
      if (!tickets.length) {
        if (!cancelled) {
          setPhase('error');
          setError('Payment was accepted but no ticket was created.');
          setDetail(`Reference: ${reference}`);
        }
        return;
      }

      // 3. Fire confirmation channels — same shape Register.jsx uses.
      const primaryEmail = (pending.payload?.attendees?.[0]?.email || '').trim().toLowerCase();
      tickets.forEach((t) => {
        const ownerEmail = (t.attendeeEmail || '').trim().toLowerCase();
        if (ownerEmail) api.sendConfirmationEmail(t);
        if (primaryEmail && primaryEmail !== ownerEmail) {
          api.sendConfirmationEmail(t, primaryEmail);
        }
        if (t.attendeePhone) api.sendConfirmationSms(t);
      });

      clearPending(reference);
      if (!cancelled) {
        setPhase('done');
        // Auto-jump to the primary ticket after a brief success flash so the
        // user sees their ticket without an extra click.
        setTimeout(() => navigate(`/tickets/${tickets[0].code}`), 1200);
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-md mx-auto card p-8 sm:p-10 text-center space-y-4">
      {phase === 'verifying' && (
        <>
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mx-auto" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">Verifying payment…</h1>
          <p className="text-sm text-on-surface-variant">Hold on — we're confirming with your bank.</p>
        </>
      )}
      {phase === 'registering' && (
        <>
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mx-auto" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">Creating your ticket…</h1>
          <p className="text-sm text-on-surface-variant">Payment confirmed. Finishing your registration.</p>
        </>
      )}
      {phase === 'done' && (
        <>
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">You're in</h1>
          <p className="text-sm text-on-surface-variant">Taking you to your ticket…</p>
        </>
      )}
      {phase === 'error' && (
        <>
          <AlertCircle className="h-10 w-10 text-muted-coral mx-auto" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">Payment didn't complete</h1>
          <p className="text-sm text-on-surface-variant">{error || 'Something went wrong.'}</p>
          {detail && <p className="text-xs text-on-surface-variant/80 break-words">{detail}</p>}
          <div className="flex justify-center gap-2 pt-2">
            <Link to="/events" className="btn-soft">
              <ArrowLeft className="h-4 w-4" /> Browse events
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export { PENDING_KEY };
