import React, { useState, useEffect, useRef } from 'react';
import { TabBar } from './components/TabBar';
import { SearchBar } from './components/SearchBar';
import { GroupCard } from './components/GroupCard';
import { GroupDetailModal } from './components/GroupDetailModal';
import { AppTab, SearchState, MeetingType, SessionType, LeadershipType, AgeGroup, DistanceFilter, SortOption, SupportGroup, UserCoordinates } from './types';
import { searchSupportGroups } from './services/geminiService';
import { useSavedGroups } from './hooks/useSavedGroups';
import { useRecentSearches } from './hooks/useRecentSearches';
import { AlertCircle, Heart, ShieldCheck, ExternalLink, Trash2, Clock, X, ChevronLeft, ChevronRight, Navigation } from 'lucide-react';

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

// Initialize state from localStorage or defaults
const initializeSearchState = (): SearchState => {
  try {
    const saved = localStorage.getItem(SEARCH_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        query: parsed.query || '',
        location: parsed.location || '',
        userCoordinates: parsed.userCoordinates || null,
        isLocating: false,
        isLoading: false,
        results: parsed.results || [],
        error: null,
        filters: parsed.filters || { meetingType: MeetingType.ALL, sessionType: SessionType.ANY, leadershipType: LeadershipType.ANY, ageGroup: AgeGroup.ALL, distance: DistanceFilter.ANY },
        sortBy: parsed.sortBy || SortOption.RELEVANCE,
        currentPage: 1,
        resultsPerPage: getSavedResultsPerPage()
      };
    }
  } catch (e) {
    console.warn('Failed to load saved search state:', e);
  }

  return {
    query: '',
    location: '',
    userCoordinates: null,
    isLocating: false,
    isLoading: false,
    results: [],
    error: null,
    filters: { meetingType: MeetingType.ALL, sessionType: SessionType.ANY, leadershipType: LeadershipType.ANY, ageGroup: AgeGroup.ALL, distance: DistanceFilter.ANY },
    sortBy: SortOption.RELEVANCE,
    currentPage: 1,
    resultsPerPage: getSavedResultsPerPage()
  };
};

// Track distance filter info for user feedback
interface DistanceFilterInfo {
  filtered: number;
  total: number;
  filterLabel: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.SEARCH);
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null);
  const { savedGroups, isGroupSaved, toggleSaveGroup } = useSavedGroups();
  const { recentSearches, addSearch, removeSearch } = useRecentSearches();
  const [distanceFilterInfo, setDistanceFilterInfo] = useState<DistanceFilterInfo | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [searchState, setSearchState] = useState<SearchState>(initializeSearchState());
  const debouncedFilters = useDebounce(searchState.filters, 300);
  const debouncedSort = useDebounce(searchState.sortBy, 300);
  const hasExistingResults = useRef(searchState.results.length > 0);

  // Auto-search when filters or sort change (if we have existing results and search terms)
  useEffect(() => {
    hasExistingResults.current = searchState.results.length > 0;

    // Only auto-search if user has results and hasn't changed their search terms
    if (hasExistingResults.current && searchState.query && searchState.location) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [debouncedFilters, debouncedSort]);

  // Persist search state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        query: searchState.query,
        location: searchState.location,
        userCoordinates: searchState.userCoordinates,
        results: searchState.results,
        filters: searchState.filters,
        sortBy: searchState.sortBy
      };
      localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save search state:', e);
    }
  }, [searchState.query, searchState.location, searchState.userCoordinates, searchState.results, searchState.filters, searchState.sortBy]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setSearchState(prev => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    setSearchState(prev => ({ ...prev, isLocating: true }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: UserCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        // Try to get a readable location name via reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
          const state = data.address?.state;
          const locationName = city && state ? `${city}, ${state}` : "Current Location";

          setSearchState(prev => ({
            ...prev,
            location: locationName,
            userCoordinates: coords,
            isLocating: false
          }));
        } catch {
          // Fallback if reverse geocoding fails
          setSearchState(prev => ({
            ...prev,
            location: "Current Location",
            userCoordinates: coords,
            isLocating: false
          }));
        }
      },
      (error) => {
        setSearchState(prev => ({
            ...prev,
            isLocating: false,
            error: "Unable to retrieve location. Please enter manually."
        }));
      }
    );
  };

  const handleSearch = async () => {
    if (!searchState.query || !searchState.location) return;

    // Save to recent searches
    addSearch(searchState.query, searchState.location);

    setSearchState(prev => ({ ...prev, isLoading: true, error: null, results: [], currentPage: 1 }));
    setDistanceFilterInfo(null);

    try {
      let groups = await searchSupportGroups(
          searchState.query,
          searchState.location,
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
    } catch (error) {
      // Determine error type and provide helpful message
      let errorMessage = "We couldn't find any groups right now. Please try a different location or topic.";

      // Check if offline
      if (!navigator.onLine) {
        errorMessage = "You're offline. Some search features may not work. Try searching again when you're back online.";
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error
        errorMessage = "Network error. Check your connection and try again.";
      } else if (error instanceof Error && error.message.includes('API')) {
        // API error
        errorMessage = "Search service temporarily unavailable. Showing fallback resources instead.";
      }

      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  };

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

  // Listen for service worker updates (PWA)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.update();
          });
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check for updates when app comes to foreground
    window.addEventListener('focus', () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.update();
          });
        });
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRecentSearchClick = (query: string, location: string) => {
    setSearchState(prev => ({ ...prev, query, location }));
  };

  const handleTopicClick = (topic: string) => {
    setSearchState(prev => ({ ...prev, query: topic }));
  };

  const renderContent = () => {
    if (searchState.results.length === 0 && !searchState.isLoading) {
      return (
        <div className="mt-8 animate-in fade-in duration-500">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <h2 className="text-gray-800 font-bold text-lg mb-3">Recent Searches</h2>
              <div className="space-y-2">
                {recentSearches.map((search) => (
                  <div
                    key={search.timestamp}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm hover:border-teal-200 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => handleRecentSearchClick(search.query, search.location)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <Clock size={16} className="text-gray-400" />
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{search.query}</span>
                        <span className="text-gray-400 mx-2">in</span>
                        <span className="text-sm text-gray-600">{search.location}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSearch(search.timestamp)}
                      className="p-1 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove search"
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
                <ShieldCheck className="text-teal-600" size={20} />
                <h3 className="text-teal-900 font-bold text-base">Verified Resources</h3>
            </div>
            <p className="text-teal-800/70 text-sm leading-relaxed">
              We connect you with trusted community sources like NAMI, Psychology Today, and local support networks to ensure you find safe and active groups.
            </p>
          </div>
        </div>
      );
    }

    if (searchState.isLoading) {
      return (
        <div className="mt-8 space-y-4 px-1">
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

    return (
      <div className="mt-6 pb-24 animate-in slide-in-from-bottom-2 duration-500">
        <div className="flex justify-between items-baseline mb-4 px-1">
            <h2 className="text-gray-800 font-bold text-lg" role="status" aria-live="polite" aria-atomic="true">
            {searchState.results.length} {searchState.results.length === 1 ? 'Result' : 'Groups'} Found
            </h2>
            <span className="text-xs font-medium text-gray-400">
                Sorted by {searchState.sortBy}
            </span>
        </div>

        {/* Distance filter notice - explains why result count varies */}
        {distanceFilterInfo && distanceFilterInfo.filtered > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
            <Navigation size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-blue-800 text-sm">
              Showing {searchState.results.length} groups {distanceFilterInfo.filterLabel.toLowerCase()}.
              <span className="text-blue-600"> {distanceFilterInfo.filtered} more groups found outside this range.</span>
            </p>
          </div>
        )}

        {/* Filter notice when results are limited */}
        {hasActiveFilters && onlyFallbackResults && searchState.results.length <= 3 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-sm">
              <strong>Limited results:</strong> Your filters may be too specific for this area. Try broadening your search criteria for more options.
            </p>
          </div>
        )}

        {/* Result Quality Metrics Summary */}
        {searchState.results.length > 0 && (() => {
          const trustedOrgs = ['NAMI', 'DBSA', 'AA', 'Alcoholics Anonymous', 'Psychology Today', '7 Cups', 'SAMHSA', 'MHA', 'Mental Health America'];
          const withVerified = searchState.results.filter(r => trustedOrgs.some(org => r.name?.includes(org) || r.sourceName?.includes(org)));
          const withRatings = searchState.results.filter(r => r.rating);
          const withPhone = searchState.results.filter(r => r.phoneNumber);
          const withAddress = searchState.results.filter(r => r.address);

          return (
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex flex-wrap gap-3 text-xs">
                {withVerified.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-green-700 font-bold">✓</span>
                    <span className="text-green-700 font-medium">{withVerified.length} Verified</span>
                  </div>
                )}
                {withRatings.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-green-700">★</span>
                    <span className="text-green-700 font-medium">{withRatings.length} Rated</span>
                  </div>
                )}
                {withPhone.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-green-700">📞</span>
                    <span className="text-green-700 font-medium">{withPhone.length} Contactable</span>
                  </div>
                )}
                {withAddress.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-green-700">📍</span>
                    <span className="text-green-700 font-medium">{withAddress.length} Located</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Paginated results */}
        {(() => {
          const totalResults = searchState.results.length;
          const totalPages = Math.ceil(totalResults / searchState.resultsPerPage);
          const startIndex = (searchState.currentPage - 1) * searchState.resultsPerPage;
          const endIndex = Math.min(startIndex + searchState.resultsPerPage, totalResults);
          const paginatedResults = searchState.results.slice(startIndex, endIndex);

          return (
            <>
              {paginatedResults.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onClick={(g) => setSelectedGroup(g)}
                  isSaved={isGroupSaved(group.id)}
                  onToggleSave={toggleSaveGroup}
                />
              ))}

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 mb-4">
                  <button
                    type="button"
                    onClick={() => setSearchState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    disabled={searchState.currentPage === 1}
                    className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first, last, current, and adjacent pages
                      const showPage = page === 1 || page === totalPages ||
                        Math.abs(page - searchState.currentPage) <= 1;
                      const showEllipsis = page === 2 && searchState.currentPage > 3 ||
                        page === totalPages - 1 && searchState.currentPage < totalPages - 2;

                      if (!showPage && !showEllipsis) return null;
                      if (showEllipsis && !showPage) {
                        return <span key={page} className="px-2 text-gray-400">...</span>;
                      }

                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setSearchState(prev => ({ ...prev, currentPage: page }))}
                          aria-label={`Page ${page}${searchState.currentPage === page ? ', current page' : ''}`}
                          aria-current={searchState.currentPage === page ? 'page' : undefined}
                          className={`min-w-[36px] h-9 rounded-lg text-sm font-semibold transition-colors ${
                            searchState.currentPage === page
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
                    onClick={() => setSearchState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    disabled={searchState.currentPage === totalPages}
                    className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

              {/* Page info */}
              <div className="text-center text-xs text-gray-400 mb-4">
                Showing {startIndex + 1}-{endIndex} of {totalResults} results
              </div>
            </>
          );
        })()}

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
      <div className="bg-white/80 backdrop-blur-md pb-2 pt-1 px-4 sticky top-0 z-30 border-b border-gray-200/50">
        <div className="flex justify-between items-center mb-4 pt-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Support Group Finder</h1>
            <p className="text-gray-500 font-medium text-xs mt-0.5">You don't have to be alone.</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs shadow-inner">
            JD
          </div>
        </div>
        
        <SearchBar 
            topic={searchState.query}
            location={searchState.location}
            filters={searchState.filters}
            sortBy={searchState.sortBy}
            isLocating={searchState.isLocating}
            isLoading={searchState.isLoading}
            onTopicChange={(val) => setSearchState(prev => ({ ...prev, query: val }))}
            onLocationChange={(val) => setSearchState(prev => ({ ...prev, location: val }))}
            onFiltersChange={(newFilters) => setSearchState(prev => ({ ...prev, filters: newFilters }))}
            onSortChange={(newSort) => setSearchState(prev => ({ ...prev, sortBy: newSort }))}
            onLocateMe={handleLocateMe}
            onSearch={handleSearch}
        />
        
        {searchState.error && (
            <div className={`mt-3 p-4 rounded-xl flex items-start justify-between gap-3 border ${
              searchState.error.includes('offline')
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5"/>
                  <div className="text-sm">
                    <p className="font-semibold mb-1">{searchState.error.split('.')[0]}</p>
                    {searchState.error.includes('different') && (
                      <p className="text-xs opacity-90">Try a different search term or location</p>
                    )}
                  </div>
                </div>
                {searchState.error.includes('offline') && (
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
                  >
                    Retry
                  </button>
                )}
            </div>
        )}
      </div>

      <main className="px-4 pb-4">
        {activeTab === AppTab.SEARCH && renderContent()}
        
        {activeTab === AppTab.SAVED && (
          savedGroups.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400 animate-in fade-in">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Heart size={24} className="text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">No Saved Groups</h3>
                <p className="text-sm max-w-xs text-center">Groups you save will appear here for quick access.</p>
             </div>
          ) : (
            <div className="mt-6 pb-24 animate-in fade-in">
              <div className="flex justify-between items-baseline mb-4 px-1">
                <h2 className="text-gray-800 font-bold text-lg">
                  {savedGroups.length} Saved {savedGroups.length === 1 ? 'Group' : 'Groups'}
                </h2>
              </div>
              {savedGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onClick={(g) => setSelectedGroup(g)}
                  isSaved={true}
                  onToggleSave={toggleSaveGroup}
                />
              ))}
            </div>
          )
        )}

        {activeTab === AppTab.SETTINGS && (
          <div className="mt-6 pb-24 animate-in fade-in">
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
                      onClick={() => {
                        localStorage.setItem(RESULTS_PER_PAGE_KEY, num.toString());
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
                  <Trash2 size={16} />
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
                  <span className="font-semibold">Version 1.2.0</span>
                  <span>•</span>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline flex items-center gap-1"
                  >
                    View on GitHub
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Help & Feedback */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-gray-900 font-semibold text-sm mb-1">Help & Feedback</h3>
                <p className="text-gray-500 text-xs mb-3">Have questions or suggestions? We'd love to hear from you.</p>
                <a
                  href="mailto:support@example.com"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
                >
                  Contact Support
                </a>
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

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;