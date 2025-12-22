// Simple audio player that accepts base64-encoded audio chunks and schedules playback.
// This implementation uses the Web Audio API and expects raw PCM16 16kHz mono
// encoded as base64 strings from the backend.

let audioContext = null;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });
  }
  return audioContext;
}

function pcm16ToFloat32(pcm) {
  const bytes = atob(pcm);
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    view[i] = bytes.charCodeAt(i);
  }
  const dataView = new DataView(buffer);
  const float32 = new Float32Array(bytes.length / 2);
  let offset = 0;
  for (let i = 0; i < float32.length; i += 1) {
    const val = dataView.getInt16(offset, true);
    float32[i] = val / 0x8000;
    offset += 2;
  }
  return float32;
}

export function playAudioChunk(base64Pcm16) {
  if (!base64Pcm16) return;
  const ctx = ensureAudioContext();
  const float32 = pcm16ToFloat32(base64Pcm16);

  const buffer = ctx.createBuffer(1, float32.length, 16000);
  buffer.copyToChannel(float32, 0);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}


