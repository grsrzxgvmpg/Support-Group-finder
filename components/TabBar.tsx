import React from 'react';
import { AppTab } from '../types';
import { Search, Heart, Settings } from 'lucide-react';

interface TabBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  savedCount?: number;
}

const TABS: { tab: AppTab; label: string; Icon: typeof Search }[] = [
  { tab: AppTab.SEARCH, label: 'Search', Icon: Search },
  { tab: AppTab.SAVED, label: 'Saved', Icon: Heart },
  { tab: AppTab.SETTINGS, label: 'Settings', Icon: Settings }
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange, savedCount = 0 }) => {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 glass-panel border-t border-gray-200 pt-3 px-6 z-50"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
    >
      <div className="flex justify-between items-center max-w-md mx-auto">
        {TABS.map(({ tab, label, Icon }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center space-y-1 px-4 py-1 rounded-lg transition-colors ${
                isActive ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              {tab === AppTab.SAVED && savedCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center"
                >
                  {savedCount > 99 ? '99+' : savedCount}
                </span>
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
