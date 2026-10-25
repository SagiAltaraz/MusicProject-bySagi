import { FaPlay, FaPause } from 'react-icons/fa';
import { motion } from 'framer-motion';
import usePlayerStore from '../../stores/playerStore';
import useTrackMetaStore from '../../stores/trackMetaStore';
import useTrackActions from '../../hooks/useTrackActions';
import { trackFields, formatTime } from '../../lib/format';
import { Badge, KeyBadge, QualityBadge } from '../ui/Badge';
import DownloadButton from '../track/DownloadButton';
import TrackMenu from '../track/TrackMenu';

function SongCard({ song, onRemove }) {
  const { videoId, title, channel, duration, thumbnail } = trackFields(song);
  const actions = useTrackActions(song);
  const isCurrent = usePlayerStore((s) => s.currentTrack?.id?.videoId === videoId);
  const isPlaying = usePlayerStore((s) => s.isPlaying) && isCurrent;
  const meta = useTrackMetaStore((s) => s.meta[videoId]);
  const analyzing = useTrackMetaStore((s) => s.analyzing[videoId]);

  if (!videoId || !thumbnail) return null;
  const a = meta?.analysis;

  const togglePlay = (e) => {
    e.stopPropagation();
    if (isCurrent) usePlayerStore.getState().togglePlay();
    else actions.play();
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      {...actions.dragProps}
      onDoubleClick={actions.play}
      className={`group relative bg-bg-card rounded-(--radius-card) border transition-all duration-300 hover:shadow-[0_8px_30px_var(--color-accent-glow)]
        ${isCurrent ? 'border-accent/60' : 'border-border hover:border-accent/40'}`}
    >
      {/* Only the artwork clips - the card itself must not, or the ⋯ menu gets cut off */}
      <div className="relative aspect-video overflow-hidden rounded-t-(--radius-card) bg-bg-hover">
        <img src={thumbnail} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 focus-visible:bg-black/40 transition-all duration-300 border-none"
        >
          <span className={`w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/30 transition-all duration-300
            ${isCurrent ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}`}
          >
            {isPlaying ? <FaPause className="text-white text-sm" /> : <FaPlay className="text-white text-sm ml-0.5" />}
          </span>
        </button>
        {duration > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-[11px] font-medium text-white tabular">{formatTime(duration)}</span>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          {a?.bpm && <Badge className="bg-black/75! text-white!">{Math.round(a.bpm)} BPM</Badge>}
          {a?.camelot && <KeyBadge camelot={a.camelot} keyName={a.key} confidence={a.keyConfidence} />}
          {analyzing && <Badge className="bg-black/75! text-white!">Analysing…</Badge>}
        </div>
      </div>

      <div className="p-3">
        <button type="button" onClick={actions.openDetail} className="block w-full text-left bg-transparent border-none p-0">
          <h3 className="text-sm font-medium text-text-primary line-clamp-2 leading-snug mb-1 hover:text-accent transition-colors">{title}</h3>
        </button>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs text-text-secondary truncate flex-1">{channel}</p>
          <QualityBadge grade={meta?.source?.grade} />
        </div>
        <div className="flex items-center gap-2">
          <DownloadButton song={song} />
          <TrackMenu song={song} onRemove={onRemove} side="top" />
        </div>
      </div>
    </motion.article>
  );
}

export default SongCard;
