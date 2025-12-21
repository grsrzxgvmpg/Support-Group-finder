export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  location: string;
  topic: string;
  url?: string; // Source URL found by search
  phoneNumber?: string; // Contact number
  schedule?: string;
  distance?: string;
  sourceName?: string;
  isFallbackUrl?: boolean;
  rating?: number;
  reviewCount?: number;
}

export enum MeetingType {
  ALL = 'All Types',
  IN_PERSON = 'In-Person',
  ONLINE = 'Online'
}

export enum CostFilter {
  ANY = 'Any Cost',
  FREE = 'Free Only'
}

export enum SortOption {
  RELEVANCE = 'Best Match',
  NEAREST = 'Nearest'
}

export interface SearchFilters {
  meetingType: MeetingType;
  cost: CostFilter;
}

export interface SearchState {
  query: string;
  location: string;
  isLocating: boolean;
  isLoading: boolean;
  results: SupportGroup[];
  error: string | null;
  filters: SearchFilters;
  sortBy: SortOption;
}

export enum AppTab {
  SEARCH = 'SEARCH',
  SAVED = 'SAVED',
  PROFILE = 'PROFILE'
}