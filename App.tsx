import React, { useState, useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { SearchBar } from './components/SearchBar';
import { GroupCard } from './components/GroupCard';
import { GroupDetailModal } from './components/GroupDetailModal';
import { AppTab, SearchState, MeetingType, CostFilter, SortOption, SupportGroup } from './types';
import { searchSupportGroups } from './services/geminiService';
import { AlertCircle, Heart, ShieldCheck, ExternalLink } from 'lucide-react';

const SUGGESTED_TOPICS = [
  "Anxiety", "Depression", "Grief", "Addiction", "LGBTQ+", "PTSD", "Eating Disorders", "Family Support"
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.SEARCH);
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null);
  
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    location: '',
    isLocating: false,
    isLoading: false,
    results: [],
    error: null,
    filters: {
        meetingType: MeetingType.ALL,
        cost: CostFilter.ANY
    },
    sortBy: SortOption.RELEVANCE
  });

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setSearchState(prev => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    setSearchState(prev => ({ ...prev, isLocating: true }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setSearchState(prev => ({ 
            ...prev, 
            location: "Current Location", 
            isLocating: false 
        }));
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

    setSearchState(prev => ({ ...prev, isLoading: true, error: null, results: [] }));

    try {
      const groups = await searchSupportGroups(
          searchState.query, 
          searchState.location,
          searchState.filters,
          searchState.sortBy
      );
      setSearchState(prev => ({ 
        ...prev, 
        isLoading: false, 
        results: groups 
      }));
    } catch (error) {
      setSearchState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "We couldn't find any groups right now. Please try a different location or topic." 
      }));
    }
  };

  const handleTopicClick = (topic: string) => {
    setSearchState(prev => ({ ...prev, query: topic }));
  };

  const renderContent = () => {
    if (searchState.results.length === 0 && !searchState.isLoading) {
      return (
        <div className="mt-8 animate-in fade-in duration-500">
          <h2 className="text-gray-800 font-bold text-lg mb-4">Suggested Topics</h2>
          <div className="flex flex-wrap gap-2.5">
            {SUGGESTED_TOPICS.map((topic) => (
              <button
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

    return (
      <div className="mt-6 pb-24 animate-in slide-in-from-bottom-2 duration-500">
        <div className="flex justify-between items-baseline mb-4 px-1">
            <h2 className="text-gray-800 font-bold text-lg">
            {searchState.results.length} Groups Found
            </h2>
            <span className="text-xs font-medium text-gray-400">
                Sorted by {searchState.sortBy}
            </span>
        </div>
        
        {searchState.results.map((group) => (
          <GroupCard 
            key={group.id} 
            group={group} 
            onClick={(g) => setSelectedGroup(g)}
          />
        ))}

        <div className="text-center mt-8 mb-4">
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
            <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center border border-red-100">
                <AlertCircle size={16} className="mr-2 shrink-0"/>
                {searchState.error}
            </div>
        )}
      </div>

      <main className="px-4 pb-4">
        {activeTab === AppTab.SEARCH && renderContent()}
        
        {activeTab === AppTab.SAVED && (
             <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400 animate-in fade-in">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Heart size={24} className="text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">No Saved Groups</h3>
                <p className="text-sm max-w-xs text-center">Groups you save will appear here for quick access.</p>
             </div>
        )}

        {activeTab === AppTab.PROFILE && (
             <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 animate-in fade-in">
                <div className="w-20 h-20 rounded-full bg-teal-50 mb-4 flex items-center justify-center text-2xl font-bold text-teal-600 border border-teal-100">
                    JD
                </div>
                <h3 className="text-gray-900 font-bold text-lg">John Doe</h3>
                <p className="text-sm mb-8 text-gray-500">john.doe@example.com</p>
                
                <div className="w-full max-w-xs space-y-3">
                    <button className="w-full bg-white border border-gray-200 py-3 px-4 rounded-xl text-sm font-semibold text-gray-700 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <span>Edit Profile</span>
                        <ExternalLink size={14} className="text-gray-400" />
                    </button>
                    
                    <button className="w-full bg-teal-600 py-3 px-4 rounded-xl text-sm font-semibold text-white hover:bg-teal-700 transition-colors shadow-lg shadow-teal-100">
                        Help & Support
                    </button>
                </div>
                
                <p className="mt-12 text-[10px] uppercase tracking-widest font-bold text-gray-300">Version 1.1.0</p>
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