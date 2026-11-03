/**
 * Realtime voice channel to models/agent-project/server.py (/ws/voice).
 *
 * The mic stays open for the whole call. A local energy VAD decides when the user starts and
 * stops talking; audio is streamed as 16 kHz int16 PCM while they talk, so the server can run
 * STT the instant they stop. Reply audio arrives sentence by sentence and is scheduled on a
 * WebAudio timeline. If the user starts talking while a reply is playing (or still being
 * produced) playback is cut immediately and "start" tells the server to abandon that turn.
 */
import type { VoiceTurnResponse } from '../types/agent';

const RATE = 16_000;
const CHUNK = 2048; // worklet block, ~43 ms at 48 kHz
const END_SILENCE_MS = 700;
const ONSET_MS = 90; // sustained loudness before we call it speech
const ONSET_WHILE_PLAYING_MS = 240; // longer + louder while we are talking, to ignore echo
const PREROLL_MS = 400;
const MAX_UTTERANCE_MS = 28_000;

export interface StreamHandlers {
  onLevel: (level: number) => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onTranscript: (text: string) => void;
  onEmpty: () => void;
  onReply: (reply: VoiceTurnResponse) => void;
  onPlaybackStart: () => void;
  onPlaybackEnd: () => void;
  onAudioUnavailable: () => void;
  onError: (detail: string) => void;
  onClose: () => void;
}

export interface VoiceStream {
  sendText: (text: string) => void;
  /** Abandon the in-flight turn and silence playback. */
  cancel: () => void;
  close: () => void;
}

export interface StreamOptions {
  sessionId: string | null;
  /** Read on every message, so signing in mid-call takes effect on the next turn. */
  getToken: () => string | null;
  lang?: string;
}

const WORKLET = `class P extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(${CHUNK});this.n=0}
process(i){const c=i[0][0];if(c)for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===${CHUNK}){this.port.postMessage(this.b.slice());this.n=0}}return true}}
registerProcessor('pcm-capture',P)`;

/** Linear-interpolating downsampler that carries its phase across blocks. */
class Resampler {
  private pos = 0;
  private last = 0;
  constructor(private step: number) {}
  process(inp: Float32Array): Int16Array {
    const out = new Int16Array(Math.ceil(inp.length / this.step) + 1);
    let n = 0;
    let pos = this.pos;
    while (pos < inp.length - 1) {
      const i = Math.floor(pos);
      const a = i < 0 ? this.last : inp[i];
      const s = a + (inp[i + 1] - a) * (pos - i);
      out[n++] = Math.max(-1, Math.min(1, s)) * 0x7fff;
      pos += this.step;
    }
    this.pos = pos - inp.length;
    this.last = inp[inp.length - 1];
    return out.subarray(0, n);
  }
}

export async function openVoiceStream(opts: StreamOptions, h: StreamHandlers): Promise<VoiceStream> {
  const media = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/agent/ws/voice`);
  ws.binaryType = 'arraybuffer';
  let closed = false;
  let speaking = false; // user is mid-utterance
  let sources = new Set<AudioBufferSourceNode>();
  let nextTime = 0;
  let pendingDecodes = 0;
  let turnDone = false;
  let playing = false;
  let playEpoch = 0; // bumped on stopPlayback so in-flight decodes are dropped

  const teardown = () => {
    if (closed) return;
    closed = true;
    stopPlayback();
    media.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => undefined);
    h.onLevel(0);
    if (ws.readyState <= WebSocket.OPEN) ws.close();
  };

  try {
    // Resolves on the server's "ready"; "busy" means the GPU is at its call limit.
    await new Promise<void>((resolve, reject) => {
      ws.onerror = () => reject(new Error('Voice server unreachable.'));
      ws.onclose = () => reject(new Error('Voice server unreachable.'));
      ws.onmessage = (ev) => {
        const type = typeof ev.data === 'string' ? JSON.parse(ev.data).type : '';
        if (type === 'ready') resolve();
        else if (type === 'busy') reject(new Error('busy'));
      };
    });
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
  } catch (e) {
    teardown();
    throw e;
  }
  if (ctx.state === 'suspended') await ctx.resume();

  const sendJson = (o: object) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
  sendJson({ type: 'hello', sessionId: opts.sessionId, token: opts.getToken(), lang: opts.lang ?? 'en' });

  // ---------------------------------------------------------------- playback

  function maybeFinished() {
    if (turnDone && pendingDecodes === 0 && sources.size === 0) {
      turnDone = false;
      playing = false;
      h.onPlaybackEnd();
    }
  }

  function stopPlayback() {
    playEpoch++;
    sources.forEach((s) => {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    sources = new Set();
    nextTime = 0;
    pendingDecodes = 0;
    turnDone = false;
    playing = false;
  }

  let decodeChain = Promise.resolve(); // keeps sentences in order even if decodes finish out of order
  function enqueue(wav: ArrayBuffer) {
    const epoch = playEpoch;
    pendingDecodes++;
    decodeChain = decodeChain.then(async () => {
      try {
        const buf = await ctx.decodeAudioData(wav);
        if (epoch !== playEpoch) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        nextTime = Math.max(ctx.currentTime + 0.02, nextTime);
        src.start(nextTime);
        nextTime += buf.duration;
        sources.add(src);
        src.onended = () => {
          sources.delete(src);
          maybeFinished();
        };
        if (!playing) {
          playing = true;
          h.onPlaybackStart();
        }
      } catch {
        /* undecodable sentence: skip it */
      } finally {
        if (epoch === playEpoch) {
          pendingDecodes--;
          maybeFinished();
        }
      }
    });
  }

  // ---------------------------------------------------------------- server messages
  let expectAudio = false;
  ws.onmessage = (ev) => {
    // While the user is talking, anything still arriving belongs to the turn they just interrupted.
    if (ev.data instanceof ArrayBuffer) {
      if (expectAudio && !speaking) enqueue(ev.data);
      expectAudio = false;
      return;
    }
    const m = JSON.parse(ev.data as string);
    if (speaking && ['transcript', 'reply', 'audio', 'done', 'empty'].includes(m.type)) {
      expectAudio = false;
      return;
    }
    switch (m.type) {
      case 'transcript':
        h.onTranscript(m.text);
        break;
      case 'empty':
        h.onEmpty();
        break;
      case 'reply':
        turnDone = false;
        h.onReply(m as VoiceTurnResponse);
        break;
      case 'audio':
        expectAudio = true;
        break;
      case 'done':
        turnDone = true;
        maybeFinished();
        break;
      case 'audio_unavailable':
        h.onAudioUnavailable();
        break;
      case 'error':
        h.onError(m.detail || 'Something went wrong.');
        break;
    }
  };
  ws.onclose = () => {
    if (!closed) {
      teardown();
      h.onClose();
    }
  };

  // ---------------------------------------------------------------- capture + VAD
  const resampler = new Resampler(ctx.sampleRate / RATE);
  const node = new AudioWorkletNode(ctx, 'pcm-capture');
  const mute = ctx.createGain();
  mute.gain.value = 0; // worklet must be pulled by the graph, but never heard
  ctx.createMediaStreamSource(media).connect(node);
  node.connect(mute).connect(ctx.destination);

  const preroll: Int16Array[] = [];
  let prerollMs = 0;
  let floor = 0;
  let floorMs = 0;
  let loudMs = 0;
  let lastVoice = 0;
  let speechStart = 0;

  const send = (pcm: Int16Array) => ws.readyState === WebSocket.OPEN && ws.send(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));

  node.port.onmessage = (ev: MessageEvent<Float32Array>) => {
    if (closed) return;
    const block = ev.data;
    const ms = (block.length / ctx.sampleRate) * 1000;
    let sum = 0;
    for (let i = 0; i < block.length; i++) sum += block[i] * block[i];
    const rms = Math.sqrt(sum / block.length);
    h.onLevel(Math.min(1, rms * 8));

    const pcm = resampler.process(block);
    const now = performance.now();
    const busy = playing || pendingDecodes > 0;

    if (!speaking && floorMs < 500) {
      floor = (floor * floorMs + rms * ms) / (floorMs + ms);
      floorMs += ms;
    }
    const threshold = Math.max(0.02, floor * 3) * (busy ? 2.5 : 1);

    if (!speaking) {
      preroll.push(pcm);
      prerollMs += ms;
      while (prerollMs > PREROLL_MS && preroll.length > 1) prerollMs -= (preroll.shift()!.length / RATE) * 1000;
      loudMs = rms > threshold ? loudMs + ms : 0;
      if (loudMs >= (busy ? ONSET_WHILE_PLAYING_MS : ONSET_MS)) {
        // Barge-in: cut our own voice first, then tell the server to drop the abandoned turn.
        stopPlayback();
        speaking = true;
        speechStart = lastVoice = now;
        sendJson({ type: 'start' });
        h.onSpeechStart();
        preroll.splice(0).forEach(send);
        prerollMs = 0;
      }
      return;
    }

    send(pcm);
    if (rms > threshold) lastVoice = now;
    if (now - lastVoice > END_SILENCE_MS || now - speechStart > MAX_UTTERANCE_MS) {
      speaking = false;
      loudMs = 0;
      sendJson({ type: 'end', token: opts.getToken() });
      h.onSpeechEnd();
    }
  };

  return {
    sendText(text) {
      stopPlayback();
      sendJson({ type: 'text', text, token: opts.getToken() });
    },
    cancel() {
      stopPlayback();
      sendJson({ type: 'cancel' });
    },
    close: teardown,
  };
}
