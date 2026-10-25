import { useCallback, useEffect, useRef, useState } from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import api from '../lib/api';
import API_BASE_URL from '../config/api';

/** Persistent warning when the backend is down or missing tools/keys. */
function BackendBanner() {
  const [state, setState] = useState({ status: 'checking' });

  const check = useCallback(async () => {
    try {
      const { data } = await api.get('/health', { timeout: 8000 });
      setState({ status: 'ok', data });
    } catch {
      setState({ status: 'offline' });
    }
  }, []);

  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  useEffect(() => {
    check();
    // Re-check while offline so the banner clears itself when the server starts
    const id = setInterval(() => {
      if (statusRef.current === 'offline') check();
    }, 10000);
    return () => clearInterval(id);
  }, [check]);

  let message = null;
  if (state.status === 'offline') {
    message = `Can't reach the DJ Crate server at ${API_BASE_URL}. Start it with "npm start" in the backend folder.`;
  } else if (state.status === 'ok') {
    const { tools, features } = state.data;
    const missing = ['ytdlp', 'ffmpeg', 'ffprobe'].filter((t) => !tools[t]?.path).map((t) => (t === 'ytdlp' ? 'yt-dlp' : t));
    if (missing.length) message = `Downloads won't work: ${missing.join(', ')} not installed. Run "brew install yt-dlp ffmpeg".`;
    else if (!features.search) message = 'Search is off: add YOUTUBE_API_KEY to backend/.env and restart the server.';
  }
  if (!message) return null;

  return (
    <div role="alert" className="flex items-center gap-3 px-4 py-2 bg-warning/10 border-b border-warning/30 text-warning text-xs shrink-0">
      <FaExclamationTriangle className="shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={check} className="flex items-center gap-1 font-semibold bg-transparent border-none text-warning hover:text-text-primary">
        <FaRedo className="text-[10px]" /> Retry
      </button>
    </div>
  );
}

export default BackendBanner;
