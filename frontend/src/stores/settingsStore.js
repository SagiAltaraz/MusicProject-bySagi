import { create } from 'zustand';
import { load, save } from '../lib/storage';

// Download profiles the backend supports (see backend/services/audio/profiles.js)
export const DOWNLOAD_FORMATS = [
  { value: 'aiff', label: 'AIFF', detail: 'Lossless 16-bit · tags + artwork', hint: 'Best for Rekordbox, Serato and CDJs. Lossless container - stops further loss, cannot add quality.' },
  { value: 'wav', label: 'WAV', detail: 'Lossless 16-bit · plays everywhere', hint: 'Universal lossless, but WAV tags are limited (no artwork).' },
  { value: 'flac', label: 'FLAC', detail: 'Lossless · half the size of AIFF', hint: 'CDJ-3000, XDJ and Serato yes - older CDJs no.' },
  { value: 'mp3', label: 'MP3 320', detail: 'CBR 320 · smallest, universal', hint: 'Plays on every CDJ ever made. Second lossy encode of the source.' },
  { value: 'm4a', label: 'AAC original', detail: 'Untouched YouTube AAC', hint: "YouTube's AAC stream copied bit-for-bit - zero added loss." },
];

export const MAX_DURATION_OPTIONS = [
  { value: 600, label: 'Tracks (≤ 10 min)' },
  { value: 1200, label: 'Extended (≤ 20 min)' },
  { value: 0, label: 'Anything (incl. sets)' },
];

const DEFAULTS = {
  downloadFormat: 'aiff',
  viewMode: 'grid',
  maxDuration: 600,
  stageMode: false,
  autoAnalyze: false,
};

const stored = load('dj-settings', {});
// Migrate the earlier standalone key
const legacyFormat = load('downloadFormat', null);

const initial = { ...DEFAULTS, ...stored };
if (legacyFormat && !stored.downloadFormat) initial.downloadFormat = legacyFormat;
if (!DOWNLOAD_FORMATS.some((f) => f.value === initial.downloadFormat)) initial.downloadFormat = DEFAULTS.downloadFormat;

const useSettingsStore = create((set, get) => ({
  ...initial,

  setSetting: (key, value) => {
    set({ [key]: value });
    const { setSetting: _setSetting, setDownloadFormat: _setDownloadFormat, ...persisted } = get();
    save('dj-settings', persisted);
  },

  setDownloadFormat: (value) => get().setSetting('downloadFormat', value),
}));

export default useSettingsStore;
