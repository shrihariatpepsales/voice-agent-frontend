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

export function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  const url = 'ws://localhost:3001'; // Same host/port as backend HTTP
  socket = new WebSocket(url);

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
  const message = {
    type: 'audio_chunk',
    payload: {
      audio: base64,
    },
  };
  socket.send(JSON.stringify(message));
}

export function sendInterrupt() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const message = {
    type: 'interrupt',
    payload: {},
  };
  socket.send(JSON.stringify(message));
}

export function sendStartRecording() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const message = {
    type: 'start_recording',
    payload: {},
  };
  socket.send(JSON.stringify(message));
}

export function sendStopRecording() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const message = {
    type: 'stop_recording',
    payload: {},
  };
  socket.send(JSON.stringify(message));
}

export function subscribe(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((fn) => fn !== cb);
  };
}


