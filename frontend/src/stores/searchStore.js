import { create } from 'zustand';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const useSearchStore = create((set, get) => ({
  results: [],
  query: '',
  isLoading: false,
  error: null,
  searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),

  search: async (query) => {
    if (!query.trim()) return;
    set({ isLoading: true, error: null, query });

    try {
      const response = await axios.get(`${API_BASE_URL}/searchSongs`, {
        params: { searchQuery: query },
      });

      const results = response.data.items || [];
      set({ results, isLoading: false });

      // Save to search history
      const { searchHistory } = get();
      const updated = [query, ...searchHistory.filter((q) => q !== query)].slice(0, 20);
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      set({ searchHistory: updated });
    } catch (error) {
      console.error('Search error:', error);
      set({
        error: error.response?.status === 403
          ? 'YouTube API quota exceeded. Try again later.'
          : 'Search failed. Is the backend running?',
        isLoading: false,
      });
    }
  },

  clearResults: () => set({ results: [], query: '', error: null }),
  clearHistory: () => {
    localStorage.removeItem('searchHistory');
    set({ searchHistory: [] });
  },
}));

export default useSearchStore;
