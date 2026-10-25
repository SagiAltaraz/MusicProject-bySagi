import { create } from 'zustand';
import api, { apiUrl, isLocalBackend } from '../lib/api';
import { trackFields } from '../lib/format';
import { load, save } from '../lib/storage';
import { toast } from './toastStore';
import useTrackMetaStore from './trackMetaStore';
import useUiStore from './uiStore';
import { DOWNLOAD_FORMATS } from './settingsStore';

const streams = new Map(); // jobId -> EventSource
const FINISHED = ['done', 'error', 'cancelled'];

// Saved files survive reloads so crates can export M3U / Rekordbox XML with real paths
const persistFiles = (files) => save('dj-downloaded-files', files);

const useDownloadStore = create((set, get) => ({
  jobs: {}, // jobId -> job (with `track` for display)
  order: [], // newest first
  files: load('dj-downloaded-files', {}), // videoId -> { path, profile, fileName, at }

  /** Start a download for a search item. */
  start: async (song, profile) => {
    const { videoId, title, channel, thumbnailSmall } = trackFields(song);
    const display = { title, channel, thumbnail: thumbnailSmall };
    const existing = Object.values(get().jobs).find((j) => j.videoId === videoId && j.profile === profile && !FINISHED.includes(j.status));
    if (existing) return existing.id;

    try {
      const { data } = await api.post('/downloads', { videoId, profile });
      set((s) => ({ jobs: { ...s.jobs, [data.id]: { ...data, display } }, order: [data.id, ...s.order].slice(0, 100) }));
      get().follow(data.id);
      return data.id;
    } catch (error) {
      toast({ tone: 'error', title: 'Download failed to start', message: error.message });
      return null;
    }
  },

  /** Subscribe to a job's Server-Sent Events. */
  follow: (id) => {
    if (streams.has(id)) return;
    const es = new EventSource(apiUrl(`/downloads/${id}/events`));
    streams.set(id, es);
    es.addEventListener('update', (e) => {
      const job = JSON.parse(e.data);
      const prev = get().jobs[id];
      set((s) => ({ jobs: { ...s.jobs, [id]: { ...s.jobs[id], ...job } } }));
      if (job.source) useTrackMetaStore.getState().setMeta(job.videoId, { source: job.source });
      if (job.analysis) useTrackMetaStore.getState().setMeta(job.videoId, { analysis: job.analysis });
      if (FINISHED.includes(job.status) && prev?.status !== job.status) {
        es.close();
        streams.delete(id);
        get().onFinished({ ...prev, ...job });
      }
    });
    es.onerror = () => {
      // The stream ends normally after the final update; only a live job needs a retry
      es.close();
      streams.delete(id);
      const job = get().jobs[id];
      if (job && !FINISHED.includes(job.status)) setTimeout(() => get().follow(id), 2000);
    };
  },

  onFinished: (job) => {
    const name = job.display?.title || job.fileName;
    if (job.status === 'done') {
      const files = { ...get().files, [job.videoId]: { path: job.filePath, fileName: job.fileName, profile: job.profile, jobId: job.id, at: Date.now() } };
      persistFiles(files);
      set({ files });
      if (!isLocalBackend) get().saveViaBrowser(job.id, job.fileName);
      const label = DOWNLOAD_FORMATS.find((f) => f.value === job.profile)?.label || job.profile;
      toast({
        tone: 'success',
        title: `Saved ${label}`,
        message: job.fileName,
        action: isLocalBackend ? { label: 'Show in Finder', onClick: () => get().reveal(job.id) } : undefined,
      });
    } else if (job.status === 'error') {
      toast({
        tone: 'error',
        title: `Couldn't download ${name}`,
        message: job.error?.message,
        duration: 9000,
        action: { label: 'Downloads', onClick: () => useUiStore.getState().toggleDownloads() },
      });
    }
  },

  saveViaBrowser: (id, fileName) => {
    const link = document.createElement('a');
    link.href = apiUrl(`/downloads/${id}/file`);
    link.download = fileName || '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  cancel: async (id) => {
    try {
      await api.delete(`/downloads/${id}`);
    } catch (error) {
      toast({ tone: 'error', title: "Couldn't cancel", message: error.message });
    }
  },

  retry: (id) => {
    const job = get().jobs[id];
    if (!job) return;
    get().start({ id: { videoId: job.videoId }, snippet: { title: job.display?.title, channelTitle: job.display?.channel, thumbnails: { default: { url: job.display?.thumbnail } } } }, job.profile);
  },

  reveal: (id) => api.post(`/downloads/${id}/reveal`).catch((error) => toast({ tone: 'error', title: "Couldn't open Finder", message: error.message })),

  clearFinished: () => set((s) => {
    const jobs = { ...s.jobs };
    const order = s.order.filter((id) => {
      if (FINISHED.includes(jobs[id]?.status)) {
        delete jobs[id];
        return false;
      }
      return true;
    });
    return { jobs, order };
  }),

  /** Latest job for a video (any profile), for card/table status. */
  jobFor: (videoId) => {
    const { order, jobs } = get();
    const id = order.find((i) => jobs[i]?.videoId === videoId);
    return id ? jobs[id] : null;
  },
}));

// Pick up jobs started before a reload (they keep running on the server)
api.get('/downloads').then(({ data }) => {
  const store = useDownloadStore.getState();
  const jobs = { ...store.jobs };
  const order = [...store.order];
  for (const job of data.downloads || []) {
    if (jobs[job.id]) continue;
    jobs[job.id] = { ...job, display: { title: [job.artist, job.title].filter(Boolean).join(' - ') || job.videoId } };
    order.push(job.id);
  }
  useDownloadStore.setState({ jobs, order });
  for (const job of data.downloads || []) if (!FINISHED.includes(job.status)) store.follow(job.id);
}).catch(() => {});

export default useDownloadStore;
