import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { adminOccurrences, scanRedeem, scanStats } from './api.js';
import { ModeIcon } from './icons.jsx';

/**
 * Swiftpass — Gate Board (operator console)
 *
 * Real online scanning: the camera decodes a QR into a ticket code, the code
 * is sent to POST /v1/scan/redeem, and the server is the single source of
 * truth for whether it's a first admission, a duplicate, or the wrong event.
 *
 * This is the online-only version. The Flutter app's GateValidator already
 * implements the offline, device-bound, signature-verified version of this
 * pipeline for when a venue has no connectivity — that gets wired to a real
 * signed manifest in a later pass.
 */

const C = {
  ink: '#0F1620',
  panel: '#17212E',
  edge: '#24303F',
  paper: '#E9E3D5',
  dim: '#6B7A8D',
  jade: '#35B98A',
  amber: '#E4A13B',
  crimson: '#C6403C',
};

const REJECT_COPY = {
  unknown_code: 'This code was not issued by Swiftpass.',
  wrong_occurrence: 'This ticket belongs to a different event.',
  revoked: 'This ticket was cancelled or refunded.',
  already_redeemed: 'Already used.',
};

function clockOf(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds()
  ).padStart(2, '0')}`;
}

function Stat({ label, value, tone }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: C.dim }}>
        {label}
      </span>
      <span className="font-mono tabular-nums leading-none" style={{ color: tone || C.paper, fontSize: 34, letterSpacing: '-0.02em' }}>
        {value}
      </span>
    </div>
  );
}

function ScanRow({ e }) {
  const tone = e.accepted ? C.jade : C.crimson;
  return (
    <div
      className="grid items-center gap-3 px-3 py-2 border-b"
      style={{ gridTemplateColumns: '16px 1fr auto', borderColor: C.edge }}
    >
      <span className="font-mono text-[13px]" style={{ color: tone }}>
        {e.accepted ? '✓' : '✕'}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] truncate" style={{ color: C.paper }}>
          {e.passengerName || 'Unknown ticket'}
        </div>
        <div className="text-[11px] truncate" style={{ color: C.dim }}>
          {e.accepted ? e.tripTitle : e.message}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[12px]" style={{ color: C.paper }}>
          {clockOf(e.decidedAt)}
        </div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>
          {e.gate}
        </div>
      </div>
    </div>
  );
}

export default function GateBoard({ user, token, onBack, onSignIn }) {
  const isAdmin = user?.role === 'admin';

  const [occurrences, setOccurrences] = useState([]);
  const [occurrenceId, setOccurrenceId] = useState('');
  const [gate, setGate] = useState('Gate A');
  const [counts, setCounts] = useState({ issued: 0, redeemed: 0, void: 0 });
  const [feed, setFeed] = useState([]);
  const [verdict, setVerdict] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef('');
  const clearTimerRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    adminOccurrences(token)
      .then((res) => {
        setOccurrences(res.occurrences);
        const scheduled = res.occurrences.find((o) => o.status === 'scheduled');
        if (scheduled) setOccurrenceId(scheduled.id);
      })
      .catch((err) => setError(err.message));
  }, [isAdmin, token]);

  const refreshStats = useCallback(
    (occId) => {
      if (!occId) return;
      scanStats(occId, token)
        .then(setCounts)
        .catch((err) => setError(err.message));
    },
    [token]
  );

  useEffect(() => {
    refreshStats(occurrenceId);
  }, [occurrenceId, refreshStats]);

  const handleCode = useCallback(
    async (code) => {
      if (busyRef.current || !code || !occurrenceId) return;
      busyRef.current = true;
      try {
        const result = await scanRedeem(code, occurrenceId, gate, token);
        setVerdict(result);
        setFeed((f) => [{ ...result, gate }, ...f].slice(0, 40));
        refreshStats(occurrenceId);
      } catch (err) {
        setError(err.message);
      } finally {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          setVerdict(null);
          busyRef.current = false;
          lastCodeRef.current = '';
        }, 1800);
      }
    },
    [occurrenceId, gate, token, refreshStats]
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(frame.data, frame.width, frame.height);
      if (found && found.data && found.data !== lastCodeRef.current && !busyRef.current) {
        lastCodeRef.current = found.data;
        handleCode(found.data);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [handleCode]);

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setCameraError(err.message || 'Could not access the camera.');
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => () => stopCamera(), []);

  function submitManual(e) {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCode(manualCode.trim());
      setManualCode('');
    }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg font-extrabold text-navy-950">Admin access required</p>
        <p className="mt-2 text-sm text-slate-500">
          {user ? "Your account doesn't have admin access." : 'Sign in with an admin account to scan tickets.'}
        </p>
        <button
          onClick={user ? onBack : onSignIn}
          className="mt-5 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          {user ? 'Back to booking site' : 'Sign in'}
        </button>
      </div>
    );
  }

  const selected = occurrences.find((o) => o.id === occurrenceId);
  const tone = verdict ? (verdict.accepted ? C.jade : C.crimson) : null;

  return (
    <div style={{ background: C.ink, minHeight: '100vh' }}>
      <div className="border-b px-4 py-2.5 sm:px-6" style={{ borderColor: C.edge }}>
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: C.dim }}>
          ← Back to booking site
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>
              Occurrence
            </label>
            <select
              value={occurrenceId}
              onChange={(e) => setOccurrenceId(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{ background: C.panel, color: C.paper, border: `1px solid ${C.edge}` }}
            >
              {occurrences.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} · {new Date(o.departsAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>
              Gate label
            </label>
            <input
              value={gate}
              onChange={(e) => setGate(e.target.value)}
              className="w-32 rounded-lg px-3 py-2 text-sm font-semibold"
              style={{ background: C.panel, color: C.paper, border: `1px solid ${C.edge}` }}
            />
          </div>
          {selected && (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.dim }}>
              <ModeIcon mode={selected.mode} className="h-4 w-4" width={16} height={16} />
              {selected.providerName}
            </div>
          )}
        </div>

        {error && <p className="mb-4 text-sm font-semibold" style={{ color: C.crimson }}>{error}</p>}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{ background: C.panel, border: `1px solid ${C.edge}`, aspectRatio: '4/3' }}
            >
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <button
                    onClick={startCamera}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                    style={{ background: C.jade }}
                  >
                    Start camera
                  </button>
                  {cameraError && <p className="max-w-xs text-center text-xs" style={{ color: C.crimson }}>{cameraError}</p>}
                </div>
              )}

              {cameraOn && (
                <>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="h-56 w-56 rounded-2xl" style={{ border: `2px solid ${C.paper}99` }} />
                  </div>
                  <button
                    onClick={stopCamera}
                    className="absolute right-3 top-3 rounded-lg px-3 py-1.5 text-xs font-bold"
                    style={{ background: `${C.ink}CC`, color: C.paper }}
                  >
                    Stop
                  </button>
                </>
              )}

              {verdict && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center" style={{ background: `${tone}EE` }}>
                  <span className="text-5xl text-white">{verdict.accepted ? '✓' : '✕'}</span>
                  <p className="text-xl font-bold text-white">{verdict.accepted ? 'ADMITTED' : 'REJECTED'}</p>
                  <p className="text-sm text-white/90">{verdict.passengerName || REJECT_COPY[verdict.reason] || verdict.message}</p>
                  {!verdict.accepted && <p className="text-xs text-white/75">{verdict.message}</p>}
                </div>
              )}
            </div>

            <form onSubmit={submitManual} className="mt-4 flex gap-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter code manually (e.g. SWP1.xxxx) — camera fallback"
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ background: C.panel, color: C.paper, border: `1px solid ${C.edge}` }}
              />
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-bold"
                style={{ background: C.edge, color: C.paper }}
              >
                Redeem
              </button>
            </form>
          </div>

          <div>
            <div className="mb-4 flex justify-between rounded-2xl p-4" style={{ background: C.panel, border: `1px solid ${C.edge}` }}>
              <Stat label="Issued" value={counts.issued} />
              <Stat label="Admitted" value={counts.redeemed} tone={C.jade} />
              <Stat label="Remaining" value={counts.issued - counts.redeemed - counts.void} tone={C.amber} />
            </div>

            <div className="rounded-2xl" style={{ background: C.panel, border: `1px solid ${C.edge}` }}>
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.dim, borderBottom: `1px solid ${C.edge}` }}>
                Recent scans
              </div>
              <div className="max-h-96 overflow-y-auto">
                {feed.length === 0 ? (
                  <p className="p-4 text-sm" style={{ color: C.dim }}>
                    No scans yet — start the camera or enter a code.
                  </p>
                ) : (
                  feed.map((e, i) => <ScanRow key={i} e={e} />)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
