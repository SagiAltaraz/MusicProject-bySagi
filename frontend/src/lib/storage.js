// localStorage that never throws (private mode, blocked storage, quota)

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable - keep state for this session only
  }
}

/** A stable per-browser id for the AI chat history on the server. */
export function sessionId() {
  let id = load('dj-session-id', null);
  if (!id) {
    id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, '');
    save('dj-session-id', id);
  }
  return id;
}
