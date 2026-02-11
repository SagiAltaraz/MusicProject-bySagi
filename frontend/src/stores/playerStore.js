import { create } from 'zustand';

const usePlayerStore = create((set, get) => ({
  // Current track
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 50,

  // Queue
  queue: [],
  queueIndex: -1,

  // Actions
  setTrack: (track) => {
    const { queue } = get();
    const existingIndex = queue.findIndex(
      (t) => t.id?.videoId === track.id?.videoId
    );

    if (existingIndex >= 0) {
      set({ currentTrack: track, queueIndex: existingIndex, isPlaying: false, progress: 0 });
    } else {
      const newQueue = [...queue, track];
      set({
        currentTrack: track,
        queue: newQueue,
        queueIndex: newQueue.length - 1,
        isPlaying: false,
        progress: 0,
      });
    }
  },

  setPlaying: (playing) => set({ isPlaying: playing }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),

  playNext: () => {
    const { queue, queueIndex } = get();
    if (queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      set({
        currentTrack: queue[nextIndex],
        queueIndex: nextIndex,
        isPlaying: false,
        progress: 0,
      });
    }
  },

  playPrevious: () => {
    const { queue, queueIndex } = get();
    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      set({
        currentTrack: queue[prevIndex],
        queueIndex: prevIndex,
        isPlaying: false,
        progress: 0,
      });
    }
  },

  addToQueue: (track) => {
    set((state) => ({ queue: [...state.queue, track] }));
  },

  clearQueue: () => set({ queue: [], queueIndex: -1 }),
}));

export default usePlayerStore;
