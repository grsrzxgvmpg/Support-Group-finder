import React from 'react';
import { AppTab } from '../types';
import { Search, Heart, Settings } from 'lucide-react';

interface TabBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 glass-panel border-t border-gray-200 pb-5 pt-3 px-6 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <button
          type="button"
          onClick={() => onTabChange(AppTab.SEARCH)}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === AppTab.SEARCH ? 'text-teal-600' : 'text-gray-400'
          }`}
        >
          <Search size={24} strokeWidth={activeTab === AppTab.SEARCH ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Search</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange(AppTab.SAVED)}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === AppTab.SAVED ? 'text-teal-600' : 'text-gray-400'
          }`}
        >
          <Heart size={24} strokeWidth={activeTab === AppTab.SAVED ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Saved</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange(AppTab.SETTINGS)}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === AppTab.SETTINGS ? 'text-teal-600' : 'text-gray-400'
          }`}
        >
          <Settings size={24} strokeWidth={activeTab === AppTab.SETTINGS ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};