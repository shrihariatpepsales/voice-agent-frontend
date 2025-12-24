import { getSessionMetadata } from '../session';

let socket = null;
let listeners = [];

function notifyAll(message) {
  listeners.forEach((cb) => {
    try {
      cb(message);
    } catch (err) {
      console.error('socket_listener_error', err);
    }
  });
}

function withMetadata(message) {
  const meta = getSessionMetadata();
  return {
    ...message,
    metadata: {
      ...(message.metadata || {}),
      ...meta,
    },
  };
}

export function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  // Use environment variable for WebSocket URL, default to port 8000
  const wsUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
    : 'ws://localhost:8000';
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    notifyAll({ type: 'status', payload: { state: 'connected' } });
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      notifyAll(data);
    } catch (err) {
      console.error('socket_message_parse_error', err);
    }
  };

  socket.onerror = () => {
    notifyAll({ type: 'status', payload: { state: 'error', error: 'socket_error' } });
  };

  socket.onclose = () => {
    notifyAll({ type: 'status', payload: { state: 'disconnected' } });
  };

  return socket;
}

export function sendAudioChunk(pcm16) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const base64 = btoa(String.fromCharCode(...pcm16));
  // Basic client-side logging for debugging
  // Note: keep this lightweight to avoid spamming the console.
  console.debug('sendAudioChunk', { bytes: pcm16.length });
  const message = withMetadata({
    type: 'audio_chunk',
    payload: {
      audio: base64,
    },
  });
  socket.send(JSON.stringify(message));
}

export function sendInterrupt() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const message = withMetadata({
    type: 'interrupt',
    payload: {},
  });
  socket.send(JSON.stringify(message));
}

export function sendStartRecording() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const message = withMetadata({
    type: 'start_recording',
    payload: {},
  });
  socket.send(JSON.stringify(message));
}

export function sendStopRecording() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const message = withMetadata({
    type: 'stop_recording',
    payload: {},
  });
  socket.send(JSON.stringify(message));
}

export function sendChatMessage(text) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  if (!text || !text.trim()) return;
  const message = withMetadata({
    type: 'chat_message',
    payload: {
      text: text.trim(),
    },
  });
  socket.send(JSON.stringify(message));
}

export function subscribe(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((fn) => fn !== cb);
  };
}


