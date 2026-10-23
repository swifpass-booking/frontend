import { useEffect, useRef, useState } from 'react';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import { parsePassportText, type ScanResult } from '../lib/passport';

interface PassportScannerProps {
  onResult: (result: ScanResult) => void;
  onClose: () => void;
}

const MRZ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';

/** Grayscale + contrast stretch; OCR-B reads far better on high-contrast input. */
function prepare(source: CanvasImageSource, sw: number, sh: number, cropTop: number): HTMLCanvasElement {
  const srcY = Math.round(sh * cropTop);
  const srcH = sh - srcY;
  const scale = Math.min(2, 1800 / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(srcH * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, srcY, sw, srcH, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = d[i + 1] = d[i + 2] = g;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i] - lo) * 255) / range;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export default function PassportScanner({ onResult, onClose }: PassportScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Line up the two rows of text at the bottom of the photo page.');

  useEffect(() => {
    let cancelled = false;
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false })
        .then((stream) => {
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCameraReady(true);
        })
        .catch(() => setMessage('Camera unavailable — upload a photo of the passport page instead.'));
    } else {
      setMessage('Camera needs HTTPS — upload a photo of the passport page instead.');
    }
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void workerRef.current?.terminate();
    };
  }, []);

  async function recognise(source: CanvasImageSource, w: number, h: number) {
    setBusy(true);
    setMessage('Reading passport… (first scan downloads the OCR model)');
    try {
      if (!workerRef.current) {
        const worker = await createWorker('eng');
        await worker.setParameters({ tessedit_char_whitelist: MRZ_CHARS, tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
        workerRef.current = worker;
      }
      // MRZ sits in the bottom ~third of the page; fall back to the whole image if that crop misses.
      for (const cropTop of [0.6, 0.4, 0]) {
        const { data } = await workerRef.current.recognize(prepare(source, w, h, cropTop));
        const result = parsePassportText(data.text);
        if (result) return onResult(result);
      }
      setMessage('Could not find the machine-readable lines. Hold steady, avoid glare, and try again.');
    } catch {
      setMessage('Scan failed. Check your connection (the OCR model downloads once) and try again.');
    } finally {
      setBusy(false);
    }
  }

  function captureFrame() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    void recognise(v, v.videoWidth, v.videoHeight);
  }

  async function handleFile(file: File) {
    const bitmap = await createImageBitmap(file);
    await recognise(bitmap, bitmap.width, bitmap.height);
    bitmap.close();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/70 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-navy-950">Scan passport</h3>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-navy-950">
            Close
          </button>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-900">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {cameraReady && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 h-16 rounded-lg border-2 border-dashed border-white/80" />
          )}
        </div>

        <p className="mt-3 text-xs text-slate-500" role="status">
          {message}
        </p>

        <div className="mt-4 flex gap-3">
          <button
            disabled={!cameraReady || busy}
            onClick={captureFrame}
            className="flex-1 rounded-xl bg-brand-blue py-2.5 text-sm font-bold text-white enabled:hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? 'Reading…' : 'Capture'}
          </button>
          <label className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2.5 text-center text-sm font-bold text-navy-950 hover:border-slate-300">
            Upload photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          The image is processed in your browser and never uploaded. Only the fields you confirm are sent.
        </p>
      </div>
    </div>
  );
}
