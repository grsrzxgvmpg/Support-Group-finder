import { useState, useEffect, useCallback } from 'react';
import { SupportGroup } from '../types';

const SAVED_GROUPS_KEY = 'supportGroupFinder_savedGroups';

export function useSavedGroups() {
  const [savedGroups, setSavedGroups] = useState<SupportGroup[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_GROUPS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(savedGroups));
    } catch (e) {
      console.warn('Failed to save groups to localStorage:', e);
    }
  }, [savedGroups]);

  const saveGroup = useCallback((group: SupportGroup) => {
    setSavedGroups(prev => {
      if (prev.some(g => g.id === group.id)) {
        return prev;
      }
      return [...prev, { ...group, savedAt: Date.now() }];
    });
  }, []);

  const unsaveGroup = useCallback((groupId: string) => {
    setSavedGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const isGroupSaved = useCallback((groupId: string) => {
    return savedGroups.some(g => g.id === groupId);
  }, [savedGroups]);

  const toggleSaveGroup = useCallback((group: SupportGroup) => {
    if (isGroupSaved(group.id)) {
      unsaveGroup(group.id);
      return false;
    } else {
      saveGroup(group);
      return true;
    }
  }, [isGroupSaved, saveGroup, unsaveGroup]);

  return {
    savedGroups,
    saveGroup,
    unsaveGroup,
    isGroupSaved,
    toggleSaveGroup
  };
}
