import { useEffect, useState } from 'react';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import api from '../lib/api';
import API_BASE_URL from '../config/api';
import useSettingsStore, { DOWNLOAD_FORMATS, MAX_DURATION_OPTIONS } from '../stores/settingsStore';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { Button } from '../components/ui/Button';

function Card({ title, description, children }) {
  return (
    <section className="bg-bg-card border border-border rounded-(--radius-card) p-5">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2 cursor-pointer">
      <span>
        <span className="block text-sm text-text-primary">{label}</span>
        {description && <span className="block text-xs text-text-muted mt-0.5">{description}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-10 h-5 accent-accent shrink-0" />
    </label>
  );
}

function Diagnostics() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const load = () => {
    setError(null);
    api.get('/health').then(({ data }) => setHealth(data)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const Row = ({ ok, label, value }) => (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      {ok ? <FaCheckCircle className="text-success shrink-0" /> : <FaTimesCircle className="text-danger shrink-0" />}
      <span className="text-text-secondary w-32 shrink-0">{label}</span>
      <span className="text-text-primary truncate text-xs" title={value}>{value}</span>
    </div>
  );

  return (
    <Card title="Diagnostics" description={`Backend at ${API_BASE_URL}`}>
      {error && <p className="text-sm text-danger mb-2">{error}</p>}
      {health && (
        <>
          <Row ok={!!health.tools.ytdlp.path} label="yt-dlp" value={health.tools.ytdlp.version || 'not installed'} />
          <Row ok={!!health.tools.ffmpeg.path} label="ffmpeg" value={health.tools.ffmpeg.version || 'not installed'} />
          <Row ok={!!health.tools.ffprobe.path} label="ffprobe" value={health.tools.ffprobe.version || 'not installed'} />
          <Row ok={!!health.tools.jsRuntime} label="JS runtime" value={health.tools.jsRuntime?.name || 'none - yt-dlp may get worse formats'} />
          <Row ok={health.features.search} label="YouTube search" value={health.features.search ? 'API key set' : 'Add YOUTUBE_API_KEY to backend/.env'} />
          <Row ok={health.features.assistant} label="AI assistant" value={health.features.assistant ? 'API key set' : 'Add OPENAI_API_KEY to backend/.env'} />
          <Row ok={health.features.cookiesBrowser !== 'none'} label="Cookies browser" value={health.features.cookiesBrowser} />
          <Row ok label="Saving to" value={health.downloadDir} />
          <p className="text-xs text-text-muted mt-3 leading-relaxed">
            YouTube Premium unlocks 256kbps streams: sign in to YouTube in the browser named by YTDLP_COOKIES_BROWSER
            (chrome, safari, firefox, brave, edge) in backend/.env. Safari needs Full Disk Access for the terminal running the backend.
            Change the folder with DOWNLOAD_DIR. Keep yt-dlp updated - YouTube changes often: <code>pip install -U yt-dlp</code> or <code>brew upgrade yt-dlp</code>.
          </p>
        </>
      )}
      <Button size="sm" className="mt-3" onClick={load}>Re-check</Button>
    </Card>
  );
}

function SettingsPage() {
  const s = useSettingsStore();

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-5">
      <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-accent to-neon bg-clip-text text-transparent">Settings</h1>

      <Card title="Download format" description="Every format starts from the same YouTube stream (about 128kbps, 256kbps with Premium). No format can add quality that isn't in the source - these differ in compatibility, tags and size.">
        <div className="space-y-2" role="radiogroup" aria-label="Default download format">
          {DOWNLOAD_FORMATS.map((f) => (
            <label key={f.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${s.downloadFormat === f.value ? 'border-accent bg-accent/5' : 'border-border hover:border-border-light'}`}>
              <input type="radio" name="format" value={f.value} checked={s.downloadFormat === f.value} onChange={() => s.setDownloadFormat(f.value)} className="mt-1 accent-accent" />
              <span>
                <span className="block text-sm font-medium text-text-primary">{f.label} <span className="text-text-muted font-normal">· {f.detail}</span></span>
                <span className="block text-xs text-text-secondary mt-0.5">{f.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Search">
        <label className="flex items-center justify-between gap-4 text-sm text-text-primary">
          Track length
          <select value={s.maxDuration} onChange={(e) => s.setSetting('maxDuration', Number(e.target.value))} className="h-9 px-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent">
            {MAX_DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </Card>

      <Card title="Display">
        <Toggle
          label="Stage mode"
          description="Higher contrast and bigger text for dark booths."
          checked={s.stageMode}
          onChange={(v) => s.setSetting('stageMode', v)}
        />
        <label className="flex items-center justify-between gap-4 py-2 text-sm text-text-primary">
          Library view
          <select value={s.viewMode} onChange={(e) => s.setSetting('viewMode', e.target.value)} className="h-9 px-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent">
            <option value="grid">Grid</option>
            <option value="table">Table (BPM / Key columns)</option>
          </select>
        </label>
      </Card>

      <Diagnostics />

      <Card title="Keyboard shortcuts">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt><kbd className="text-xs text-text-primary border border-border rounded px-1.5 py-0.5 bg-bg-hover">{k}</kbd></dt>
              <dd className="text-text-secondary">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="text-xs text-text-muted leading-relaxed">
        Only download music you have the right to use. Downloading from YouTube may break its Terms of Service and copyright law;
        for gigs, buying the release (Bandcamp, Beatport, Juno) also gets you the lossless master.
      </p>
    </div>
  );
}

export default SettingsPage;
