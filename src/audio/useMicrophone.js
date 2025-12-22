import { useEffect, useRef, useState } from 'react';

// Helper: convert Float32 [-1, 1] to 16-bit PCM
function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i += 1) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

/**
 * useMicrophone
 *
 * - Requests mic permission.
 * - Captures audio using Web Audio API.
 * - Resamples to 16kHz mono.
 * - Emits small PCM16 frames via onAudioFrame callback.
 */
export function useMicrophone({ enabled, onAudioFrame }) {
  const [micError, setMicError] = useState(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const processorRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Stop & cleanup
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
          },
        });
        if (cancelled) return;

        mediaStreamRef.current = stream;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000, // request 16kHz if possible
        });
        audioContextRef.current = audioContext;

        const sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;

        // ScriptProcessorNode is deprecated but simple for this use case.
        const bufferSize = 1024;
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          const input = event.inputBuffer.getChannelData(0);
          const pcm16 = floatTo16BitPCM(input);
          if (onAudioFrame) {
            onAudioFrame(pcm16);
          }
        };

        sourceNode.connect(processor);
        processor.connect(audioContext.destination);
        setMicError(null);
      } catch (err) {
        console.error('mic_error', err);
        setMicError(err.message || 'Microphone error');
      }
    }

    start();

    return () => {
      cancelled = true;
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [enabled, onAudioFrame]);

  return { micError };
}


