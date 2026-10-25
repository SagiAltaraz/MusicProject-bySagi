import { create } from 'zustand';
import api, { apiUrl } from '../lib/api';
import { load, save } from '../lib/storage';
import { toast } from './toastStore';

// Analysis (BPM, key, loudness) and source info per videoId, kept across sessions
// so the library shows BPM/Key columns for anything analysed or downloaded before.
const useTrackMetaStore = create((set, get) => ({
  meta: load('dj-track-meta', {}),
  analyzing: {}, // videoId -> true while running

  setMeta: (videoId, patch) => {
    const meta = { ...get().meta, [videoId]: { ...get().meta[videoId], ...patch } };
    // Keep storage bounded
    const keys = Object.keys(meta);
    if (keys.length > 3000) keys.slice(0, keys.length - 3000).forEach((k) => delete meta[k]);
    save('dj-track-meta', meta);
    set({ meta });
  },

  /** Fetch BPM/key/loudness without downloading a file. */
  analyze: async (videoId, { silent = false } = {}) => {
    if (get().analyzing[videoId]) return;
    set((s) => ({ analyzing: { ...s.analyzing, [videoId]: true } }));
    const done = () => set((s) => {
      const analyzing = { ...s.analyzing };
      delete analyzing[videoId];
      return { analyzing };
    });

    try {
      const { data } = await api.post('/analyze', { videoId });
      if (data.status === 'done') {
        get().setMeta(videoId, { analysis: data.analysis });
        return done();
      }
      await new Promise((resolve, reject) => {
        const es = new EventSource(apiUrl(`/downloads/${data.id}/events`));
        es.addEventListener('update', (e) => {
          const job = JSON.parse(e.data);
          if (job.source) get().setMeta(videoId, { source: job.source });
          if (job.status === 'done') {
            get().setMeta(videoId, { analysis: job.analysis });
            es.close();
            resolve();
          } else if (job.status === 'error' || job.status === 'cancelled') {
            es.close();
            reject(job.error || { message: 'Analysis cancelled' });
          }
        });
        es.onerror = () => {
          es.close();
          reject({ message: 'Lost connection to the server during analysis' });
        };
      });
    } catch (error) {
      if (!silent) toast({ tone: 'error', title: 'Analysis failed', message: error.message });
    } finally {
      done();
    }
  },
}));

export default useTrackMetaStore;
