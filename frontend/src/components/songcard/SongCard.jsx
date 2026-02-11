import { useState } from 'react';
import { FaPlay, FaDownload, FaSpinner, FaCheck, FaPlus } from 'react-icons/fa';
import { motion } from 'framer-motion';
import usePlayerStore from '../../stores/playerStore';
import useCrateStore from '../../stores/crateStore';
import API_BASE_URL from '../../config/api';

function decodeHtml(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function SongCard({ song, showRemove, onRemove }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [showCrateMenu, setShowCrateMenu] = useState(false);

  const setTrack = usePlayerStore((s) => s.setTrack);
  const { crates, addTrack, isTrackSaved } = useCrateStore();

  if (!song?.snippet?.thumbnails) return null;

  const title = decodeHtml(song.snippet.title);
  const channel = decodeHtml(song.snippet.channelTitle);
  const videoId = song.id?.videoId;
  const isSaved = isTrackSaved(videoId);

  const thumbnailUrl =
    song.snippet.thumbnails.high?.url ||
    song.snippet.thumbnails.medium?.url ||
    song.snippet.thumbnails.default?.url;

  const handlePlay = () => setTrack(song);

  const handleDownload = () => {
    if (isDownloading || downloadDone) return;
    setIsDownloading(true);

    const rawChannel = channel.replace(/ - Topic$/i, '').trim();
    let artist = rawChannel;
    let trackTitle = title;

    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      artist = parts[0].trim();
      trackTitle = parts.slice(1).join(' - ').trim();
    }

    const safeFilename = `${artist} - ${trackTitle}`.replace(/[/\\|*?"<>]/g, '').trim();
    const url = `${API_BASE_URL}/downloadSong?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(safeFilename)}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename + '.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
      setDownloadDone(true);
    }, 3000);
  };

  const handleAddToCrate = (crateId) => {
    addTrack(crateId, song);
    setShowCrateMenu(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-bg-card rounded-xl overflow-hidden border border-border hover:border-accent/40 transition-all duration-300 hover:shadow-[0_8px_30px_var(--color-accent-glow)]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Play overlay */}
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300 border-none cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg shadow-accent/30">
            <FaPlay className="text-white text-sm ml-0.5" />
          </div>
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-text-primary line-clamp-2 leading-snug mb-1">
          {title}
        </h3>
        <p className="text-xs text-text-secondary truncate mb-3">{channel}</p>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 border-none cursor-pointer
              ${downloadDone
                ? 'bg-success/20 text-success'
                : isDownloading
                  ? 'bg-bg-hover text-text-muted cursor-wait'
                  : 'bg-bg-hover text-text-secondary hover:bg-accent hover:text-white'
              }`}
          >
            {downloadDone ? <FaCheck /> : isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
            {downloadDone ? 'Done' : isDownloading ? 'Downloading...' : 'Download'}
          </button>

          {/* Add to Crate */}
          <div className="relative">
            <button
              onClick={() => setShowCrateMenu(!showCrateMenu)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 border-none cursor-pointer text-xs
                ${isSaved
                  ? 'bg-neon/20 text-neon'
                  : 'bg-bg-hover text-text-muted hover:text-neon hover:bg-neon/10'
                }`}
              title="Add to Crate"
            >
              <FaPlus />
            </button>

            {showCrateMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 py-1 animate-[slide-up_0.15s_ease-out]">
                {crates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-text-muted">No crates yet</div>
                ) : (
                  crates.map((crate) => (
                    <button
                      key={crate.id}
                      onClick={() => handleAddToCrate(crate.id)}
                      className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors bg-transparent border-none cursor-pointer"
                    >
                      {crate.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Remove button (for crate view) */}
          {showRemove && (
            <button
              onClick={onRemove}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-hover text-danger/70 hover:bg-danger/20 hover:text-danger transition-all duration-200 border-none cursor-pointer text-xs"
              title="Remove from Crate"
            >
              &times;
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default SongCard;
