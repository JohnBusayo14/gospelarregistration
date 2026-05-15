import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QrScanner from 'qr-scanner';
import {
  CheckCircle2, XCircle, Camera, CameraOff, Keyboard, Volume2, VolumeX,
  Users, AlertTriangle, ScanLine, RefreshCw,
} from 'lucide-react';
import { api } from '../api.js';

// Try to read a ticket code out of whatever the QR encodes — plain code,
// our /check-in?code=... URL, or some other URL containing it.
function extractCode(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  const direct = trimmed.match(/^TKT-[A-Z0-9]{4,}$/i);
  if (direct) return direct[0].toUpperCase();
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get('code');
    if (fromQuery) return fromQuery.toUpperCase();
    const fromPath  = url.pathname.match(/TKT-[A-Z0-9]{4,}/i);
    if (fromPath) return fromPath[0].toUpperCase();
  } catch { /* not a URL */ }
  const anywhere = trimmed.match(/TKT-[A-Z0-9]{4,}/i);
  return anywhere ? anywhere[0].toUpperCase() : null;
}

// Tiny synthesized beep — avoids shipping audio assets.
function beep(freq, ms, vol = 0.08) {
  try {
    const ctx = beep._ctx || (beep._ctx = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = vol;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch {}
}

export default function CheckIn() {
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [eventTickets, setEventTickets] = useState([]);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);          // last scan result banner
  const [history, setHistory] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [muted, setMuted] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const lastScanRef = useRef({ code: '', at: 0 }); // de-dupe rapid re-scans

  // Load events + auto-select. If a ?code= came in (e.g. someone opened a QR
  // URL in their phone browser), feed it straight into submit.
  useEffect(() => {
    api.listEvents().then((list) => {
      setEvents(list);
      const preferred = params.get('event') || list[0]?.id || '';
      setEventId(preferred);
    });
    const fromQr = params.get('code');
    if (fromQr) {
      handleScanned(fromQr);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh tickets whenever the selected event changes (or after a check-in).
  const refreshTickets = useCallback(async () => {
    if (!eventId) return;
    setEventTickets(await api.listEventTickets(eventId));
  }, [eventId]);
  useEffect(() => { refreshTickets(); }, [refreshTickets]);

  // Camera lifecycle — start on mount, stop on unmount or when toggled off.
  useEffect(() => {
    let cancelled = false;
    if (!scanning || !videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (res) => handleScanned(res.data),
      {
        highlightScanRegion: false,
        highlightCodeOutline: false,
        preferredCamera: 'environment',
        maxScansPerSecond: 4,
      },
    );
    scannerRef.current = scanner;
    scanner.start()
      .then(() => { if (cancelled) scanner.stop(); setCameraError(''); })
      .catch((e) => setCameraError(e?.message || 'Camera unavailable'));

    return () => {
      cancelled = true;
      try { scanner.stop(); scanner.destroy(); } catch {}
      scannerRef.current = null;
    };
  }, [scanning]);

  async function handleScanned(raw) {
    const c = extractCode(raw);
    if (!c) return;
    // De-dupe: same code within 3 seconds of the previous read is ignored.
    const now = Date.now();
    if (lastScanRef.current.code === c && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { code: c, at: now };
    await commit(c);
  }

  async function commit(c) {
    let res;
    try {
      res = await api.checkIn(c);
    } catch (err) {
      res = { ok: false, error: err.message };
    }

    // Validate the ticket actually belongs to the selected event.
    if (res.ok && eventId) {
      const t = (await api.getTicket(c)) || {};
      if (t.eventId && t.eventId !== eventId) {
        res = { ok: false, error: 'Wrong event', ticketCode: c, eventTitle: t.eventTitle };
      } else {
        Object.assign(res, {
          ticketTypeName: t.ticketTypeName,
          accommodationName: t.accommodationName,
        });
      }
    }

    if (!muted) {
      if (res.ok) { beep(880, 80); setTimeout(() => beep(1175, 120), 90); }
      else        { beep(220, 240, 0.06); }
    }
    setResult({ ...res, code: c, at: Date.now() });
    setHistory((h) => [{ at: new Date(), code: c, ...res }, ...h].slice(0, 12));
    refreshTickets();

    // Auto-dismiss banner after a few seconds.
    setTimeout(() => setResult((r) => r?.at === res?.at ? null : r), 4000);
  }

  async function submitManual(e) {
    e.preventDefault();
    const c = extractCode(code) || code.trim().toUpperCase();
    if (!c) return;
    setCode('');
    await commit(c);
  }

  // Stats
  const stats = useMemo(() => {
    const total = eventTickets.length;
    const checked = eventTickets.filter((t) => t.status === 'checked-in').length;
    return { total, checked, remaining: total - checked };
  }, [eventTickets]);

  const selectedEvent = events.find((e) => e.id === eventId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Check-in</h1>
          <p className="text-sm text-zinc-500 mt-1">Scan tickets at the door — verify and mark attendance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="btn-ghost !px-2"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button onClick={refreshTickets} className="btn-ghost !px-2" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Event selector + live stats */}
      <div className="card p-5 grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
        <div>
          <label className="label">Event</label>
          <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.length === 0 && <option value="">No events</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>
        <Stat label="Checked in"  value={stats.checked}   accent="text-tertiary" />
        <Stat label="Remaining"   value={stats.remaining} accent="text-brand-600" />
        <Stat label="Total"       value={stats.total} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scanner column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden bg-zinc-900 text-white aspect-video relative">
            {scanning ? (
              <>
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                {/* Scan reticle overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative h-2/3 w-2/3 max-h-72 max-w-72">
                    <Corner pos="top-0 left-0"      cls="border-t-2 border-l-2 rounded-tl-2xl" />
                    <Corner pos="top-0 right-0"     cls="border-t-2 border-r-2 rounded-tr-2xl" />
                    <Corner pos="bottom-0 left-0"   cls="border-b-2 border-l-2 rounded-bl-2xl" />
                    <Corner pos="bottom-0 right-0"  cls="border-b-2 border-r-2 rounded-br-2xl" />
                    <div className="absolute inset-x-0 top-1/2 h-px bg-brand-500/80 shadow-[0_0_12px_2px] shadow-brand-500/60 animate-pulse" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 chip bg-black/60 text-white ring-1 ring-white/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary-fixed animate-pulse" />
                  Scanning
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <ScanLine className="h-14 w-14" />
                <p className="text-sm">Camera off</p>
                {cameraError && (
                  <p className="text-xs text-muted-coral max-w-xs text-center px-4">
                    <AlertTriangle className="inline h-3.5 w-3.5 mr-1" /> {cameraError}
                  </p>
                )}
              </div>
            )}

            {/* Scan-result banner overlay */}
            {result && (
              <div className={`absolute inset-x-0 bottom-0 p-4 sm:p-5 ${
                result.ok ? 'bg-tertiary/95' : 'bg-muted-coral/95'
              } text-white flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-200`}>
                {result.ok
                  ? <CheckCircle2 className="h-8 w-8 flex-shrink-0" />
                  : <XCircle      className="h-8 w-8 flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold tracking-tight text-lg">
                    {result.ok ? result.attendeeName : (result.error || 'Check-in failed')}
                  </div>
                  <div className="text-sm opacity-90 truncate">
                    {result.ok
                      ? [result.ticketTypeName, result.accommodationName].filter(Boolean).join(' · ') || result.eventTitle
                      : `Code ${result.code}`}
                  </div>
                </div>
                <span className="hidden sm:inline font-mono text-xs opacity-90">{result.code}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScanning((s) => !s)}
              className={scanning ? 'btn-ghost' : 'btn-primary'}
            >
              {scanning ? <><CameraOff className="h-4 w-4" /> Stop camera</> : <><Camera className="h-4 w-4" /> Start scanner</>}
            </button>
            <button
              onClick={() => setManualOpen((o) => !o)}
              className="btn-soft"
            >
              <Keyboard className="h-4 w-4" /> Manual entry
            </button>
          </div>

          {manualOpen && (
            <form onSubmit={submitManual} className="card p-4 flex gap-2">
              <div className="relative flex-1">
                <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="TKT-XXXXXX"
                  className="input pl-9 font-mono tracking-wider uppercase"
                  autoFocus
                />
              </div>
              <button className="btn-primary">Check in</button>
            </form>
          )}
        </div>

        {/* Activity panel */}
        <aside className="card p-5 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-600" />
            <h2 className="font-bold tracking-tight">Recent activity</h2>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">
              Scans will appear here. {selectedEvent ? `Scanning for: ${selectedEvent.title}` : ''}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {history.map((h, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3 text-sm">
                  {h.ok
                    ? <CheckCircle2 className="h-4 w-4 text-tertiary flex-shrink-0" />
                    : <XCircle className="h-4 w-4 text-muted-coral flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {h.ok ? h.attendeeName : (h.error || 'Failed')}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono">{h.code}</div>
                  </div>
                  <span className="text-xs text-zinc-400 tabular">
                    {h.at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = 'text-ink' }) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-2xl font-extrabold tabular ${accent}`}>{value}</div>
    </div>
  );
}

function Corner({ pos, cls }) {
  return <div className={`absolute ${pos} h-8 w-8 border-white/90 ${cls}`} />;
}
