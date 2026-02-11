import { useEffect, useRef, useCallback } from 'react';
import {
  FaPlay, FaPause, FaStepBackward, FaStepForward,
  FaVolumeUp, FaVolumeMute, FaMusic,
} from 'react-icons/fa';
import usePlayerStore from '../../stores/playerStore';

function decodeHtml(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TrackPlayer = () => {
  const playerRef = useRef(null);
  const ytPlayer = useRef(null);
  const progressInterval = useRef(null);

  const {
    currentTrack, isPlaying, progress, duration, volume,
    setPlaying, setProgress, setDuration, setVolume,
    playNext, playPrevious, queue, queueIndex,
  } = usePlayerStore();

  const createPlayer = useCallback(() => {
    if (ytPlayer.current) {
      ytPlayer.current.destroy();
      ytPlayer.current = null;
    }

    ytPlayer.current = new window.YT.Player(playerRef.current, {
      videoId: currentTrack.id?.videoId || '',
      height: '0',
      width: '0',
      playerVars: { autoplay: 0, controls: 0, enablejsapi: 1, origin: window.location.origin },
      events: {
        onReady: (e) => {
          setDuration(e.target.getDuration());
          e.target.setVolume(volume);
          setPlaying(false);
          setProgress(0);
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.PLAYING) {
            setPlaying(true);
            startProgressTracking();
          } else if (e.data === window.YT.PlayerState.PAUSED) {
            setPlaying(false);
            stopProgressTracking();
          } else if (e.data === window.YT.PlayerState.ENDED) {
            setPlaying(false);
            stopProgressTracking();
            playNext();
          }
        },
      },
    });
  }, [currentTrack, volume, setDuration, setPlaying, setProgress, playNext]);

  const startProgressTracking = () => {
    stopProgressTracking();
    progressInterval.current = setInterval(() => {
      if (ytPlayer.current?.getCurrentTime && ytPlayer.current?.getDuration) {
        const current = ytPlayer.current.getCurrentTime();
        const total = ytPlayer.current.getDuration();
        if (total) {
          setProgress((current / total) * 100);
          setDuration(total);
        }
      }
    }, 250);
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  useEffect(() => {
    if (!currentTrack) return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => createPlayer();
    } else {
      createPlayer();
    }

    return () => stopProgressTracking();
  }, [currentTrack, createPlayer]);

  const handlePlayPause = () => {
    if (!ytPlayer.current) return;
    const state = ytPlayer.current.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING || state === window.YT.PlayerState.BUFFERING) {
      ytPlayer.current.pauseVideo();
    } else {
      ytPlayer.current.playVideo();
    }
  };

  const handleProgressChange = (e) => {
    const val = Number(e.target.value);
    setProgress(val);
    if (ytPlayer.current && duration) {
      ytPlayer.current.seekTo((val / 100) * duration, true);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (ytPlayer.current) ytPlayer.current.setVolume(vol);
  };

  const currentTime = duration ? (progress / 100) * duration : 0;
  const title = currentTrack ? decodeHtml(currentTrack.snippet.title) : '';
  const channel = currentTrack ? decodeHtml(currentTrack.snippet.channelTitle) : '';
  const thumbnail = currentTrack?.snippet?.thumbnails?.default?.url;

  return (
    <div className="h-20 bg-bg-secondary border-t border-border flex items-center px-4 gap-4 shrink-0 z-50">
      {/* Left - Track Info */}
      <div className="flex items-center gap-3 w-60 min-w-0">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-bg-card flex items-center justify-center shrink-0">
            <FaMusic className="text-text-muted" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {title || 'No track selected'}
          </p>
          <p className="text-xs text-text-secondary truncate">{channel}</p>
        </div>
      </div>

      {/* Center - Controls + Progress */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={playPrevious}
            disabled={queueIndex <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent border-none text-text-secondary hover:text-text-primary disabled:text-text-muted disabled:cursor-default cursor-pointer transition-colors"
          >
            <FaStepBackward className="text-sm" />
          </button>
          <button
            onClick={handlePlayPause}
            disabled={!currentTrack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-accent hover:bg-accent-hover disabled:bg-bg-hover disabled:text-text-muted border-none text-white cursor-pointer disabled:cursor-default transition-all duration-200 shadow-lg shadow-accent/20"
          >
            {isPlaying ? <FaPause className="text-sm" /> : <FaPlay className="text-sm ml-0.5" />}
          </button>
          <button
            onClick={playNext}
            disabled={queueIndex >= queue.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent border-none text-text-secondary hover:text-text-primary disabled:text-text-muted disabled:cursor-default cursor-pointer transition-colors"
          >
            <FaStepForward className="text-sm" />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full">
          <span className="text-[10px] text-text-muted w-10 text-right">{formatTime(currentTime)}</span>
          <div className="relative flex-1 h-1 bg-bg-hover rounded-full group cursor-pointer">
            <div
              className="absolute h-full bg-linear-to-r from-accent to-neon rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0} max={100} step={0.1}
              value={progress}
              onChange={handleProgressChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          <span className="text-[10px] text-text-muted w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right - Volume */}
      <div className="flex items-center gap-2 w-40 justify-end">
        <button
          onClick={() => {
            const newVol = volume > 0 ? 0 : 50;
            setVolume(newVol);
            if (ytPlayer.current) ytPlayer.current.setVolume(newVol);
          }}
          className="bg-transparent border-none text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        >
          {volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        <div className="relative flex-1 h-1 bg-bg-hover rounded-full group cursor-pointer">
          <div
            className="absolute h-full bg-text-secondary rounded-full"
            style={{ width: `${volume}%` }}
          />
          <input
            type="range"
            min={0} max={100} step={1}
            value={volume}
            onChange={handleVolumeChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Hidden YouTube player */}
      <div style={{ display: 'none' }}>
        <div ref={playerRef} />
      </div>
    </div>
  );
};

export default TrackPlayer;
