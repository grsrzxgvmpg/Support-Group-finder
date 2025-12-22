import React from 'react';
import { Search, MapPin, Loader2, SlidersHorizontal, ArrowUpDown, X, Users, Navigation } from 'lucide-react';
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
  const hasActiveFilters =
    filters.sessionType !== SessionType.ANY ||
    filters.leadershipType !== LeadershipType.ANY ||
    filters.meetingType !== MeetingType.ALL ||
    filters.ageGroup !== AgeGroup.ALL ||
    filters.distance !== DistanceFilter.ANY;

  const activeFilterCount = [
    filters.sessionType !== SessionType.ANY,
    filters.leadershipType !== LeadershipType.ANY,
    filters.meetingType !== MeetingType.ALL,
    filters.ageGroup !== AgeGroup.ALL,
    filters.distance !== DistanceFilter.ANY
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

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
              className="w-full bg-transparent border-none py-3.5 pl-10 pr-16 text-gray-900 placeholder-gray-400 focus:ring-0 text-[15px] font-medium"
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            <button
                type="button"
                onClick={onLocateMe}
                aria-label="Use current location"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded hover:bg-teal-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
            >
                Locate
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
              className="w-full bg-transparent border-none py-3.5 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:ring-0 text-[15px] font-medium"
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
      </div>

      {/* Filters Row 1 - Primary Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">

        {/* Session Type Filter (Group vs Individual) */}
        <div className="relative flex-1 min-w-[110px]">
          <select
            title="Session format"
            aria-label="Session format"
            value={filters.sessionType}
            onChange={(e) => onFiltersChange({ ...filters, sessionType: e.target.value as SessionType })}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-3 pr-6 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(SessionType).map(t => (
                <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Leadership Type Filter (Peer vs Professional) */}
        <div className="relative flex-1 min-w-[110px]">
          <select
            title="Leadership type"
            aria-label="Leadership type"
            value={filters.leadershipType}
            onChange={(e) => onFiltersChange({ ...filters, leadershipType: e.target.value as LeadershipType })}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-3 pr-6 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(LeadershipType).map(t => (
                <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Age Group Filter */}
        <div className="relative flex-1 min-w-[110px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <Users size={14} />
          </div>
          <select
            title="Age group"
            aria-label="Age group"
            value={filters.ageGroup}
            onChange={(e) => onFiltersChange({ ...filters, ageGroup: e.target.value as AgeGroup })}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-9 pr-6 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(AgeGroup).map(a => (
                <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Row 2 - Meeting Type, Distance & Sort */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {/* Meeting Type Filter (In-Person vs Online) */}
        <div className="relative flex-1 min-w-[110px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <SlidersHorizontal size={14} />
          </div>
          <select
            title="Meeting type"
            aria-label="Meeting type"
            value={filters.meetingType}
            onChange={(e) => onFiltersChange({ ...filters, meetingType: e.target.value as MeetingType })}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-9 pr-8 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(MeetingType).map(t => (
                <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Distance Filter */}
        <div className="relative flex-1 min-w-[120px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <Navigation size={14} />
          </div>
          <select
            title="Distance filter"
            aria-label="Distance filter"
            value={filters.distance}
            onChange={(e) => onFiltersChange({ ...filters, distance: e.target.value as DistanceFilter })}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-9 pr-8 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(DistanceFilter).map(d => (
                <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Sort Option */}
        <div className="relative flex-1 min-w-[110px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <ArrowUpDown size={14} />
          </div>
          <select
            title="Sort by"
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-9 pr-8 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(SortOption).map(s => (
                <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Reset Filters Button - shows when filters active */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap"
          >
            <X size={14} />
            Reset ({activeFilterCount})
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onSearch}
        disabled={isLoading || !topic || !location}
        aria-label={isLoading ? 'Searching for groups' : 'Search for support groups'}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
          isLoading || !topic || !location
            ? 'bg-gray-300 cursor-not-allowed shadow-none'
            : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
        }`}
      >
        {isLoading ? (
            <>
                <Loader2 size={20} className="animate-spin mr-2" aria-hidden="true"/>
                <span>Finding Community...</span>
            </>
        ) : (
            'Search Groups'
        )}
      </button>
    </div>
  );
};