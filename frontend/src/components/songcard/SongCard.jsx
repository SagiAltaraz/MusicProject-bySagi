import React, { useState, useEffect } from 'react';
import './SongCard.css';
import { FaPlay, FaDownload, FaSpinner } from 'react-icons/fa';

function decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function SongCard({ song, onPlayTrack }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // איפוס סטייט כששיר חדש נטען
  useEffect(() => {
    setIsDownloading(false);
    setDownloadSuccess(false);
  }, [song]);

  if (!song || !song.snippet || !song.snippet.thumbnails) {
    return (
      <div className="error-container">
        <div className="error">Invalid song data</div>
      </div>
    );
  }

  const thumbnailUrl =
    song.snippet.thumbnails.maxres?.url ||
    song.snippet.thumbnails.high?.url ||
    song.snippet.thumbnails.medium?.url ||
    song.snippet.thumbnails.default?.url;

  const videoUrl = song.id?.videoId
    ? `https://www.youtube.com/watch?v=${song.id.videoId}`
    : "#";

  const handleDownload = () => {
  if (isDownloading || downloadSuccess) return;

  setIsDownloading(true);

  const videoId = song.id.videoId;
  const rawTitle = song.snippet.title || "Unknown Song";
  const rawChannel = song.snippet.channelTitle || "Unknown Artist";

  const cleanChannel = rawChannel.replace(/ - Topic$/i, "").trim();
  let artist = cleanChannel;
  let title = rawTitle;

  if (rawTitle.includes(" - ")) {
    const parts = rawTitle.split(" - ");
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }

  const safeFilename = `${artist} - ${title}`.replace(/[\/\\|*?"<>]/g, "").trim();

  const url = `http://localhost:3035/downloadSong?videoId=${encodeURIComponent(
    videoId
  )}&title=${encodeURIComponent(safeFilename)}&quality=high`;

  // יצירת לינק והורדה
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename + ".mp3";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Spin לזמן קצר (לדוגמה 2 שניות)
  setTimeout(() => {
    setIsDownloading(false);
    setDownloadSuccess(true); // הופך לירוק אחרי "הורדה"
  }, 2000);
};


  const handlePlay = () => {
    onPlayTrack(song);
  };

  return (
    <div className="song-card">
      <div className="thumbnail-container">
        <a href={videoUrl} target="_blank" rel="noopener noreferrer">
          <img src={thumbnailUrl} alt={song.snippet.title} className="thumbnail" />
        </a>
      </div>

      <div className="song-card-info">
        <h3 className="song-title">{decodeHtml(song.snippet.title)}</h3>
        <p className="channel-name">{decodeHtml(song.snippet.channelTitle)}</p>
      </div>

      <div className="action-buttons">
        <button className="play-button" aria-label="Play" onClick={handlePlay}>
          <FaPlay />
        </button>

        <button
          className={`download-button ${isDownloading ? "downloading" : ""} ${downloadSuccess ? "download-success" : ""}`}
          aria-label="Download"
          onClick={handleDownload}
        >
          {isDownloading ? <FaSpinner className="spin" /> : <FaDownload />}
        </button>
      </div>
    </div>
  );
}

export default SongCard;
