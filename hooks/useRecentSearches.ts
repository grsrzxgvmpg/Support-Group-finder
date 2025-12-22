import { useState, useEffect, useCallback } from 'react';

interface RecentSearch {
  query: string;
  location: string;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = 'supportGroupFinder_recentSearches';
const MAX_RECENT_SEARCHES = 5;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch (e) {
      console.warn('Failed to save recent searches:', e);
    }
  }, [recentSearches]);

  const addSearch = useCallback((query: string, location: string) => {
    if (!query.trim() || !location.trim()) return;

    setRecentSearches(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        s => !(s.query.toLowerCase() === query.toLowerCase() && s.location.toLowerCase() === location.toLowerCase())
      );

      // Add new search at the beginning
      const updated = [
        { query: query.trim(), location: location.trim(), timestamp: Date.now() },
        ...filtered
      ].slice(0, MAX_RECENT_SEARCHES);

      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const removeSearch = useCallback((timestamp: number) => {
    setRecentSearches(prev => prev.filter(s => s.timestamp !== timestamp));
  }, []);

  return {
    recentSearches,
    addSearch,
    clearRecentSearches,
    removeSearch
  };
}
