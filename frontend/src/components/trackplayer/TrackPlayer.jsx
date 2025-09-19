import React, { useState, useEffect, useRef } from 'react';
import './TrackPlayer.css';
import {
  FaPlay,
  FaStop,
  FaStepBackward,
  FaStepForward,
  FaRandom,
  FaRedo,
  FaMusic,
  FaVolumeUp,
} from 'react-icons/fa';

const TrackPlayer = ({ currentTrack }) => {
  const playerRef = useRef(null);
  const ytPlayer = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // אחוזי התקדמות 0-100
  const [duration, setDuration] = useState(0); // זמן כולל בשניות
  const [volume, setVolume] = useState(50); // 0-100

  // אתחול נגן כשיש שיר חדש
  useEffect(() => {
    if (!currentTrack) return;

    // טען API רק פעם אחת
    if (!window.YT) {
      // טען סקריפט של YouTube API דינמית
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    } else {
      createPlayer();
    }

    function createPlayer() {
      if (ytPlayer.current) {
        ytPlayer.current.destroy();
        ytPlayer.current = null;
      }

      ytPlayer.current = new window.YT.Player(playerRef.current, {
        videoId: currentTrack.id?.videoId || '',
        height: '0',
        width: '0',
        playerVars: {
          autoplay: 0,
          controls: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    }

    function onPlayerReady(event) {
      setDuration(event.target.getDuration());
      event.target.setVolume(volume);
      setIsPlaying(false);
      setProgress(0);
    }

    function onPlayerStateChange(event) {
      if (event.data === window.YT.PlayerState.PLAYING) {
        setIsPlaying(true);
        // עדכון פרוגרס בזמן הניגון
        updateProgress();
      } else if (
        event.data === window.YT.PlayerState.PAUSED ||
        event.data === window.YT.PlayerState.ENDED
      ) {
        setIsPlaying(false);
      }
    }

    // פונקציה שמעדכנת את הסליידר כל 500ms
    function updateProgress() {
      if (!ytPlayer.current) return;
      if (ytPlayer.current.getPlayerState() !== window.YT.PlayerState.PLAYING)
        return;

      const currentTime = ytPlayer.current.getCurrentTime();
      const totalDuration = ytPlayer.current.getDuration();
      if (totalDuration) {
        const progressPercent = (currentTime / totalDuration) * 100;
        setProgress(progressPercent);
        setDuration(totalDuration);
      }

      // קרא שוב אחרי חצי שנייה
      setTimeout(updateProgress, 500);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // פונקציות ניגון
  const handlePlayPause = () => {
    if (!ytPlayer.current) return;

    const playerState = ytPlayer.current.getPlayerState();

    if (
      playerState === window.YT.PlayerState.PLAYING ||
      playerState === window.YT.PlayerState.BUFFERING
    ) {
      ytPlayer.current.pauseVideo();
    } else {
      ytPlayer.current.playVideo();
    }
  };

  const handleStop = () => {
    if (!ytPlayer.current) return;
    ytPlayer.current.stopVideo();
    setProgress(0);
    setIsPlaying(false);
  };

  // פונקציות ריקות לעתיד
  const handlePrevious = () => {
    console.log('Previous track');
  };
  const handleNext = () => {
    console.log('Next track');
  };

  // שינוי עוצמת קול
  const handleVolumeChange = (e) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (ytPlayer.current) {
      ytPlayer.current.setVolume(vol);
    }
  };

  // שינוי פרוגרס (גרירת הסליידר)
  const handleProgressChange = (e) => {
    const val = Number(e.target.value);
    setProgress(val);
    if (ytPlayer.current && duration) {
      const seekToTime = (val / 100) * duration;
      ytPlayer.current.seekTo(seekToTime, true);
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
          <button
            className="control-button play-stop"
            onClick={isPlaying ? handleStop : handlePlayPause}
          >
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
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleProgressChange}
          className="progress-bar"
        />
      </div>
      <div className="player-right">
        <FaVolumeUp className="volume-icon" />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
        />
      </div>
      {/* iframe לשימוש ה־YouTube API */}
      <div style={{ display: 'none' }}>
        <div id="youtube-player" ref={playerRef} />
      </div>
    </div>
  );
};

export default TrackPlayer;
