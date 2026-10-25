import { create } from 'zustand';
import { load, save } from '../lib/storage';

const idOf = (t) => t?.id?.videoId;
const persistQueue = (queue, queueIndex) => save('dj-queue', { queue: queue.slice(0, 200), queueIndex });
const savedQueue = load('dj-queue', { queue: [], queueIndex: -1 });

const usePlayerStore = create((set, get) => ({
  currentTrack: savedQueue.queue[savedQueue.queueIndex] || null,
  isPlaying: false,
  // Seconds, not percent - the player is the source of truth
  currentTime: 0,
  duration: 0,
  volume: load('dj-volume', 70),
  muted: false,
  // Commands for the YouTube player component, bumped so the same command can repeat:
  // playRequest = (re)start currentTrack, toggleRequest = play/pause, seekRequest = {time, n}
  playRequest: 0,
  toggleRequest: 0,
  seekRequest: null,

  queue: savedQueue.queue,
  queueIndex: savedQueue.queueIndex,
  shuffle: false,
  repeat: 'off', // 'off' | 'all' | 'one'
  history: load('dj-history', []),

  /** Play a track now. Adds it after the current one if it isn't queued. */
  playTrack: (track) => {
    const { queue, queueIndex } = get();
    let idx = queue.findIndex((t) => idOf(t) === idOf(track));
    let newQueue = queue;
    if (idx < 0) {
      idx = queueIndex + 1;
      newQueue = [...queue.slice(0, idx), track, ...queue.slice(idx)];
    }
    set({ currentTrack: track, queue: newQueue, queueIndex: idx, currentTime: 0, playRequest: get().playRequest + 1 });
    persistQueue(newQueue, idx);
    get().addHistory(track);
  },

  /** Replace the queue with a list (crate, results) and start at index. */
  playList: (tracks, start = 0) => {
    if (!tracks.length) return;
    set({ queue: tracks, queueIndex: start, currentTrack: tracks[start], currentTime: 0, playRequest: get().playRequest + 1 });
    persistQueue(tracks, start);
    get().addHistory(tracks[start]);
  },

  addToQueue: (track) => {
    const { queue, queueIndex } = get();
    if (queue.some((t) => idOf(t) === idOf(track))) return false;
    const newQueue = [...queue, track];
    set({ queue: newQueue });
    persistQueue(newQueue, queueIndex);
    return true;
  },

  playNextInQueue: (track) => {
    const { queue, queueIndex } = get();
    const without = queue.filter((t) => idOf(t) !== idOf(track));
    const at = Math.min(without.findIndex((t) => idOf(t) === idOf(get().currentTrack)) + 1, without.length);
    const newQueue = [...without.slice(0, at), track, ...without.slice(at)];
    const newIndex = newQueue.findIndex((t) => idOf(t) === idOf(get().currentTrack));
    set({ queue: newQueue, queueIndex: newIndex >= 0 ? newIndex : queueIndex });
    persistQueue(newQueue, newIndex);
  },

  removeFromQueue: (videoId) => {
    const { queue, currentTrack } = get();
    const newQueue = queue.filter((t) => idOf(t) !== videoId);
    const newIndex = newQueue.findIndex((t) => idOf(t) === idOf(currentTrack));
    set({ queue: newQueue, queueIndex: newIndex });
    persistQueue(newQueue, newIndex);
  },

  moveInQueue: (from, to) => {
    const { queue, currentTrack } = get();
    if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
    const newQueue = [...queue];
    const [moved] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, moved);
    const newIndex = newQueue.findIndex((t) => idOf(t) === idOf(currentTrack));
    set({ queue: newQueue, queueIndex: newIndex });
    persistQueue(newQueue, newIndex);
  },

  clearQueue: () => {
    const { currentTrack } = get();
    const queue = currentTrack ? [currentTrack] : [];
    set({ queue, queueIndex: currentTrack ? 0 : -1 });
    persistQueue(queue, currentTrack ? 0 : -1);
  },

  togglePlay: () => {
    if (get().currentTrack) set((s) => ({ toggleRequest: s.toggleRequest + 1 }));
  },
  seekTo: (time) => set((s) => ({ currentTime: time, seekRequest: { time, n: (s.seekRequest?.n || 0) + 1 } })),
  seekBy: (delta) => {
    const { currentTime, duration } = get();
    get().seekTo(Math.max(0, Math.min(duration || Infinity, currentTime + delta)));
  },

  setPlaying: (isPlaying) => set({ isPlaying }),
  setTime: (currentTime, duration) => set(duration ? { currentTime, duration } : { currentTime }),
  setVolume: (volume) => {
    set({ volume, muted: volume === 0 });
    save('dj-volume', volume);
  },
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set((s) => ({ repeat: { off: 'all', all: 'one', one: 'off' }[s.repeat] })),

  /** Advance. `auto` = the track ended on its own (respects repeat-one). */
  playNext: (auto = false) => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (!queue.length) return;
    if (auto && repeat === 'one') {
      set({ currentTime: 0, playRequest: get().playRequest + 1 });
      return;
    }
    let next = queueIndex + 1;
    if (shuffle && queue.length > 1) {
      do next = Math.floor(Math.random() * queue.length); while (next === queueIndex);
    }
    if (next >= queue.length) {
      if (repeat !== 'all') return set({ isPlaying: false });
      next = 0;
    }
    set({ currentTrack: queue[next], queueIndex: next, currentTime: 0, playRequest: get().playRequest + 1 });
    persistQueue(queue, next);
    get().addHistory(queue[next]);
  },

  playPrevious: () => {
    const { queue, queueIndex, currentTime } = get();
    // Like every player: restart the track first if it's past the first few seconds
    if (currentTime > 4 || queueIndex <= 0) {
      set({ currentTime: 0, playRequest: get().playRequest + 1 });
      return;
    }
    const prev = queueIndex - 1;
    set({ currentTrack: queue[prev], queueIndex: prev, currentTime: 0, playRequest: get().playRequest + 1 });
    persistQueue(queue, prev);
  },

  addHistory: (track) => {
    const history = [track, ...get().history.filter((t) => idOf(t) !== idOf(track))].slice(0, 30);
    set({ history });
    save('dj-history', history);
  },
}));

export default usePlayerStore;
