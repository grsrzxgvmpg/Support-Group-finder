import React, { useState } from 'react';
import { Search, MapPin, Loader2, SlidersHorizontal, ArrowUpDown, X, Users, Navigation, ChevronDown, Video } from 'lucide-react';
import { SearchFilters, SortOption, MeetingType, SessionType, LeadershipType, AgeGroup, DistanceFilter } from '../types';

interface SearchBarProps {
  topic: string;
  location: string;
  filters: SearchFilters;
  sortBy: SortOption;
  isLocating: boolean;
  onTopicChange: (val: string) => void;
  onLocationChange: (val: string) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onLocateMe: () => void;
  onSearch: () => void;
  isLoading: boolean;
}

const DEFAULT_FILTERS: SearchFilters = {
  meetingType: MeetingType.ALL,
  sessionType: SessionType.ANY,
  leadershipType: LeadershipType.ANY,
  ageGroup: AgeGroup.ALL,
  distance: DistanceFilter.ANY
};

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  icon?: React.ReactNode;
  onChange: (value: string) => void;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, options, icon, onChange }) => (
  <div className="relative">
    {icon && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" aria-hidden="true">
        {icon}
      </div>
    )}
    <select
      title={label}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 ${icon ? 'pl-9' : 'pl-3'} pr-7 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm`}
    >
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
  </div>
);

export const SearchBar: React.FC<SearchBarProps> = ({
  topic,
  location,
  filters,
  sortBy,
  isLocating,
  onTopicChange,
  onLocationChange,
  onFiltersChange,
  onSortChange,
  onLocateMe,
  onSearch,
  isLoading
}) => {
  const activeFilterCount = [
    filters.sessionType !== SessionType.ANY,
    filters.leadershipType !== LeadershipType.ANY,
    filters.meetingType !== MeetingType.ALL,
    filters.ageGroup !== AgeGroup.ALL,
    filters.distance !== DistanceFilter.ANY
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  // Keep the panel open if the user already has filters applied
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const canSearch = !isLoading && topic.trim().length > 0 && location.trim().length > 0;

  return (
    <div className="space-y-3" role="search" aria-label="Support group search">
      {/* Inputs Container */}
      <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          {/* Location Input */}
          <div className="relative border-b border-gray-100">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600" aria-hidden="true">
                {isLocating ? <Loader2 size={18} className="animate-spin"/> : <MapPin size={18} />}
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="City, Zip, or 'Current Location'"
              aria-label="Location"
              autoComplete="off"
              enterKeyHint="search"
              className="w-full bg-transparent border-none py-3.5 pl-10 pr-16 text-gray-900 placeholder-gray-400 focus:ring-0 text-[15px] font-medium"
              onKeyDown={(e) => e.key === 'Enter' && canSearch && onSearch()}
            />
            <button
                type="button"
                onClick={onLocateMe}
                disabled={isLocating}
                aria-label="Use current location"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded hover:bg-teal-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 disabled:opacity-50"
            >
                {isLocating ? 'Locating…' : 'Locate'}
            </button>
          </div>

          {/* Topic Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="What support do you need? (e.g. Anxiety)"
              aria-label="Support topic"
              autoComplete="off"
              enterKeyHint="search"
              className="w-full bg-transparent border-none py-3.5 pl-10 pr-10 text-gray-900 placeholder-gray-400 focus:ring-0 text-[15px] font-medium"
              onKeyDown={(e) => e.key === 'Enter' && canSearch && onSearch()}
            />
            {topic && (
              <button
                type="button"
                onClick={() => onTopicChange('')}
                aria-label="Clear topic"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-gray-500 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
      </div>

      {/* Filters toggle + Sort row */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFiltersOpen(open => !open)}
          aria-expanded={filtersOpen}
          aria-controls="filter-panel"
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold border shadow-sm transition-colors ${
            hasActiveFilters
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-teal-200'
          }`}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="flex-1">
          <FilterSelect
            label="Sort by"
            value={sortBy}
            options={Object.values(SortOption)}
            icon={<ArrowUpDown size={14} />}
            onChange={(v) => onSortChange(v as SortOption)}
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap"
          >
            <X size={14} aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      {/* Collapsible filter panel */}
      {filtersOpen && (
        <div id="filter-panel" className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
          <FilterSelect
            label="Meeting type"
            value={filters.meetingType}
            options={Object.values(MeetingType)}
            icon={<Video size={14} />}
            onChange={(v) => onFiltersChange({ ...filters, meetingType: v as MeetingType })}
          />
          <FilterSelect
            label="Distance"
            value={filters.distance}
            options={Object.values(DistanceFilter)}
            icon={<Navigation size={14} />}
            onChange={(v) => onFiltersChange({ ...filters, distance: v as DistanceFilter })}
          />
          <FilterSelect
            label="Session format"
            value={filters.sessionType}
            options={Object.values(SessionType)}
            onChange={(v) => onFiltersChange({ ...filters, sessionType: v as SessionType })}
          />
          <FilterSelect
            label="Leadership"
            value={filters.leadershipType}
            options={Object.values(LeadershipType)}
            onChange={(v) => onFiltersChange({ ...filters, leadershipType: v as LeadershipType })}
          />
          <FilterSelect
            label="Age group"
            value={filters.ageGroup}
            options={Object.values(AgeGroup)}
            icon={<Users size={14} />}
            onChange={(v) => onFiltersChange({ ...filters, ageGroup: v as AgeGroup })}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onSearch}
        disabled={!canSearch}
        aria-label={isLoading ? 'Searching for groups' : 'Search for support groups'}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
          !canSearch
            ? 'bg-gray-300 cursor-not-allowed shadow-none'
            : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
        }`}
      >
        {isLoading ? (
            <>
                <Loader2 size={20} className="animate-spin mr-2" aria-hidden="true"/>
                <span>Finding Community…</span>
            </>
        ) : (
            'Search Groups'
        )}
      </button>
    </div>
  );
};
