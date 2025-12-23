const SESSION_STORAGE_KEY = 'browser_session_id';

export function getBrowserSessionId() {
  if (typeof window === 'undefined') {
    return null;
  }

  const storage = window.sessionStorage;
  let sessionId = storage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      sessionId = window.crypto.randomUUID();
    } else {
      // Fallback – should rarely be used, but keeps behavior stable
      sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    storage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}


