import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TabBar } from './components/TabBar';
import { SearchBar } from './components/SearchBar';
import { GroupCard } from './components/GroupCard';
import { GroupDetailModal } from './components/GroupDetailModal';
import { AppTab, SearchState, MeetingType, SessionType, LeadershipType, AgeGroup, DistanceFilter, SortOption, SupportGroup, UserCoordinates } from './types';
import { searchSupportGroups, isCrisisQuery } from './services/searchService';
import { isNativePlatform, getCurrentPosition, triggerHaptic, LocationError } from './services/platform';
import { App as CapacitorApp } from '@capacitor/app';
import { useSavedGroups } from './hooks/useSavedGroups';
import { useRecentSearches } from './hooks/useRecentSearches';
import { AlertCircle, Heart, ShieldCheck, ExternalLink, Trash2, Clock, X, ChevronLeft, ChevronRight, Navigation, Phone, Lock } from 'lucide-react';

const APP_VERSION = '1.3.0';
const GITHUB_URL = 'https://github.com/grsrzxgvmpg/support-group-finder';

const SUGGESTED_TOPICS = [
  "Anxiety", "Depression", "Grief", "Addiction", "LGBTQ+", "PTSD", "Eating Disorders", "Family Support"
];

// Custom debounce hook for filter changes
const useDebounce = <T,>(value: T, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const SEARCH_STATE_KEY = 'supportGroupFinder_searchState';
const RESULTS_PER_PAGE_KEY = 'supportGroupFinder_resultsPerPage';
const DEFAULT_RESULTS_PER_PAGE = 10;
const RESULTS_PER_PAGE_OPTIONS = [5, 10, 15, 20];

const DEFAULT_FILTERS = {
  meetingType: MeetingType.ALL,
  sessionType: SessionType.ANY,
  leadershipType: LeadershipType.ANY,
  ageGroup: AgeGroup.ALL,
  distance: DistanceFilter.ANY
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistanceMiles = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get max distance in miles from filter
const getMaxDistanceMiles = (filter: DistanceFilter): number | null => {
  switch (filter) {
    case DistanceFilter.WITHIN_5: return 5;
    case DistanceFilter.WITHIN_10: return 10;
    case DistanceFilter.WITHIN_20: return 20;
    case DistanceFilter.BEYOND_20: return -20; // Negative means "greater than"
    default: return null;
  }
};

// Get saved results per page
const getSavedResultsPerPage = (): number => {
  try {
    const saved = localStorage.getItem(RESULTS_PER_PAGE_KEY);
    if (saved) {
      const num = parseInt(saved, 10);
      if (RESULTS_PER_PAGE_OPTIONS.includes(num)) return num;
    }
  } catch (e) {
    console.warn('Failed to load results per page:', e);
  }
  return DEFAULT_RESULTS_PER_PAGE;
};

// Initial tab from PWA shortcut URL (/?tab=saved) if present
const getInitialTab = (): AppTab => {
  try {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'saved') return AppTab.SAVED;
    if (tab === 'settings') return AppTab.SETTINGS;
  } catch {
    // Ignore malformed URLs
  }
  return AppTab.SEARCH;
};

// Initialize state from localStorage or defaults
const initializeSearchState = (): SearchState => {
  const defaults: SearchState = {
    query: '',
    location: '',
    userCoordinates: null,
    isLocating: false,
    isLoading: false,
    results: [],
    error: null,
    filters: { ...DEFAULT_FILTERS },
    sortBy: SortOption.RELEVANCE,
    currentPage: 1,
    resultsPerPage: getSavedResultsPerPage()
  };

  try {
    const saved = localStorage.getItem(SEARCH_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaults,
        query: parsed.query || '',
        location: parsed.location || '',
        userCoordinates: parsed.userCoordinates || null,
        results: Array.isArray(parsed.results) ? parsed.results : [],
        filters: { ...DEFAULT_FILTERS, ...parsed.filters },
        sortBy: parsed.sortBy || SortOption.RELEVANCE
      };
    }
  } catch (e) {
    console.warn('Failed to load saved search state:', e);
  }

  return defaults;
};

// Track distance filter info for user feedback
interface DistanceFilterInfo {
  filtered: number;
  total: number;
  filterLabel: string;
}

const CrisisBanner: React.FC = () => (
  <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
    <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
      <Phone size={16} className="text-rose-600" aria-hidden="true" />
    </div>
    <div className="text-sm">
      <p className="font-bold text-rose-900">In crisis or need to talk right now?</p>
      <p className="text-rose-800/80 mt-0.5">
        Call or text{' '}
        <a href="tel:988" className="font-bold text-rose-700 underline underline-offset-2">988</a>
        {' '}— the Suicide &amp; Crisis Lifeline. Free, confidential, 24/7.
      </p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(getInitialTab);
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null);
  const { savedGroups, isGroupSaved, toggleSaveGroup } = useSavedGroups();
  const { recentSearches, addSearch, removeSearch } = useRecentSearches();
  const [distanceFilterInfo, setDistanceFilterInfo] = useState<DistanceFilterInfo | null>(null);

  const [searchState, setSearchState] = useState<SearchState>(initializeSearchState);
  const debouncedFilters = useDebounce(searchState.filters, 400);
  const debouncedSort = useDebounce(searchState.sortBy, 400);
  const shouldAutoSearch = useRef(false);
  const prevFilterKey = useRef<string | null>(null);

  // Latest UI state for the native back-button handler (avoids stale closures)
  const selectedGroupRef = useRef(selectedGroup);
  selectedGroupRef.current = selectedGroup;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Android hardware back button: close modal -> back to Search tab -> exit
  useEffect(() => {
    if (!isNativePlatform) return;
    const listener = CapacitorApp.addListener('backButton', () => {
      if (selectedGroupRef.current) {
        setSelectedGroup(null);
      } else if (activeTabRef.current !== AppTab.SEARCH) {
        setActiveTab(AppTab.SEARCH);
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      listener.then(handle => handle.remove()).catch(() => { /* already removed */ });
    };
  }, []);

  const handleSearch = async () => {
    const query = searchState.query.trim();
    const location = searchState.location.trim();
    if (!query || !location) return;

    // Haptic feedback on search start
    triggerHaptic('medium');

    // Save to recent searches
    addSearch(query, location);

    setSearchState(prev => ({ ...prev, isLoading: true, error: null, results: [], currentPage: 1 }));
    setDistanceFilterInfo(null);

    try {
      let groups = await searchSupportGroups(
          query,
          location,
          searchState.filters,
          searchState.sortBy
      );

      // Calculate distances if we have user coordinates
      if (searchState.userCoordinates) {
        groups = groups.map(group => {
          if (group.latitude && group.longitude) {
            const distance = calculateDistanceMiles(
              searchState.userCoordinates!.latitude,
              searchState.userCoordinates!.longitude,
              group.latitude,
              group.longitude
            );
            return { ...group, distanceMiles: Math.round(distance * 10) / 10 };
          }
          return group;
        });
      }

      // Apply distance filter and track how many were filtered
      const maxDistance = getMaxDistanceMiles(searchState.filters.distance);
      const totalBeforeDistanceFilter = groups.length;
      if (maxDistance !== null && searchState.userCoordinates) {
        groups = groups.filter(group => {
          // Always include online groups and fallback resources
          if (group.isOnline || group.isFallbackUrl || !group.latitude || !group.longitude) {
            return true;
          }

          const distance = group.distanceMiles;
          if (distance === undefined) return true;

          if (maxDistance < 0) {
            // BEYOND_20: show groups farther than 20 miles
            return distance > Math.abs(maxDistance);
          } else {
            // WITHIN_X: show groups within X miles
            return distance <= maxDistance;
          }
        });

        // Track how many were filtered by distance
        const filteredOutByDistance = totalBeforeDistanceFilter - groups.length;
        if (filteredOutByDistance > 0) {
          setDistanceFilterInfo({
            filtered: filteredOutByDistance,
            total: totalBeforeDistanceFilter,
            filterLabel: searchState.filters.distance
          });
        }
      }

      // Sort by distance if using Nearest sort option
      if (searchState.sortBy === SortOption.NEAREST && searchState.userCoordinates) {
        groups.sort((a, b) => {
          // Online/fallback groups go to the end
          if (a.isOnline && !b.isOnline) return 1;
          if (!a.isOnline && b.isOnline) return -1;
          if (a.isFallbackUrl && !b.isFallbackUrl) return 1;
          if (!a.isFallbackUrl && b.isFallbackUrl) return -1;

          const distA = a.distanceMiles ?? Infinity;
          const distB = b.distanceMiles ?? Infinity;
          return distA - distB;
        });
      }

      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        results: groups,
        currentPage: 1
      }));

      // Haptic feedback on successful search
      triggerHaptic(groups.length > 0 ? 'success' : 'warning');
    } catch (error) {
      // Determine error type and provide helpful message
      let errorMessage = "We couldn't find any groups right now. Please try a different location or topic.";

      if (!navigator.onLine) {
        errorMessage = "You're offline. Try searching again when you're back online.";
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = "Network error. Check your connection and try again.";
      } else if (error instanceof Error && error.message.includes('API')) {
        errorMessage = "Search service temporarily unavailable. Please try again in a moment.";
      }

      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      // Haptic feedback on error
      triggerHaptic('error');
    }
  };

  // Keep a ref to the latest handleSearch so effects never call a stale closure
  const handleSearchRef = useRef(handleSearch);
  handleSearchRef.current = handleSearch;

  // Re-run the search when filters or sort change (only after the user
  // already has results — and never on the initial mount, which would
  // fire a wasted API call every time the app opens). Comparing serialized
  // values instead of using a first-run flag keeps this correct under
  // StrictMode's double-mounted effects.
  useEffect(() => {
    const key = JSON.stringify([debouncedFilters, debouncedSort]);
    if (prevFilterKey.current === key) return;
    const isFirstRun = prevFilterKey.current === null;
    prevFilterKey.current = key;
    if (isFirstRun) return;

    if (searchState.results.length > 0 && searchState.query.trim() && searchState.location.trim()) {
      handleSearchRef.current();
    }
  }, [debouncedFilters, debouncedSort]);

  // Auto-search when a recent search is clicked
  useEffect(() => {
    if (shouldAutoSearch.current && searchState.query && searchState.location) {
      shouldAutoSearch.current = false;
      handleSearchRef.current();
    }
  }, [searchState.query, searchState.location]);

  // Persist search state to localStorage (debounced so typing doesn't
  // serialize the whole results array on every keystroke)
  const debouncedSearchState = useDebounce(searchState, 500);
  useEffect(() => {
    try {
      const stateToSave = {
        query: debouncedSearchState.query,
        location: debouncedSearchState.location,
        userCoordinates: debouncedSearchState.userCoordinates,
        results: debouncedSearchState.results,
        filters: debouncedSearchState.filters,
        sortBy: debouncedSearchState.sortBy
      };
      localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save search state:', e);
    }
  }, [debouncedSearchState]);

  const handleLocateMe = async () => {
    setSearchState(prev => ({ ...prev, isLocating: true, error: null }));

    let coords: UserCoordinates;
    try {
      coords = await getCurrentPosition();
    } catch (error) {
      const code = error instanceof LocationError ? error.code : 'unavailable';
      const message =
        code === 'unsupported' ? "Location services aren't supported on this device. Please enter your location manually."
        : code === 'denied' ? "Location access was denied. Please enter your location manually or enable location permissions."
        : "Unable to retrieve your location. Please enter it manually.";
      setSearchState(prev => ({ ...prev, isLocating: false, error: message }));
      return;
    }

    // Try to get a readable location name via reverse geocoding
    let locationName = 'Current Location';
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10`
      );
      if (response.ok) {
        const data = await response.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
        const state = data.address?.state;
        if (city && state) locationName = `${city}, ${state}`;
      }
    } catch {
      // Reverse geocoding is best-effort; keep the generic label
    }

    setSearchState(prev => ({
      ...prev,
      location: locationName,
      userCoordinates: coords,
      isLocating: false
    }));
  };

  // Typing a location manually invalidates previously captured GPS
  // coordinates - otherwise distances would be computed from the old spot
  const handleLocationChange = useCallback((val: string) => {
    setSearchState(prev => ({
      ...prev,
      location: val,
      userCoordinates: val === prev.location ? prev.userCoordinates : null
    }));
  }, []);

  const handleTopicChange = useCallback((val: string) => {
    setSearchState(prev => ({ ...prev, query: val }));
  }, []);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setSearchState(prev => ({
        ...prev,
        error: prev.error?.includes('offline') ? null : prev.error
      }));
    };

    const handleOffline = () => {
      setSearchState(prev => ({
        ...prev,
        error: "You're offline. Some search features may not work."
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for service worker updates when the app returns to the foreground
  useEffect(() => {
    const checkForUpdates = () => {
      if (!document.hidden && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => registration.update());
        }).catch(() => { /* SW not available */ });
      }
    };

    document.addEventListener('visibilitychange', checkForUpdates);
    window.addEventListener('focus', checkForUpdates);

    return () => {
      document.removeEventListener('visibilitychange', checkForUpdates);
      window.removeEventListener('focus', checkForUpdates);
    };
  }, []);

  const handleRecentSearchClick = (query: string, location: string) => {
    setSearchState(prev => ({ ...prev, query, location }));
    shouldAutoSearch.current = true;
  };

  // Tapping a topic chip searches immediately when a location is already
  // set - one tap instead of chip + Search button
  const handleTopicClick = (topic: string) => {
    setSearchState(prev => ({ ...prev, query: topic }));
    if (searchState.location.trim()) {
      shouldAutoSearch.current = true;
    }
  };

  const goToPage = (page: number) => {
    setSearchState(prev => ({ ...prev, currentPage: page }));
    // Bring the top of the results back into view (header is sticky, so the
    // results list starts right below it at scroll position 0)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    if (searchState.results.length === 0 && !searchState.isLoading) {
      return (
        <div className="mt-6 animate-in fade-in duration-500">
          <CrisisBanner />

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <h2 className="text-gray-800 font-bold text-lg mb-3">Recent Searches</h2>
              <div className="space-y-2">
                {recentSearches.map((search) => (
                  <div
                    key={search.timestamp}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm hover:border-teal-200 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleRecentSearchClick(search.query, search.location)}
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                    >
                      <Clock size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
                      <div className="truncate">
                        <span className="text-sm font-semibold text-gray-800">{search.query}</span>
                        <span className="text-gray-400 mx-2">in</span>
                        <span className="text-sm text-gray-600">{search.location}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSearch(search.timestamp)}
                      className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors shrink-0"
                      aria-label={`Remove search for ${search.query} in ${search.location}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-gray-800 font-bold text-lg mb-4">Suggested Topics</h2>
          <div className="flex flex-wrap gap-2.5">
            {SUGGESTED_TOPICS.map((topic) => (
              <button
                type="button"
                key={topic}
                onClick={() => handleTopicClick(topic)}
                aria-pressed={searchState.query === topic}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  searchState.query === topic
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                    : 'bg-white text-gray-600 border border-gray-100 shadow-sm hover:border-teal-200 hover:text-teal-700'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          <div className="mt-10 p-5 bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-100/50">
            <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-teal-600" size={20} aria-hidden="true" />
                <h3 className="text-teal-900 font-bold text-base">Verified Resources</h3>
            </div>
            <p className="text-teal-800/70 text-sm leading-relaxed">
              We connect you with trusted community sources like NAMI, Psychology Today, and local support networks to ensure you find safe and active groups.
            </p>
          </div>

          <p className="mt-4 mb-2 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Lock size={12} aria-hidden="true" />
            Private by design — no account needed. Your searches and saved groups stay on this device.
          </p>
        </div>
      );
    }

    if (searchState.isLoading) {
      return (
        <div className="mt-8 space-y-4 px-1" role="status" aria-label="Loading search results">
           {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-4 animate-pulse"></div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-gray-50 rounded w-full animate-pulse"></div>
                    <div className="h-3 bg-gray-50 rounded w-5/6 animate-pulse"></div>
                  </div>
                  <div className="flex gap-3 mt-4">
                     <div className="h-10 bg-gray-100 rounded-lg flex-1 animate-pulse"></div>
                     <div className="h-10 bg-gray-100 rounded-lg flex-1 animate-pulse"></div>
                  </div>
              </div>
           ))}
        </div>
      );
    }

    // Check if filters are active
    const hasActiveFilters =
      searchState.filters.sessionType !== SessionType.ANY ||
      searchState.filters.leadershipType !== LeadershipType.ANY ||
      searchState.filters.meetingType !== MeetingType.ALL ||
      searchState.filters.ageGroup !== AgeGroup.ALL ||
      searchState.filters.distance !== DistanceFilter.ANY;

    // Check if only showing fallback/search results (indicates filters may be too restrictive)
    const onlyFallbackResults = searchState.results.length > 0 &&
      searchState.results.every(r => r.sourceName === 'Google' || r.isFallbackUrl ||
        ['NAMI', 'DBSA', 'Psychology Today', '7 Cups', 'SAMHSA', 'AA', 'MHA'].includes(r.sourceName || ''));

    const totalResults = searchState.results.length;
    const totalPages = Math.ceil(totalResults / searchState.resultsPerPage);
    const currentPage = Math.min(searchState.currentPage, totalPages);
    const startIndex = (currentPage - 1) * searchState.resultsPerPage;
    const endIndex = Math.min(startIndex + searchState.resultsPerPage, totalResults);
    const paginatedResults = searchState.results.slice(startIndex, endIndex);

    return (
      <div className="mt-6 pb-28 animate-in slide-in-from-bottom-2 duration-500">
        {/* Surface the lifeline prominently when the search suggests crisis */}
        {isCrisisQuery(searchState.query) && <CrisisBanner />}

        <div className="flex justify-between items-baseline mb-4 px-1">
            <h2 className="text-gray-800 font-bold text-lg" role="status" aria-live="polite" aria-atomic="true">
            {totalResults} {totalResults === 1 ? 'Group' : 'Groups'} Found
            </h2>
            <span className="text-xs font-medium text-gray-400">
                Sorted by {searchState.sortBy}
            </span>
        </div>

        {/* Distance filter notice - explains why result count varies */}
        {distanceFilterInfo && distanceFilterInfo.filtered > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
            <Navigation size={16} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-blue-800 text-sm">
              Showing {totalResults} groups {distanceFilterInfo.filterLabel.toLowerCase()}.
              <span className="text-blue-600"> {distanceFilterInfo.filtered} more groups found outside this range.</span>
            </p>
          </div>
        )}

        {/* No verified local listings - offer one-tap pivots instead of a dead end */}
        {onlyFallbackResults && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-sm mb-3">
              We couldn't find verified local listings for{' '}
              <strong>{searchState.query.trim() || 'this topic'}</strong> near{' '}
              <strong>{searchState.location.trim() || 'your area'}</strong>.
              The national resources below can connect you with a group.
            </p>
            <div className="flex flex-wrap gap-2">
              {searchState.filters.meetingType !== MeetingType.ONLINE && (
                <button
                  type="button"
                  onClick={() => setSearchState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, meetingType: MeetingType.ONLINE }
                  }))}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  Search online groups instead
                </button>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => setSearchState(prev => ({ ...prev, filters: { ...DEFAULT_FILTERS } }))}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Result Quality Metrics Summary */}
        {totalResults > 0 && (() => {
          const trustedOrgs = ['NAMI', 'DBSA', 'AA', 'Alcoholics Anonymous', 'Psychology Today', '7 Cups', 'SAMHSA', 'MHA', 'Mental Health America'];
          const withVerified = searchState.results.filter(r => trustedOrgs.some(org => r.name?.includes(org) || r.sourceName?.includes(org))).length;
          const withRatings = searchState.results.filter(r => r.rating).length;
          const withPhone = searchState.results.filter(r => r.phoneNumber).length;
          const withAddress = searchState.results.filter(r => r.address).length;

          return (
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex flex-wrap gap-3 text-xs">
                {withVerified > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-green-700 font-bold" aria-hidden="true">✓</span>
                    <span className="text-green-700 font-medium">{withVerified} Verified</span>
                  </div>
                )}
                {withRatings > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-green-700" aria-hidden="true">★</span>
                    <span className="text-green-700 font-medium">{withRatings} Rated</span>
                  </div>
                )}
                {withPhone > 0 && (
                  <div className="flex items-center gap-1">
                    <span aria-hidden="true">📞</span>
                    <span className="text-green-700 font-medium">{withPhone} Contactable</span>
                  </div>
                )}
                {withAddress > 0 && (
                  <div className="flex items-center gap-1">
                    <span aria-hidden="true">📍</span>
                    <span className="text-green-700 font-medium">{withAddress} Located</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {paginatedResults.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onClick={setSelectedGroup}
            isSaved={isGroupSaved(group.id)}
            onToggleSave={toggleSaveGroup}
          />
        ))}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <nav aria-label="Search results pages" className="flex items-center justify-center gap-2 mt-6 mb-4">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first, last, current, and adjacent pages
                const showPage = page === 1 || page === totalPages ||
                  Math.abs(page - currentPage) <= 1;
                const showEllipsis = (page === 2 && currentPage > 3) ||
                  (page === totalPages - 1 && currentPage < totalPages - 2);

                if (!showPage && !showEllipsis) return null;
                if (showEllipsis && !showPage) {
                  return <span key={page} className="px-2 text-gray-400" aria-hidden="true">…</span>;
                }

                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    aria-label={`Page ${page}${currentPage === page ? ', current page' : ''}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-teal-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </nav>
        )}

        {/* Page info */}
        <div className="text-center text-xs text-gray-400 mb-4">
          Showing {startIndex + 1}–{endIndex} of {totalResults} results
        </div>

        <div className="text-center mb-4">
            <p className="text-xs text-gray-400">
                Always verify meeting times with the organizer.
            </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header
        className="bg-white/85 backdrop-blur-md pb-3 px-4 sticky top-0 z-30 border-b border-gray-200/50"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.25rem)' }}
      >
        <div className="flex justify-between items-center mb-4 pt-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Support Group Finder</h1>
            <p className="text-gray-500 font-medium text-xs mt-0.5">You don't have to be alone.</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md shadow-teal-200" aria-hidden="true">
            <Heart size={18} className="text-white" fill="currentColor" />
          </div>
        </div>

        <SearchBar
            topic={searchState.query}
            location={searchState.location}
            filters={searchState.filters}
            sortBy={searchState.sortBy}
            isLocating={searchState.isLocating}
            isLoading={searchState.isLoading}
            onTopicChange={handleTopicChange}
            onLocationChange={handleLocationChange}
            onFiltersChange={(newFilters) => setSearchState(prev => ({ ...prev, filters: newFilters }))}
            onSortChange={(newSort) => setSearchState(prev => ({ ...prev, sortBy: newSort }))}
            onLocateMe={handleLocateMe}
            onSearch={handleSearch}
        />

        {searchState.error && (
            <div role="alert" className={`mt-3 p-4 rounded-xl flex items-start justify-between gap-3 border ${
              searchState.error.includes('offline')
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}>
                <div className="flex items-start gap-3 min-w-0">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true"/>
                  <p className="text-sm font-medium">{searchState.error}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {searchState.query.trim() && searchState.location.trim() && (
                    <button
                      type="button"
                      onClick={handleSearch}
                      className={`text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-lg transition-colors ${
                        searchState.error.includes('offline')
                          ? 'bg-amber-100 hover:bg-amber-200'
                          : 'bg-red-100 hover:bg-red-200'
                      }`}
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSearchState(prev => ({ ...prev, error: null }))}
                    aria-label="Dismiss error"
                    className="p-1.5 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
            </div>
        )}
      </header>

      <main className="px-4 pb-4">
        {activeTab === AppTab.SEARCH && renderContent()}

        {activeTab === AppTab.SAVED && (
          savedGroups.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400 animate-in fade-in">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Heart size={24} className="text-gray-300" aria-hidden="true" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">No Saved Groups</h3>
                <p className="text-sm max-w-xs text-center">Tap the heart on any group to save it here for quick access.</p>
             </div>
          ) : (
            <div className="mt-6 pb-28 animate-in fade-in">
              <div className="flex justify-between items-baseline mb-4 px-1">
                <h2 className="text-gray-800 font-bold text-lg">
                  {savedGroups.length} Saved {savedGroups.length === 1 ? 'Group' : 'Groups'}
                </h2>
              </div>
              {savedGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onClick={setSelectedGroup}
                  isSaved={true}
                  onToggleSave={toggleSaveGroup}
                />
              ))}
            </div>
          )
        )}

        {activeTab === AppTab.SETTINGS && (
          <div className="mt-6 pb-28 animate-in fade-in">
            <h2 className="text-gray-800 font-bold text-lg mb-4 px-1">Settings</h2>

            <div className="space-y-4">
              {/* Results Per Page */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-gray-900 font-semibold text-sm mb-1">Results Per Page</h3>
                <p className="text-gray-500 text-xs mb-3">Choose how many results to display on each page.</p>
                <div className="flex gap-2">
                  {RESULTS_PER_PAGE_OPTIONS.map((num) => (
                    <button
                      key={num}
                      type="button"
                      aria-pressed={searchState.resultsPerPage === num}
                      onClick={() => {
                        try {
                          localStorage.setItem(RESULTS_PER_PAGE_KEY, num.toString());
                        } catch { /* storage unavailable */ }
                        setSearchState(prev => ({ ...prev, resultsPerPage: num, currentPage: 1 }));
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        searchState.resultsPerPage === num
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crisis Resources */}
              <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                <h3 className="text-rose-900 font-semibold text-sm mb-1">Crisis Resources</h3>
                <p className="text-rose-800/80 text-xs mb-3">
                  If you or someone you know is struggling or in crisis, help is available right now.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="tel:988"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors"
                  >
                    <Phone size={14} aria-hidden="true" />
                    Call 988
                  </a>
                  <a
                    href="sms:988"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-700 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-colors"
                  >
                    Text 988
                  </a>
                </div>
              </div>

              {/* Clear Data Section */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-gray-900 font-semibold text-sm mb-1">Clear Saved Data</h3>
                <p className="text-gray-500 text-xs mb-3">Remove all saved groups and search history from this device.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all saved data?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Clear All Data
                </button>
              </div>

              {/* About Section */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-gray-900 font-semibold text-sm mb-1">About</h3>
                <p className="text-gray-500 text-xs mb-3">
                  Support Group Finder helps you discover mental health support groups in your area.
                  We connect you with trusted resources from NAMI, Psychology Today, and local communities.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-semibold">Version {APP_VERSION}</span>
                  <span aria-hidden="true">•</span>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline flex items-center gap-1"
                  >
                    View on GitHub
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedGroup && (
        <GroupDetailModal
            group={selectedGroup}
            onClose={() => setSelectedGroup(null)}
        />
      )}

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} savedCount={savedGroups.length} />
    </div>
  );
};

export default App;
