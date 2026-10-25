import { FaDownload, FaCheck, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import useDownloadStore from '../../stores/downloadStore';
import useSettingsStore, { DOWNLOAD_FORMATS } from '../../stores/settingsStore';
import useTrackActions from '../../hooks/useTrackActions';

const STAGE_LABEL = { queued: 'Queued', downloading: 'Downloading', analysing: 'Analysing', converting: 'Converting', done: 'Saved' };

/** Download with the default profile; shows live progress, cancel and result. */
function DownloadButton({ song, compact = false }) {
  const { videoId, download } = useTrackActions(song);
  const job = useDownloadStore((s) => {
    const id = s.order.find((i) => s.jobs[i]?.videoId === videoId);
    return id ? s.jobs[id] : null;
  });
  const savedFile = useDownloadStore((s) => s.files[videoId]);
  const format = useSettingsStore((s) => s.downloadFormat);
  const formatLabel = DOWNLOAD_FORMATS.find((f) => f.value === format)?.label;

  const running = job && (job.status === 'queued' || job.status === 'running');
  const pct = Math.round((job?.progress || 0) * 100);

  if (running) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); useDownloadStore.getState().cancel(job.id); }}
        title="Cancel download"
        aria-label={`${STAGE_LABEL[job.stage] || 'Working'} ${pct}%, click to cancel`}
        className={`group/dl relative overflow-hidden flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium border-none bg-bg-hover text-text-secondary ${compact ? 'h-8 w-24' : 'h-9 flex-1'}`}
      >
        <span className="absolute inset-y-0 left-0 bg-accent/30 transition-[width] duration-300" style={{ width: `${pct}%` }} />
        <span className="relative tabular group-hover/dl:hidden">{STAGE_LABEL[job.stage] || 'Working'} {pct}%</span>
        <span className="relative hidden group-hover/dl:inline-flex items-center gap-1 text-danger"><FaTimes /> Cancel</span>
      </button>
    );
  }

  const failed = job?.status === 'error';
  const done = job?.status === 'done' || (!job && savedFile);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); download(); }}
      title={failed ? job.error?.message : done ? `Saved as ${savedFile?.fileName || job?.fileName} - click to download again as ${formatLabel}` : `Download ${formatLabel}`}
      className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium border-none transition-colors duration-150 ${compact ? 'h-8 w-24' : 'h-9 flex-1'}
        ${failed ? 'bg-danger/15 text-danger hover:bg-danger/25'
          : done ? 'bg-success/15 text-success hover:bg-success/25'
            : 'bg-bg-hover text-text-secondary hover:bg-accent hover:text-white'}`}
    >
      {failed ? <FaExclamationTriangle /> : done ? <FaCheck /> : <FaDownload />}
      {failed ? 'Retry' : done ? 'Saved' : formatLabel}
    </button>
  );
}

export default DownloadButton;
