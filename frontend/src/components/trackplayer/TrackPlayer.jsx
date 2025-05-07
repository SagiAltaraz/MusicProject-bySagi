import React, { useState, useEffect, useRef } from 'react';
import './TrackPlayer.css';
import { FaPlay, FaStop, FaStepBackward, FaStepForward, FaRandom, FaRedo, FaMusic, FaVolumeUp } from 'react-icons/fa';

const TrackPlayer = ({ currentTrack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const playerRef = useRef(null);

  useEffect(() => {
    if (currentTrack && playerRef.current) {
      setIsPlaying(false);
      const videoId = currentTrack.id?.videoId;
      if (videoId) {
        playerRef.current.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1`;
      }
      setProgress(0);
    }
  }, [currentTrack]);

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      } else {
        playerRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleStop = () => {
    if (playerRef.current) {
      playerRef.current.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const handlePrevious = () => {
    console.log('Previous track');
  };

  const handleNext = () => {
    console.log('Next track');
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value;
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${newVolume * 100}]}`, '*');
    }
  };

  return (
    <div className="track-player-container">
      <div className="player-left">
        <FaMusic className="track-icon" />
        <span className="track-title">
          {currentTrack ? currentTrack.snippet.title : 'No Track Selected'}
        </span>
      </div>
      <div className="player-center">
        <div className="player-controls">
          <button className="control-button secondary" onClick={handlePrevious}>
            <FaStepBackward />
          </button>
          <button className="control-button play-stop" onClick={isPlaying ? handleStop : handlePlayPause}>
            {isPlaying ? <FaStop /> : <FaPlay />}
          </button>
          <button className="control-button secondary" onClick={handleNext}>
            <FaStepForward />
          </button>
          <button className="control-button secondary">
            <FaRandom />
          </button>
          <button className="control-button secondary">
            <FaRedo />
          </button>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          className="progress-bar"
        />
      </div>
      <div className="player-right">
        <FaVolumeUp className="volume-icon" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
        />
      </div>
      <iframe
        ref={playerRef}
        width="0"
        height="0"
        src=""
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

export default TrackPlayer;