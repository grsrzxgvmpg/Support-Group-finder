import React from 'react';
import { Search, MapPin, Loader2, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { SearchFilters, SortOption, MeetingType, CostFilter } from '../types';

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
  return (
    <div className="space-y-3">
      {/* Inputs Container */}
      <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          {/* Location Input */}
          <div className="relative border-b border-gray-100">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600">
                {isLocating ? <Loader2 size={18} className="animate-spin"/> : <MapPin size={18} />}
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="City, Zip, or 'Current Location'"
              className="w-full bg-transparent border-none py-3.5 pl-10 pr-16 text-gray-900 placeholder-gray-400 focus:ring-0 text-[15px] font-medium"
            />
            <button 
                onClick={onLocateMe}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded hover:bg-teal-50 transition-colors"
            >
                Locate
            </button>
          </div>

          {/* Topic Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="What support do you need? (e.g. Anxiety)"
              className="w-full bg-transparent border-none py-3.5 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:ring-0 text-[15px] font-medium"
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
      </div>

      {/* Filters & Sort Row */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        
        {/* Meeting Type Filter */}
        <div className="relative flex-1 min-w-[120px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <SlidersHorizontal size={14} />
          </div>
          <select 
            value={filters.meetingType}
            onChange={(e) => onFiltersChange({ ...filters, meetingType: e.target.value as MeetingType })}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-9 pr-8 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(MeetingType).map(t => (
                <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Cost Filter */}
        <div className="relative flex-1 min-w-[110px]">
          <select 
            value={filters.cost}
            onChange={(e) => onFiltersChange({ ...filters, cost: e.target.value as CostFilter })}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-4 pr-8 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(CostFilter).map(c => (
                <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Sort Option */}
        <div className="relative flex-1 min-w-[120px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <ArrowUpDown size={14} />
          </div>
          <select 
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-9 pr-8 text-xs font-semibold text-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
          >
            {Object.values(SortOption).map(s => (
                <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

      </div>

      <button
        onClick={onSearch}
        disabled={isLoading || !topic || !location}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] flex justify-center items-center ${
          isLoading || !topic || !location 
            ? 'bg-gray-300 cursor-not-allowed shadow-none' 
            : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
        }`}
      >
        {isLoading ? (
            <>
                <Loader2 size={20} className="animate-spin mr-2"/>
                <span>Finding Community...</span>
            </>
        ) : (
            'Search Groups'
        )}
      </button>
    </div>
  );
};