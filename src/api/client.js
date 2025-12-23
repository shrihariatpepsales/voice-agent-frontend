import axios from 'axios';
import { getBrowserSessionId, getSessionMetadata } from '../session';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach session metadata to every JSON request body under metadata
apiClient.interceptors.request.use((config) => {
  const sessionId = getBrowserSessionId();
  const sessionMeta = getSessionMetadata();

  if (sessionId && config && config.headers) {
    config.headers['X-Browser-Session-Id'] = sessionId;
  }

  if (sessionId && config && config.data && typeof config.data === 'object') {
    config.data = {
      ...config.data,
      metadata: {
        ...(config.data.metadata || {}),
        ...sessionMeta,
      },
    };
  }

  return config;
});

export function fetchConversationHistory() {
  const sessionId = getBrowserSessionId();
  if (!sessionId) {
    return Promise.resolve({ session_id: null, entries: [] });
  }
  return apiClient
    .get(`/api/conversations/${encodeURIComponent(sessionId)}`)
    .then((res) => res.data);
}

// Example: using native fetch with the same metadata contract
export async function postWithSessionMetadata(url, body) {
  const sessionMeta = getSessionMetadata();
  const payload = {
    ...(body || {}),
    metadata: {
      ...(body && body.metadata ? body.metadata : {}),
      ...sessionMeta,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Browser-Session-Id': sessionMeta.browser_session_id || '',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export default apiClient;


