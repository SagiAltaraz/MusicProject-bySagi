import { useEffect, useRef } from 'react';
import {
  FaPlay, FaPause, FaStepBackward, FaStepForward, FaVolumeUp, FaVolumeMute, FaVolumeDown,
  FaMusic, FaRandom, FaRedo, FaListUl,
} from 'react-icons/fa';
import usePlayerStore from '../../stores/playerStore';
import useUiStore from '../../stores/uiStore';
import { toast } from '../../stores/toastStore';
import { trackFields, formatTime } from '../../lib/format';
import { loadYouTubeApi, YT_ERRORS } from '../../lib/youtube';
import { IconButton } from '../ui/Button';
import DownloadButton from '../track/DownloadButton';

/** Thin range input with a gradient fill (keyboard and screen-reader friendly). */
function Slider({ value, max, onChange, label, valueText, className = '', fill = 'bg-linear-to-r from-accent to-neon' }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`relative h-1.5 bg-bg-hover rounded-full group ${className}`}>
      <div className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" style={{ left: `calc(${pct}% - 6px)` }} />
      <input
        type="range"
        min={0}
        max={max || 0}
        step="any"
        value={Math.min(value, max || 0)}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={valueText}
        className="absolute -inset-y-2 inset-x-0 w-full opacity-0 cursor-pointer"
      />
    </div>
  );
}

const TrackPlayer = () => {
  const mountRef = useRef(null);
  const yt = useRef(null);
  const readyRef = useRef(false);

  const {
    currentTrack, isPlaying, currentTime, duration, volume, muted, shuffle, repeat,
    playRequest, toggleRequest, seekRequest, queue, queueIndex,
    setPlaying, setTime, setVolume, toggleMute, toggleShuffle, cycleRepeat, playNext, playPrevious, seekTo, togglePlay,
  } = usePlayerStore();
  const queueOpen = useUiStore((s) => s.queueOpen);

  const videoId = currentTrack?.id?.videoId;
  const { title, channel, thumbnailSmall } = currentTrack ? trackFields(currentTrack) : {};

  // Create the hidden player once; tracks are swapped with loadVideoById
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || yt.current) return;
      yt.current = new YT.Player(mountRef.current, {
        height: '1',
        width: '1',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            readyRef.current = true;
            const s = usePlayerStore.getState();
            yt.current.setVolume(s.volume);
            if (s.muted) yt.current.mute();
            // Restore the last track without auto-playing it
            if (s.currentTrack) yt.current.cueVideoById(s.currentTrack.id.videoId);
          },
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) setPlaying(true);
            else if (e.data === S.PAUSED || e.data === S.CUED) setPlaying(false);
            else if (e.data === S.ENDED) {
              setPlaying(false);
              usePlayerStore.getState().playNext(true);
            }
          },
          onError: (e) => {
            const s = usePlayerStore.getState();
            toast({ tone: 'error', title: "Can't play this track here", message: `${YT_ERRORS[e.data] || 'Playback error.'} Skipping - you can still download it.` });
            if (s.queueIndex < s.queue.length - 1) s.playNext(true);
            else setPlaying(false);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      yt.current?.destroy();
      yt.current = null;
      readyRef.current = false;
    };
  }, [setPlaying]);

  // Commands from the store
  useEffect(() => {
    if (playRequest && readyRef.current && videoId) yt.current.loadVideoById(videoId);
  }, [playRequest]); // eslint-disable-line react-hooks/exhaustive-deps -- only a new request should (re)start playback

  useEffect(() => {
    if (!toggleRequest || !readyRef.current) return;
    const state = yt.current.getPlayerState();
    const S = window.YT.PlayerState;
    if (state === S.PLAYING || state === S.BUFFERING) yt.current.pauseVideo();
    else yt.current.playVideo();
  }, [toggleRequest]);

  useEffect(() => {
    if (seekRequest && readyRef.current) yt.current.seekTo(seekRequest.time, true);
  }, [seekRequest]);

  useEffect(() => {
    if (!readyRef.current) return;
    yt.current.setVolume(volume);
    if (muted) yt.current.mute();
    else yt.current.unMute();
  }, [volume, muted]);

  // Poll position while playing
  useEffect(() => {
    if (!isPlaying) return undefined;
    const id = setInterval(() => {
      if (!yt.current?.getCurrentTime) return;
      setTime(yt.current.getCurrentTime(), yt.current.getDuration());
    }, 250);
    return () => clearInterval(id);
  }, [isPlaying, setTime]);

  // Media Session: hardware media keys, headphones and the OS now-playing widget
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    const t = trackFields(currentTrack);
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: t.title,
      artist: t.channel,
      artwork: t.thumbnail ? [{ src: t.thumbnail, sizes: '480x360', type: 'image/jpeg' }] : [],
    });
    const handlers = {
      play: togglePlay,
      pause: togglePlay,
      previoustrack: playPrevious,
      nexttrack: () => playNext(),
      seekto: (d) => seekTo(d.seekTime),
    };
    for (const [action, fn] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, fn);
      } catch {
        // Action not supported by this browser
      }
    }
  }, [currentTrack, togglePlay, playPrevious, playNext, seekTo]);

  useEffect(() => {
    document.title = currentTrack && isPlaying ? `▶ ${title} · DJ Crate` : 'DJ Crate';
  }, [currentTrack, isPlaying, title]);

  const VolumeIcon = muted || volume === 0 ? FaVolumeMute : volume < 40 ? FaVolumeDown : FaVolumeUp;

  return (
    <footer className="h-20 bg-bg-secondary border-t border-border flex items-center px-3 sm:px-4 gap-3 sm:gap-4 shrink-0 z-50" aria-label="Player">
      {/* Track info */}
      <div className="flex items-center gap-3 w-44 sm:w-64 min-w-0">
        {thumbnailSmall ? (
          <button type="button" onClick={() => useUiStore.getState().openDetail(currentTrack)} aria-label="Track details" className="p-0 border-none bg-transparent shrink-0">
            <img src={thumbnailSmall} alt="" className={`w-12 h-12 rounded-lg object-cover ${isPlaying ? 'ring-2 ring-accent/60' : ''}`} />
          </button>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-bg-card flex items-center justify-center shrink-0">
            <FaMusic className="text-text-muted" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate" title={title}>{title || 'Nothing playing'}</p>
          <p className="text-xs text-text-secondary truncate">{channel || 'Pick a track to preview'}</p>
        </div>
      </div>

      {/* Transport + progress */}
      <div className="flex-1 flex flex-col items-center gap-1.5 max-w-3xl mx-auto min-w-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <IconButton size="sm" label={shuffle ? 'Shuffle on' : 'Shuffle off'} active={shuffle} onClick={toggleShuffle} className="hidden sm:inline-flex"><FaRandom /></IconButton>
          <IconButton size="sm" label="Previous" onClick={playPrevious} disabled={!currentTrack}><FaStepBackward /></IconButton>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-accent hover:bg-accent-hover disabled:bg-bg-hover disabled:text-text-muted border-none text-white transition-colors shadow-lg shadow-accent/20"
          >
            {isPlaying ? <FaPause className="text-sm" /> : <FaPlay className="text-sm ml-0.5" />}
          </button>
          <IconButton size="sm" label="Next" onClick={() => playNext()} disabled={!currentTrack || (queueIndex >= queue.length - 1 && repeat === 'off' && !shuffle)}><FaStepForward /></IconButton>
          <IconButton size="sm" label={`Repeat: ${repeat}`} active={repeat !== 'off'} onClick={cycleRepeat} className="relative hidden sm:inline-flex">
            <FaRedo />
            {repeat === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-accent">1</span>}
          </IconButton>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[11px] text-text-muted w-11 text-right tabular">{formatTime(currentTime)}</span>
          <Slider
            value={currentTime}
            max={duration}
            onChange={seekTo}
            label="Seek"
            valueText={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            className="flex-1"
          />
          <span className="text-[11px] text-text-muted w-11 tabular">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 justify-end sm:w-64">
        {currentTrack && <div className="hidden md:block"><DownloadButton song={currentTrack} compact /></div>}
        <IconButton size="sm" label="Queue" active={queueOpen} onClick={() => useUiStore.getState().toggleQueue()}><FaListUl /></IconButton>
        <IconButton size="sm" label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}><VolumeIcon /></IconButton>
        <Slider
          value={muted ? 0 : volume}
          max={100}
          onChange={(v) => {
            setVolume(Math.round(v));
            if (muted) toggleMute();
          }}
          label="Volume"
          valueText={`${muted ? 0 : volume}%`}
          className="w-20 hidden sm:block"
          fill="bg-text-secondary"
        />
      </div>

      {/* Hidden YouTube player - must stay rendered (not display:none) for playback */}
      <div className="fixed -left-[9999px] top-0 w-px h-px overflow-hidden" aria-hidden>
        <div ref={mountRef} />
      </div>
    </footer>
  );
};

export default TrackPlayer;
