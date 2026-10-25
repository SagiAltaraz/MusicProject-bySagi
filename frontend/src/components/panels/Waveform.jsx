import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { FaPlay, FaPause } from 'react-icons/fa';
import { formatTime } from '../../lib/format';
import usePlayerStore from '../../stores/playerStore';

/** Waveform + preview of the actual downloaded file (what will play on the CDJ). */
function Waveform({ url }) {
  const ref = useRef(null);
  const ws = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const instance = WaveSurfer.create({
      container: ref.current,
      url,
      height: 64,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      cursorWidth: 1,
      waveColor: css.getPropertyValue('--color-border-light').trim() || '#3a3a41',
      progressColor: css.getPropertyValue('--color-accent').trim() || '#ff6b35',
      cursorColor: css.getPropertyValue('--color-neon').trim() || '#00d4ff',
      normalize: false, // show the real dynamics, not a stretched picture
    });
    ws.current = instance;
    instance.on('ready', (d) => setDuration(d));
    instance.on('timeupdate', setTime);
    instance.on('play', () => {
      setPlaying(true);
      // Don't play two things at once
      if (usePlayerStore.getState().isPlaying) usePlayerStore.getState().togglePlay();
    });
    instance.on('pause', () => setPlaying(false));
    instance.on('error', () => setError('Could not load the file (it may have been moved).'));
    return () => instance.destroy();
  }, [url]);

  if (error) return <p className="text-xs text-text-muted">{error}</p>;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => ws.current?.playPause()}
        aria-label={playing ? 'Pause file preview' : 'Play downloaded file'}
        className="w-9 h-9 shrink-0 rounded-full bg-neon/15 text-neon hover:bg-neon/25 border-none flex items-center justify-center"
      >
        {playing ? <FaPause className="text-xs" /> : <FaPlay className="text-xs ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div ref={ref} className="w-full" />
        <div className="flex justify-between text-[10px] text-text-muted tabular mt-0.5">
          <span>{formatTime(time)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export default Waveform;
