const SESSION_STORAGE_KEY = 'browser_session_id';
const AUTH_STORAGE_KEY = 'voice_agent_auth';

/**
 * Return a stable id for this browser tab.
 * - Stored in sessionStorage so it survives refreshes but not full tab closes.
 */
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

/**
 * Read the current authenticated user from localStorage.
 * Returns `null` for guests or invalid / missing data.
 */
export function getAuthenticatedUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  let raw;
  try {
    raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === 'user' && parsed.user && typeof parsed.user.id === 'string') {
      return parsed.user;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Compute a stable conversation/session identity string.
 * - Guests: "guest:<browserSessionId>"
 * - Logged-in users: "user:<userId>:<browserSessionId>"
 */
export function getConversationSessionId() {
  const browserSessionId = getBrowserSessionId();
  if (!browserSessionId) return null;

  const user = getAuthenticatedUser();
  if (user && user.id) {
    return `user:${user.id}:${browserSessionId}`;
  }

  return `guest:${browserSessionId}`;
}

/**
 * Get user's current timezone (e.g., 'America/New_York', 'Asia/Kolkata')
 * Falls back to IANA timezone name or offset-based timezone
 */
function getUserTimezone() {
  if (typeof window === 'undefined' || typeof Intl === 'undefined') {
    return 'UTC';
  }

  try {
    // Get IANA timezone name (e.g., 'America/New_York', 'Asia/Kolkata')
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    // Fallback: calculate timezone offset
    const offset = -new Date().getTimezoneOffset() / 60;
    const sign = offset >= 0 ? '+' : '-';
    return `UTC${sign}${Math.abs(offset).toString().padStart(2, '0')}:00`;
  }
}

/**
 * Compute metadata to attach to every outbound request (HTTP/WebSocket).
 */
export function getSessionMetadata() {
  const browserSessionId = getBrowserSessionId();
  const conversationSessionId = getConversationSessionId();
  const user = getAuthenticatedUser();

  const userId = user && user.id ? String(user.id) : null;
  const userType = userId ? 'user' : 'guest';

  return {
    browser_session_id: browserSessionId,
    conversation_session_id: conversationSessionId,
    user_id: userId,
    user_type: userType,
    timezone: getUserTimezone(), // Add user's timezone to metadata
  };
}

/**
 * Force a brand new browser session id for this tab.
 * Used when switching auth context (login/logout/switch user) to avoid
 * conversation leakage between different identities.
 */
export function resetBrowserSessionId() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors and let getBrowserSessionId handle fallback.
  }

  return getBrowserSessionId();
}

