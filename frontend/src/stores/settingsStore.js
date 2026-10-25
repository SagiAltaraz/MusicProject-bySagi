import { create } from 'zustand';

// Download formats the backend supports (see backend/controllers/download.js)
export const DOWNLOAD_FORMATS = [
  { value: 'wav', label: 'WAV', hint: 'Lossless 16-bit / 44.1kHz, plays on every CDJ' },
  { value: 'aiff', label: 'AIFF', hint: 'Lossless 16-bit / 44.1kHz with tags for Rekordbox/Serato' },
  { value: 'mp3', label: 'MP3 320', hint: 'MP3 320kbps CBR with cover art, smallest files' },
];

const loadFormat = () => {
  try {
    const saved = localStorage.getItem('downloadFormat');
    return DOWNLOAD_FORMATS.some((f) => f.value === saved) ? saved : 'wav';
  } catch {
    return 'wav';
  }
};

const useSettingsStore = create((set) => ({
  downloadFormat: loadFormat(),

  setDownloadFormat: (downloadFormat) => {
    try {
      localStorage.setItem('downloadFormat', downloadFormat);
    } catch {
      // Storage unavailable - keep the choice for this session only
    }
    set({ downloadFormat });
  },
}));

export default useSettingsStore;
