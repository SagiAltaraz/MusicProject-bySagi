import React from 'react';
import './SongCard.css';
import { FaPlay, FaDownload } from 'react-icons/fa';

function SongCard({ song, onPlayTrack }) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  if (!song?.snippet?.thumbnails || !song.id?.videoId) {
    return null;
  }

  const rawTitle = song.snippet.title || 'Unknown Song';
  const rawChannel = song.snippet.channelTitle || 'Unknown Artist';

  // CLEAN CHANNEL: Remove " - Topic", "VEVO", etc.
  const cleanChannel = rawChannel
    .replace(/ - Topic$/i, '')
    .replace(/ \(Official\)$/i, '')
    .replace(/ VEVO$/i, '')
    .replace(/ - [A-Z0-9]{10,}$/i, '') // removes upload codes
    .trim();

  // CLEAN TITLE: Extract real title if it contains " - " (Artist - Title format)
  let artist = cleanChannel;
  let title = rawTitle;

  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  // Final safe filename
  const safeFilename = `${artist} - ${title}.mp3`.replace(/[\/\\|*?"<>]/g, '');

  const thumb = song.snippet.thumbnails.high?.url || song.snippet.thumbnails.default?.url;

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const url = `/downloadSong?videoId=${song.id.videoId}&title=${encodeURIComponent(rawTitle)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = safeFilename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert('Download failed — server offline?');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="song-card">
      <div className="thumbnail-container">
        <a href={`https://www.youtube.com/watch?v=${song.id.videoId}`} target="_blank" rel="noopener noreferrer">
          <img src={thumb} alt={rawTitle} className="thumbnail" loading="lazy" />
        </a>
      </div>

      <div className="song-card-info">
        <h3 className="song-title">{rawTitle}</h3>
        <p className="channel-name">{cleanChannel}</p>
      </div>

      <div className="action-buttons">
        <button onClick={() => onPlayTrack(song)} className="play-button" title="Play">
          <FaPlay />
        </button>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="download-button"
          title={isDownloading ? "Downloading..." : "Download MP3"}
          style={{ opacity: isDownloading ? 0.5 : 1 }}
        >
          {isDownloading ? 'Downloading' : <FaDownload />}
        </button>
      </div>
    </div>
  );
}

export default SongCard;