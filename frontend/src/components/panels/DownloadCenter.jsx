import { FaFolderOpen, FaRedo, FaTimes, FaCheckCircle, FaExclamationTriangle, FaFileDownload } from 'react-icons/fa';
import useDownloadStore from '../../stores/downloadStore';
import useSettingsStore, { DOWNLOAD_FORMATS } from '../../stores/settingsStore';
import useUiStore from '../../stores/uiStore';
import { isLocalBackend } from '../../lib/api';
import { formatBytes } from '../../lib/format';
import { Button, IconButton } from '../ui/Button';
import { Badge, KeyBadge, QualityBadge } from '../ui/Badge';
import SidePanel from './SidePanel';

const STAGE = { queued: 'Waiting…', downloading: 'Downloading source', analysing: 'Analysing BPM, key, loudness', converting: 'Encoding', done: 'Saved' };

function JobRow({ job }) {
  const { cancel, retry, reveal, saveViaBrowser } = useDownloadStore.getState();
  const running = job.status === 'queued' || job.status === 'running';
  const pct = Math.round((job.progress || 0) * 100);
  const label = DOWNLOAD_FORMATS.find((f) => f.value === job.profile)?.label || job.profile;
  const name = job.fileName || job.display?.title || job.videoId;
  const a = job.analysis;

  return (
    <li className="px-4 py-3 border-b border-border/60">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {job.status === 'done' ? <FaCheckCircle className="text-success" />
            : job.status === 'error' ? <FaExclamationTriangle className="text-danger" />
              : job.status === 'cancelled' ? <FaTimes className="text-text-muted" />
                : <span className="block w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary truncate" title={name}>{name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge tone="accent">{label}</Badge>
            {job.source && <QualityBadge grade={job.source.grade} />}
            {job.source?.abr && <span className="text-[11px] text-text-muted tabular">{job.source.codec} {job.source.abr}k → </span>}
            {job.output && <span className="text-[11px] text-text-muted tabular">{job.output.sampleRate / 1000}kHz{job.output.bitsPerSample ? `/${job.output.bitsPerSample}-bit` : ''} · {formatBytes(job.output.size)}</span>}
          </div>
          {a && (job.status === 'done' || job.stage === 'converting') && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-text-secondary tabular">
              {a.bpm && <Badge>{a.bpm.toFixed(1)} BPM</Badge>}
              <KeyBadge camelot={a.camelot} keyName={a.key} confidence={a.keyConfidence} />
              {a.lufs !== null && <span title="Integrated loudness (EBU R128). Measured only - the audio is not changed.">{a.lufs} LUFS</span>}
              {a.truePeakDb !== null && <span className={a.clipping ? 'text-warning' : ''} title={a.clipping ? 'True peak above 0 dBTP in the source master - may clip at unity gain' : 'True peak'}>TP {a.truePeakDb} dB</span>}
              {a.cutoffKHz && <span title="Highest frequency with real content - shows how much the source was low-passed">≈{a.cutoffKHz}kHz</span>}
            </div>
          )}
          {running && (
            <div className="mt-2">
              <div className="h-1 bg-bg-hover rounded-full overflow-hidden">
                <div className="h-full bg-linear-to-r from-accent to-neon transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-text-muted mt-1 tabular">{STAGE[job.stage] || 'Working'} · {pct}%</p>
            </div>
          )}
          {job.status === 'error' && <p className="text-xs text-danger mt-1">{job.error?.message}</p>}
          {job.output?.upconverted && job.status === 'done' && (
            <p className="text-[11px] text-text-muted mt-1">Lossless container from a lossy source - no further loss, but no added detail.</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {running && <IconButton size="sm" label="Cancel" onClick={() => cancel(job.id)}><FaTimes /></IconButton>}
          {(job.status === 'error' || job.status === 'cancelled') && <IconButton size="sm" label="Retry" onClick={() => retry(job.id)}><FaRedo /></IconButton>}
          {job.status === 'done' && isLocalBackend && <IconButton size="sm" label="Show in Finder" onClick={() => reveal(job.id)}><FaFolderOpen /></IconButton>}
          {job.status === 'done' && <IconButton size="sm" label="Save a copy through the browser" onClick={() => saveViaBrowser(job.id, job.fileName)}><FaFileDownload /></IconButton>}
        </div>
      </div>
    </li>
  );
}

function DownloadCenter() {
  const { order, jobs, clearFinished } = useDownloadStore();
  const format = useSettingsStore((s) => s.downloadFormat);
  const setDownloadFormat = useSettingsStore((s) => s.setDownloadFormat);
  const list = order.map((id) => jobs[id]).filter(Boolean);
  const hint = DOWNLOAD_FORMATS.find((f) => f.value === format)?.hint;

  return (
    <SidePanel
      title="Downloads"
      subtitle={isLocalBackend ? 'Saved straight to your Downloads folder' : 'Files are sent through the browser'}
      onClose={() => useUiStore.getState().toggleDownloads()}
      actions={list.some((j) => ['done', 'error', 'cancelled'].includes(j.status)) && <Button size="sm" variant="ghost" onClick={clearFinished}>Clear</Button>}
      width="w-[min(100vw,28rem)]"
    >
      <div className="p-4 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Default format</p>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Default download format">
          {DOWNLOAD_FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={format === f.value}
              onClick={() => setDownloadFormat(f.value)}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${format === f.value ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:text-text-primary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-muted mt-2 leading-relaxed">{hint}</p>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-text-muted text-center px-6 py-16">No downloads yet.</p>
      ) : (
        <ul className="list-none">{list.map((job) => <JobRow key={job.id} job={job} />)}</ul>
      )}
    </SidePanel>
  );
}

export default DownloadCenter;
