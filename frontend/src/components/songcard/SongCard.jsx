import React from 'react';
import './SongCard.css';
import { FaPlay, FaDownload } from 'react-icons/fa';

function SongCard({ song }) {
  if (!song || !song.snippet || !song.snippet.thumbnails) {
    return (
      <div className="error-container">
        <div className="error">Invalid song data</div>
      </div>
    );
  }

  // Determine the best thumbnail to display
  const thumbnailUrl =
    song.snippet.thumbnails.maxres?.url ||
    song.snippet.thumbnails.high?.url ||
    song.snippet.thumbnails.medium?.url ||
    song.snippet.thumbnails.default?.url;

  // Construct the YouTube video URL
  const videoUrl = song.id?.videoId
    ? `https://www.youtube.com/watch?v=${song.id.videoId}`
    : "#";

  // Handle download logic
  const handleDownload = () => {
    const videoId = song.id.videoId;
    const title = song.snippet.title;
    if (!videoId) {
      console.error("No video ID available for download");
      return;
    }

    console.log("Starting download for:", videoId, "as", title);
    const url = `http://localhost:3000/downloadSong?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", ""); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="song-card">
      <div className="song-video">
        <a href={videoUrl} target="_blank" rel="noopener noreferrer">
          <img src={thumbnailUrl} alt={song.snippet.title} className="thumbnail" />
        </a>
      </div>
      <div className="title">
        <h3>{song.snippet.title || "Unknown Title"}</h3>
        <p>{song.snippet.channelTitle || "Unknown Channel"}</p>
      </div>
      <div className="buttons-container">
        <button className="play-button" aria-label="Play">
          <FaPlay />
        </button>
        <button className="download-button" aria-label="Download" onClick={handleDownload}>
          <FaDownload />
        </button>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="playYoutube-button">
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}

export default SongCard;
