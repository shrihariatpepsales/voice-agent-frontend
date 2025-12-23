import axios from 'axios';
import { getBrowserSessionId } from '../session';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach browser_session_id to every JSON request body under metadata
apiClient.interceptors.request.use((config) => {
  const sessionId = getBrowserSessionId();

  if (sessionId && config && config.headers) {
    config.headers['X-Browser-Session-Id'] = sessionId;
  }

  if (sessionId && config && config.data && typeof config.data === 'object') {
    config.data = {
      ...config.data,
      metadata: {
        ...(config.data.metadata || {}),
        browser_session_id: sessionId,
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

export default apiClient;


