import { create } from 'zustand';
import api from '../lib/api';
import { load, save } from '../lib/storage';
import useSettingsStore from './settingsStore';

let searchController = null;
let suggestController = null;
let suggestTimer = null;
// Small client cache so going back to a previous search is instant
const cache = new Map();

const useSearchStore = create((set, get) => ({
  results: [],
  // How many longer videos (DJ sets, mixes) the length filter hid
  hiddenLong: 0,
  query: '',
  isLoading: false,
  error: null,
  suggestions: [],
  searchHistory: load('searchHistory', []),

  search: async (rawQuery) => {
    const query = rawQuery.trim();
    if (!query) return;
    const { maxDuration } = useSettingsStore.getState();
    const key = `${query.toLowerCase()}|${maxDuration}`;

    searchController?.abort();
    set({ query, error: null, suggestions: [] });

    const history = [query, ...get().searchHistory.filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(0, 20);
    save('searchHistory', history);
    set({ searchHistory: history });

    if (cache.has(key)) {
      set({ ...cache.get(key), isLoading: false });
      return;
    }

    searchController = new AbortController();
    set({ isLoading: true });
    try {
      const { data } = await api.get('/searchSongs', {
        params: { searchQuery: query, maxDuration },
        signal: searchController.signal,
      });
      const results = data.items || [];
      cache.set(key, { results, hiddenLong: data.hiddenLong || 0 });
      set({ results, hiddenLong: data.hiddenLong || 0, isLoading: false });
    } catch (error) {
      if (error.cancelled) return;
      set({ error: error.message, isLoading: false });
    }
  },

  // Debounced autocomplete from YouTube suggestions
  suggest: (text) => {
    clearTimeout(suggestTimer);
    suggestController?.abort();
    if (!text.trim()) {
      set({ suggestions: [] });
      return;
    }
    suggestTimer = setTimeout(async () => {
      suggestController = new AbortController();
      try {
        const { data } = await api.get('/suggest', { params: { q: text }, signal: suggestController.signal });
        set({ suggestions: data.suggestions || [] });
      } catch {
        set({ suggestions: [] });
      }
    }, 180);
  },

  clearSuggestions: () => {
    clearTimeout(suggestTimer);
    set({ suggestions: [] });
  },

  clearResults: () => set({ results: [], query: '', error: null }),

  removeFromHistory: (q) => {
    const history = get().searchHistory.filter((h) => h !== q);
    save('searchHistory', history);
    set({ searchHistory: history });
  },

  clearHistory: () => {
    save('searchHistory', []);
    set({ searchHistory: [] });
  },
}));

export default useSearchStore;
