// PendingApprovals.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin surface for bank-transfer registrations awaiting verification.
// Reached from the Inbox icon on the Registrations topbar. Lists every
// pending row for events the calling user created (super-admins see all),
// shows the transfer screenshot full-size, and lets the admin approve
// (mints real tickets + fires the standard ticket-confirmation email) or
// reject with a reason (releases held capacity + emails the registrant).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, X, RefreshCcw, Image as ImageIcon, Users, Ticket, CalendarDays,
  Clock, AlertCircle, MailCheck, ChevronDown, ChevronUp, BedDouble, Armchair,
} from 'lucide-react';
import { api } from '../api.js';
import { useTopBar } from '../context/TopBarContext.jsx';

const TABS = [
  { id: 'pending',  label: 'Pending'  },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'expired',  label: 'Expired'  },
];

function naira(cents) {
  return cents ? `₦${(Number(cents) / 100).toLocaleString()}` : '—';
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
function attendeeNames(att) {
  if (!Array.isArray(att) || !att.length) return 'Unnamed';
  const first = `${att[0].firstName || ''} ${att[0].lastName || ''}`.trim() || att[0].email || 'Guest';
  return att.length === 1 ? first : `${first} + ${att.length - 1} other${att.length === 2 ? '' : 's'}`;
}

export default function PendingApprovals() {
  const [tab, setTab]         = useState('pending');
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(null); // id of the row currently being approved/rejected
  const [openId, setOpenId]   = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const list = await api.listPendingRegistrations({ status: tab });
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || 'Could not load pending registrations.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useTopBar({
    title: 'Pending approvals',
    actions: [
      { id: 'refresh', icon: RefreshCcw, label: 'Refresh', onClick: load, disabled: loading },
    ],
  }, [loading, tab]);

  async function approve(id) {
    setBusy(id); setError('');
    try {
      await api.approvePendingRegistration(id);
      // Optimistically remove from pending list; user can switch tabs to see it.
      setRows((prev) => prev.filter((r) => r.id !== id));
      setOpenId(null);
    } catch (e) {
      setError(e?.message || 'Approval failed.');
    } finally {
      setBusy(null);
    }
  }

  async function reject(id) {
    const reason = rejectReason.trim();
    if (!reason) { setError('Please type a short reason.'); return; }
    setBusy(id); setError('');
    try {
      await api.rejectPendingRegistration(id, reason);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason('');
      setOpenId(null);
    } catch (e) {
      setError(e?.message || 'Rejection failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
          Pending bank-transfer approvals
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Verify each transfer against the screenshot and approve to mint tickets
          (the attendee gets the standard confirmation email automatically) or
          reject with a reason. Pending rows expire after 48 hours.
        </p>
      </header>

      {/* Tab strip */}
      <div className="flex border-b border-outline-variant/30 gap-1 overflow-x-auto">
        {TABS.map(({ id, label }) => {
          const active = id === tab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 -mb-px text-xs font-bold uppercase tracking-[0.10em] border-b-2 whitespace-nowrap transition ${
                active
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-700 bg-red-50 border border-red-100 inline-flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="card p-10 text-center text-on-surface-variant">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const open = openId === r.id;
            return (
              <article key={r.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-container-low/60 transition"
                >
                  <span className="h-12 w-12 rounded-lg overflow-hidden bg-zinc-100 shrink-0 ring-1 ring-zinc-200">
                    {r.proofImage ? (
                      <img src={r.proofImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 m-auto mt-3.5 text-zinc-400" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-on-surface truncate flex-1">{r.eventTitle || r.eventId}</span>
                      <StatusChip status={r.status} />
                    </div>
                    <div className="text-[12px] text-on-surface-variant truncate mt-0.5">
                      {attendeeNames(r.attendees)}
                      <span className="text-on-surface-variant/60"> · {r.registrantEmail}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                      <span className="inline-flex items-center gap-1">
                        <Ticket className="h-3 w-3" /> {r.ticketTypeName || '—'} × {r.quantity}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                        {naira(r.amountCents)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {fmtDate(r.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span className="self-center h-7 w-7 inline-flex items-center justify-center rounded-full text-on-surface-variant">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-outline-variant/20 bg-surface-container-low/40 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* LEFT: screenshot — click to open full-size */}
                      <a
                        href={r.proofImage}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl overflow-hidden bg-zinc-100 ring-1 ring-zinc-200 hover:ring-primary-400"
                        title="Open screenshot full size"
                      >
                        <img
                          src={r.proofImage}
                          alt="Transfer screenshot"
                          className="w-full max-h-[460px] object-contain"
                        />
                      </a>

                      {/* RIGHT: registration details */}
                      <div className="space-y-3">
                        <Block title="Attendees">
                          <ul className="space-y-1 text-sm">
                            {(r.attendees || []).map((a, i) => (
                              <li key={i}>
                                <span className="font-semibold">
                                  {`${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Guest'}
                                </span>
                                <span className="text-on-surface-variant text-[12px]"> · {a.email || 'no email'}{a.phone ? ` · ${a.phone}` : ''}</span>
                              </li>
                            ))}
                          </ul>
                        </Block>

                        <Block title="Logistics">
                          <Field label="Event"          value={r.eventTitle || r.eventId} />
                          <Field label="Ticket"         value={`${r.ticketTypeName || '—'} × ${r.quantity}`} />
                          <Field label="Amount"         value={naira(r.amountCents)} bold />
                          {r.accommodationName && (
                            <Field label="Accommodation" value={r.accommodationName} icon={BedDouble} />
                          )}
                          {Array.isArray(r.seatLabels) && r.seatLabels.filter(Boolean).length > 0 && (
                            <Field label="Seats" value={r.seatLabels.filter(Boolean).join(', ')} icon={Armchair} />
                          )}
                          <Field label="Reference"      value={r.transferReference || '—'} mono />
                          <Field label="Submitted"      value={fmtDate(r.createdAt)} />
                          {r.reviewedAt && (
                            <Field label="Reviewed" value={`${fmtDate(r.reviewedAt)} by ${r.reviewedByEmail || '—'}`} />
                          )}
                          {r.rejectionReason && (
                            <Field label="Rejection reason" value={r.rejectionReason} multiline />
                          )}
                          {r.ticketCodes && r.ticketCodes.length > 0 && (
                            <Field label="Issued tickets" value={r.ticketCodes.join(', ')} mono />
                          )}
                        </Block>

                        {r.customAnswers && Object.keys(r.customAnswers).length > 0 && (
                          <Block title="Form answers">
                            <dl className="text-sm space-y-1">
                              {Object.entries(r.customAnswers).map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                  <dt className="font-semibold text-on-surface-variant text-[12px] uppercase tracking-wider min-w-[8rem]">{k}</dt>
                                  <dd className="text-on-surface flex-1 whitespace-pre-wrap">{String(v)}</dd>
                                </div>
                              ))}
                            </dl>
                          </Block>
                        )}
                      </div>
                    </div>

                    {/* Action row — only on pending rows */}
                    {r.status === 'pending' && (
                      <div className="space-y-3 pt-2 border-t border-outline-variant/30">
                        {rejectingId === r.id ? (
                          <div className="space-y-2">
                            <label className="label">Reason for rejection (will be emailed to the attendee)</label>
                            <textarea
                              className="input min-h-[80px] resize-y"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="e.g. We couldn't find your transfer on our statement — please try again with a fresh screenshot."
                              maxLength={500}
                              autoFocus
                            />
                            <div className="flex flex-wrap gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="btn-soft"
                                disabled={busy === r.id}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => reject(r.id)}
                                disabled={busy === r.id || !rejectReason.trim()}
                                className="btn inline-flex items-center gap-1.5 bg-red-600 text-white hover:bg-red-700"
                              >
                                <X className="h-4 w-4" /> {busy === r.id ? 'Sending…' : 'Send rejection'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => { setRejectingId(r.id); setRejectReason(''); }}
                              className="btn-soft inline-flex items-center gap-1.5"
                              disabled={busy === r.id}
                            >
                              <X className="h-4 w-4" /> Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => approve(r.id)}
                              disabled={busy === r.id}
                              className="btn-primary inline-flex items-center gap-1.5"
                            >
                              <Check className="h-4 w-4" />
                              {busy === r.id ? 'Approving…' : 'Approve & email ticket'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {r.status === 'approved' && (
                      <div className="rounded-lg bg-tertiary/10 text-tertiary px-3 py-2 text-sm inline-flex items-center gap-2">
                        <MailCheck className="h-4 w-4" />
                        Tickets issued and confirmation email sent.
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const cls = {
    pending:  'bg-calm-amber/15 text-calm-amber',
    approved: 'bg-tertiary-container text-tertiary',
    rejected: 'bg-muted-coral/10 text-muted-coral',
    expired:  'bg-surface-container-high text-on-surface-variant',
  }[status] || 'bg-surface-container-high text-on-surface-variant';
  return <span className={`chip ${cls}`}>{status}</span>;
}

function Block({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value, icon: Icon, bold, mono, multiline }) {
  return (
    <div className="text-sm flex items-start gap-2">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface-variant min-w-[7rem] inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" strokeWidth={1.7} />} {label}
      </span>
      <span className={`flex-1 ${bold ? 'font-bold' : ''} ${mono ? 'font-mono text-[13px]' : ''} ${multiline ? 'whitespace-pre-wrap leading-relaxed' : ''} text-on-surface`}>
        {value || '—'}
      </span>
    </div>
  );
}

function EmptyState({ tab }) {
  const copy = {
    pending:  { title: 'No pending approvals',  body: "When attendees pay by bank transfer they'll show up here for you to verify." },
    approved: { title: 'No approved registrations yet', body: 'Approved bank-transfer registrations land here once you confirm them.' },
    rejected: { title: 'No rejections',          body: "Rejected registrations are archived here with the reason you gave the attendee." },
    expired:  { title: 'No expired pending rows', body: 'Pending rows older than 48 hours auto-expire and release held seats.' },
  }[tab] || { title: 'Nothing here', body: '' };
  return (
    <div className="card p-12 text-center space-y-3">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 mx-auto">
        <Clock className="h-6 w-6" strokeWidth={2.25} />
      </div>
      <div>
        <h3 className="font-display font-bold text-lg text-on-surface">{copy.title}</h3>
        <p className="text-sm text-on-surface-variant mt-1 max-w-sm mx-auto">{copy.body}</p>
      </div>
      <Link to="/registrations" className="btn-soft inline-flex">Back to registrations</Link>
    </div>
  );
}
