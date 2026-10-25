import axios from 'axios';
import API_BASE_URL from '../config/api';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

// Friendly messages for error codes the backend returns
const MESSAGES = {
  NETWORK: "Can't reach the DJ Crate server. Is the backend running?",
  RATE_LIMITED: 'Slow down a little - too many requests. Try again in a minute.',
  YOUTUBE_QUOTA: 'YouTube search quota is used up for today. Try again tomorrow.',
};

// Normalise every failure to { message, code, status } so the UI never shows raw axios errors
export const toApiError = (error) => {
  if (axios.isCancel(error)) return { message: 'Cancelled', code: 'CANCELLED', cancelled: true };
  if (!error.response) return { message: MESSAGES.NETWORK, code: 'NETWORK' };
  const { data, status } = error.response;
  const code = data?.code || `HTTP_${status}`;
  return { message: MESSAGES[code] || data?.error || `Request failed (${status})`, code, status };
};

api.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(toApiError(error)),
);

export const apiUrl = (path) => `${API_BASE_URL}${path}`;

// The backend saves files on the machine it runs on. When that's this machine,
// there's no need to also pull the file through the browser.
export const isLocalBackend = (() => {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(API_BASE_URL).hostname);
  } catch {
    return false;
  }
})();

/**
 * POST that answers with Server-Sent Events (EventSource only supports GET).
 * @param {(event: string, data: any) => void} onEvent
 */
export async function postEventStream(path, body, { signal, onEvent }) {
  let res;
  try {
    res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) return;
    throw { message: MESSAGES.NETWORK, code: 'NETWORK', cause: error };
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw { message: MESSAGES[data.code] || data.error || `Request failed (${res.status})`, code: data.code, status: res.status };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop();
    for (const block of blocks) {
      const event = block.match(/^event: (.*)$/m)?.[1] || 'message';
      const data = block.match(/^data: (.*)$/m)?.[1];
      if (data !== undefined) onEvent(event, JSON.parse(data));
    }
  }
}

export default api;
