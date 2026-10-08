/** Mic capture -> 16 kHz mono 16-bit WAV, the format the SeamlessM4T STT endpoint expects. */
const TARGET_RATE = 16_000;

export interface Recorder {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export interface RecordOptions {
  /** Called every animation frame with mic loudness 0..1 (for the UI). */
  onLevel?: (level: number) => void;
  /** Fired once the speaker has talked and then gone quiet for `silenceMs`. */
  onSilence?: () => void;
  /** Fired if nobody starts talking within `noSpeechMs`. */
  onNoSpeech?: () => void;
  silenceMs?: number;
  noSpeechMs?: number;
  maxMs?: number;
}

export async function startRecording(opts: RecordOptions = {}): Promise<Recorder> {
  const { onLevel, onSilence, onNoSpeech, silenceMs = 1800, noSpeechMs = 6000, maxMs = 20000 } = opts;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  const media = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  media.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  media.start();

  // Voice-activity detection: RMS of the mic against a noise floor measured in the first ~400 ms.
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const started = performance.now();
  let floor = 0;
  let floorSamples = 0;
  let heardSpeech = false;
  let lastVoice = started;
  let raf = 0;
  let done = false;

  const tick = () => {
    if (done) return;
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();
    onLevel?.(Math.min(1, rms * 8));

    if (now - started < 400) {
      floor = (floor * floorSamples + rms) / (floorSamples + 1);
      floorSamples++;
    } else {
      const threshold = Math.max(0.02, floor * 3);
      if (rms > threshold) {
        heardSpeech = true;
        lastVoice = now;
      }
      if (heardSpeech && now - lastVoice > silenceMs) {
        done = true;
        onSilence?.();
        return;
      }
      if (!heardSpeech && now - started > noSpeechMs) {
        done = true;
        onNoSpeech?.();
        return;
      }
      if (now - started > maxMs) {
        done = true;
        onSilence?.();
        return;
      }
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const release = () => {
    done = true;
    cancelAnimationFrame(raf);
    onLevel?.(0);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => undefined);
  };

  return {
    cancel() {
      if (media.state !== 'inactive') media.stop();
      release();
    },
    stop() {
      return new Promise<Blob>((resolve, reject) => {
        media.onstop = async () => {
          release();
          try {
            resolve(await toWav(new Blob(chunks, { type: media.mimeType })));
          } catch (e) {
            reject(e);
          }
        };
        if (media.state === 'inactive') media.onstop(new Event('stop'));
        else media.stop();
      });
    },
  };
}

async function toWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_RATE), TARGET_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return new Blob([view], { type: 'audio/wav' });
}
