import { useState } from 'react';
import { FaPlay, FaPause, FaGripVertical, FaWaveSquare, FaVolumeUp } from 'react-icons/fa';
import usePlayerStore from '../../stores/playerStore';
import useTrackMetaStore from '../../stores/trackMetaStore';
import useTrackActions from '../../hooks/useTrackActions';
import { trackFields, formatTime, bpmCompatible, compatibleKeys } from '../../lib/format';
import { KeyBadge, QualityBadge } from '../ui/Badge';
import DownloadButton from './DownloadButton';
import TrackMenu from './TrackMenu';

function Row({ song, index, onRemove, reorder, highlight }) {
  const { videoId, title, channel, duration, thumbnailSmall } = trackFields(song);
  const actions = useTrackActions(song);
  const isCurrent = usePlayerStore((s) => s.currentTrack?.id?.videoId === videoId);
  const isPlaying = usePlayerStore((s) => s.isPlaying) && isCurrent;
  const meta = useTrackMetaStore((s) => s.meta[videoId]);
  const analyzing = useTrackMetaStore((s) => s.analyzing[videoId]);
  const [dropHint, setDropHint] = useState(false);
  const a = meta?.analysis;

  // In crates, rows can be dragged to reorder; everywhere they drag onto crates
  const reorderProps = reorder ? {
    onDragStart: (e) => {
      actions.dragProps.onDragStart(e);
      e.dataTransfer.setData('text/x-row-index', String(index));
      e.dataTransfer.effectAllowed = 'copyMove';
    },
    onDragOver: (e) => {
      if (e.dataTransfer.types.includes('text/x-row-index')) {
        e.preventDefault();
        setDropHint(true);
      }
    },
    onDragLeave: () => setDropHint(false),
    onDrop: (e) => {
      setDropHint(false);
      const from = Number(e.dataTransfer.getData('text/x-row-index'));
      if (!Number.isNaN(from)) reorder(from, index);
    },
  } : {};

  return (
    <tr
      {...actions.dragProps}
      {...reorderProps}
      onDoubleClick={actions.play}
      className={`group border-b border-border/60 transition-colors ${isCurrent ? 'bg-accent/8' : 'hover:bg-bg-hover/60'} ${dropHint ? 'border-t-2 border-t-neon' : ''} ${highlight ? 'bg-neon/5' : ''}`}
    >
      <td className="pl-2 w-8 text-text-muted text-xs tabular">
        {reorder ? <FaGripVertical className="cursor-grab opacity-40 group-hover:opacity-100" aria-hidden /> : index + 1}
      </td>
      <td className="py-1.5 pr-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => (isCurrent ? usePlayerStore.getState().togglePlay() : actions.play())}
            aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
            className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden border-none p-0 bg-bg-hover"
          >
            {thumbnailSmall && <img src={thumbnailSmall} alt="" loading="lazy" className="w-full h-full object-cover" />}
            <span className={`absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isPlaying ? <FaVolumeUp className="text-accent" /> : isCurrent ? <FaPause /> : <FaPlay />}
            </span>
          </button>
          <button type="button" onClick={actions.openDetail} className="min-w-0 text-left bg-transparent border-none p-0">
            <p className={`text-sm truncate ${isCurrent ? 'text-accent' : 'text-text-primary'}`}>{title}</p>
            <p className="text-xs text-text-secondary truncate">{channel}</p>
          </button>
        </div>
      </td>
      <td className="px-2 text-right text-xs text-text-secondary tabular w-14">{duration ? formatTime(duration) : '—'}</td>
      <td className="px-2 text-right text-sm text-text-primary tabular w-16">
        {a?.bpm ? a.bpm.toFixed(1) : analyzing ? <span className="text-xs text-text-muted">…</span> : (
          <button type="button" onClick={actions.analyze} title="Analyze BPM & key" aria-label={`Analyze ${title}`} className="text-text-muted hover:text-neon bg-transparent border-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
            <FaWaveSquare />
          </button>
        )}
      </td>
      <td className="px-2 text-center w-14"><KeyBadge camelot={a?.camelot} keyName={a?.key} confidence={a?.keyConfidence} /></td>
      <td className="px-2 text-center w-20 hidden lg:table-cell"><QualityBadge grade={meta?.source?.grade} /></td>
      <td className="pl-2 pr-2 w-36">
        <div className="flex items-center justify-end gap-1">
          <DownloadButton song={song} compact />
          <TrackMenu song={song} onRemove={onRemove} />
        </div>
      </td>
    </tr>
  );
}

/**
 * DJ-style track table: BPM, Camelot key and source quality at a glance.
 * `matchFor` = {bpm, camelot} highlights harmonically compatible rows.
 */
function TrackTable({ songs, onRemove, reorder, matchFor }) {
  const meta = useTrackMetaStore((s) => s.meta);
  const keys = matchFor?.camelot ? compatibleKeys(matchFor.camelot) : [];

  return (
    <div className="overflow-x-auto rounded-(--radius-card) border border-border bg-bg-card">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-text-muted border-b border-border">
            <th className="pl-2 py-2 font-semibold">#</th>
            <th className="py-2 font-semibold">Track</th>
            <th className="px-2 py-2 font-semibold text-right">Time</th>
            <th className="px-2 py-2 font-semibold text-right">BPM</th>
            <th className="px-2 py-2 font-semibold text-center">Key</th>
            <th className="px-2 py-2 font-semibold text-center hidden lg:table-cell">Source</th>
            <th className="px-2 py-2"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song, i) => {
            const a = meta[song.id?.videoId]?.analysis;
            const highlight = matchFor && a && keys.includes(a.camelot) && bpmCompatible(matchFor.bpm, a.bpm);
            return (
              <Row
                key={song.id?.videoId || i}
                song={song}
                index={i}
                highlight={highlight}
                reorder={reorder}
                onRemove={onRemove ? () => onRemove(song) : undefined}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TrackTable;
