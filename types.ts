export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  topic: string;

  // Location details
  location: string;           // Display location (city, state or "Online")
  address?: string;           // Full street address
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;

  // Contact info
  phoneNumber?: string;
  website?: string;
  email?: string;

  // Schedule
  schedule?: string;
  meetingDays?: string[];
  meetingTime?: string;
  nextMeeting?: string;

  // Metadata
  url?: string;               // Source URL found by search
  sourceName?: string;
  isFallbackUrl?: boolean;
  isOnline?: boolean;
  isFree?: boolean;

  // Ratings
  rating?: number;
  reviewCount?: number;

  // Category/Type
  groupType?: string;         // "Peer Support", "Therapy Group", "12-Step", etc.
  categories?: string[];

  // Session characteristics
  isGroup?: boolean;          // true = group session, false = individual counseling
  isPeerLed?: boolean;        // true = peer-led, false = therapist/professional-led

  // Age group
  isYouth?: boolean;          // true = for children/teens/adolescents
  isAdult?: boolean;          // true = for adults only

  // Calculated distance from user
  distanceMiles?: number;

  // Completeness score for quality indication
  completenessScore?: number; // 0-100, based on available fields

  // Timestamp set when the user saves the group
  savedAt?: number;
}

export enum MeetingType {
  ALL = 'All Types',
  IN_PERSON = 'In-Person',
  ONLINE = 'Online'
}

export enum SessionType {
  ANY = 'Any Format',
  GROUP = 'Group Only',
  INDIVIDUAL = 'Individual Only'
}

export enum LeadershipType {
  ANY = 'Any Leader',
  PEER = 'Peer-Led',
  PROFESSIONAL = 'Therapist-Led'
}

export enum AgeGroup {
  ALL = 'All Ages',
  CHILD_ADOLESCENT = 'Youth (Under 18)',
  ADULT = 'Adult (18+)'
}

export enum DistanceFilter {
  ANY = 'Any Distance',
  WITHIN_5 = 'Within 5 miles',
  WITHIN_10 = 'Within 10 miles',
  WITHIN_20 = 'Within 20 miles',
  BEYOND_20 = 'Beyond 20 miles'
}

export enum SortOption {
  RELEVANCE = 'Best Match',
  NEAREST = 'Nearest'
}

export interface SearchFilters {
  meetingType: MeetingType;
  sessionType: SessionType;
  leadershipType: LeadershipType;
  ageGroup: AgeGroup;
  distance: DistanceFilter;
}

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

export interface SearchState {
  query: string;
  location: string;
  userCoordinates: UserCoordinates | null;
  isLocating: boolean;
  isLoading: boolean;
  results: SupportGroup[];
  error: string | null;
  filters: SearchFilters;
  sortBy: SortOption;
  currentPage: number;
  resultsPerPage: number;
}

export enum AppTab {
  SEARCH = 'SEARCH',
  SAVED = 'SAVED',
  SETTINGS = 'SETTINGS'
}
