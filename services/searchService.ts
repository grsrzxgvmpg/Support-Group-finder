import { SupportGroup, SearchFilters, SortOption, MeetingType, SessionType, LeadershipType, AgeGroup, DistanceFilter } from "../types";

// Deterministic ID derived from the group's identity so the same group
// found in different searches gets the same ID. This keeps the saved/heart
// state consistent across sessions and prevents duplicate saves.
const stableGroupId = (group: { name: string; address?: string; location?: string; url?: string }): string => {
  const key = `${group.name}|${group.address || group.location || ''}|${group.url || ''}`.toLowerCase();
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return `g${(hash >>> 0).toString(36)}`;
};

// Calculate completeness score based on available fields
function calculateCompletenessScore(group: Partial<SupportGroup>): number {
  let score = 0;
  let maxScore = 0;

  // Core fields (50 points max)
  const coreFields = ['name', 'description', 'location'];
  const corePresent = coreFields.filter(f => group[f as keyof SupportGroup]).length;
  maxScore += 50;
  score += (corePresent / coreFields.length) * 50;

  // Contact fields (30 points)
  const contactFields = ['phoneNumber', 'website', 'address'];
  const contactPresent = contactFields.filter(f => group[f as keyof SupportGroup]).length;
  maxScore += 30;
  score += (contactPresent / contactFields.length) * 30;

  // Details fields (20 points)
  const detailFields = ['schedule', 'rating'];
  const detailPresent = detailFields.filter(f => group[f as keyof SupportGroup]).length;
  maxScore += 20;
  score += (detailPresent / detailFields.length) * 20;

  return Math.round((score / maxScore) * 100);
}

// People describe what they need in everyday words ("panic attacks",
// "drinking problem", "lost my husband"). Map common lay phrasing onto
// terms that actually return good search results. First match wins; the
// user's original wording is preserved for display.
const TOPIC_SYNONYMS: { pattern: RegExp; term: string }[] = [
  { pattern: /\bsuicid\w*\b/i, term: 'suicide prevention' },
  { pattern: /\bpanic( attacks?)?\b|\bsocial anxiety\b|\bworr(y|ied|ying)\b/i, term: 'anxiety' },
  { pattern: /\b(sad|sadness|feeling down|hopeless(ness)?|depress\w*)\b/i, term: 'depression' },
  { pattern: /\b(widowe?d?r?|bereave(d|ment)|lost (my|a) \w+|loss of)\b/i, term: 'grief' },
  { pattern: /\b(drink(ing)?( problem)?|alcohol(ism|ic)?s?)\b/i, term: 'alcohol addiction' },
  { pattern: /\b(drugs?|substance (ab)?use|opioids?|heroin|meth|fentanyl|narcotics?)\b/i, term: 'addiction' },
  { pattern: /\bgambling\b/i, term: 'gambling addiction' },
  { pattern: /\b(anorexi[ac]|bulimi[ac]|binge eating|overeat(ing|er)s?)\b/i, term: 'eating disorders' },
  { pattern: /\b(gay|lesbian|bisexual|trans(gender)?|queer|non-?binary)\b/i, term: 'LGBTQ+' },
  { pattern: /\b(veterans?|combat|military)\b/i, term: 'veterans PTSD' },
  { pattern: /\b(trauma(tized)?|abuse(d)? survivor)\b/i, term: 'trauma' },
  { pattern: /\bcaregiv(er|ing)s?\b/i, term: 'caregiver support' }
];

// Translate a lay search phrase into an effective search term.
// Returns the original topic when no mapping applies.
export function normalizeTopicForSearch(topic: string): string {
  const trimmed = topic.trim();
  for (const { pattern, term } of TOPIC_SYNONYMS) {
    if (pattern.test(trimmed) && trimmed.toLowerCase() !== term.toLowerCase()) {
      return term;
    }
  }
  return trimmed;
}

// Detect searches that suggest the user may be in crisis so the UI can
// surface the 988 lifeline alongside results.
const CRISIS_PATTERN = /\b(suicid\w*|kill (myself|themselves)|end (my|their) life|self[- ]?harm|hurt (myself|themselves)|don'?t want to (live|be here))\b/i;

export function isCrisisQuery(topic: string): boolean {
  return CRISIS_PATTERN.test(topic);
}

// API endpoint - a same-origin serverless function on the web. Native
// (Capacitor) builds have no same-origin server, so VITE_API_BASE_URL must
// point at the deployed backend (e.g. https://your-app.vercel.app) at build
// time. Without it, native builds fall back to the curated resources below.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_URL = `${API_BASE}/api/search`;

// Curated fallback resources
const FALLBACK_RESOURCES: Omit<SupportGroup, 'id' | 'topic'>[] = [
  {
    name: "NAMI Support Groups",
    description: "Free peer-led support groups for individuals and families affected by mental illness. Find local chapters nationwide.",
    location: "Nationwide",
    address: "Find local chapter",
    phoneNumber: "(800) 950-6264",
    website: "https://www.nami.org/Support-Education/Support-Groups",
    url: "https://www.nami.org/Support-Education/Support-Groups",
    schedule: "Varies by chapter - typically weekly",
    sourceName: "NAMI",
    isFallbackUrl: false,
    isOnline: false,
    isFree: true,
    isGroup: true,
    isPeerLed: true,
    isNationalResource: true,
    groupType: "Peer Support"
  },
  {
    name: "DBSA Support Groups",
    description: "Free peer-led support groups for people living with depression and bipolar disorder. No registration required.",
    location: "Nationwide",
    address: "Find local group",
    phoneNumber: "(800) 826-3632",
    website: "https://www.dbsalliance.org/support/chapters-and-support-groups/find-a-support-group/",
    url: "https://www.dbsalliance.org/support/chapters-and-support-groups/find-a-support-group/",
    schedule: "Most groups meet weekly",
    sourceName: "DBSA",
    isFallbackUrl: false,
    isOnline: false,
    isFree: true,
    isGroup: true,
    isPeerLed: true,
    isNationalResource: true,
    groupType: "Peer Support"
  },
  {
    name: "Psychology Today Support Groups",
    description: "Directory of professional therapy groups and support groups led by licensed mental health professionals.",
    location: "Nationwide",
    phoneNumber: undefined,
    website: "https://www.psychologytoday.com/us/groups",
    url: "https://www.psychologytoday.com/us/groups",
    schedule: "Varies by group",
    sourceName: "Psychology Today",
    isFallbackUrl: false,
    isOnline: false,
    isFree: false,
    isGroup: true,
    isPeerLed: false,
    isNationalResource: true,
    groupType: "Therapy Group"
  },
  {
    name: "7 Cups - 24/7 Online Support",
    description: "Free online emotional support. Chat with trained listeners anytime. Also offers online therapy options.",
    location: "Online",
    phoneNumber: undefined,
    website: "https://www.7cups.com/",
    url: "https://www.7cups.com/",
    schedule: "24/7 Available",
    sourceName: "7 Cups",
    isFallbackUrl: false,
    isOnline: true,
    isFree: true,
    isGroup: true,
    isPeerLed: true,
    isNationalResource: true,
    groupType: "Peer Support"
  },
  {
    name: "SAMHSA National Helpline",
    description: "Free, confidential 24/7 treatment referral and information service. Helps find local support groups and treatment.",
    location: "Nationwide",
    phoneNumber: "(800) 662-4357",
    website: "https://findtreatment.gov/",
    url: "https://findtreatment.gov/",
    schedule: "24/7 Helpline",
    sourceName: "SAMHSA",
    isFallbackUrl: false,
    isOnline: false,
    isFree: true,
    isGroup: true,
    isPeerLed: false,
    isNationalResource: true,
    groupType: "Referral Service"
  },
  {
    name: "Alcoholics Anonymous",
    description: "Free fellowship of people who share experience, strength and hope to recover from alcoholism. Meetings worldwide.",
    location: "Worldwide",
    phoneNumber: "(212) 870-3400",
    website: "https://www.aa.org/find-aa",
    url: "https://www.aa.org/find-aa",
    schedule: "Daily meetings available",
    sourceName: "AA",
    isFallbackUrl: false,
    isOnline: true,
    isFree: true,
    isGroup: true,
    isPeerLed: true,
    isNationalResource: true,
    groupType: "12-Step"
  },
  {
    name: "Mental Health America",
    description: "Find local MHA affiliates offering support groups, education, and advocacy. Free screening tools available.",
    location: "Nationwide",
    phoneNumber: "(703) 684-7722",
    website: "https://www.mhanational.org/find-affiliate",
    url: "https://www.mhanational.org/find-affiliate",
    schedule: "Varies by affiliate",
    sourceName: "MHA",
    isFallbackUrl: false,
    isOnline: false,
    isFree: true,
    isGroup: true,
    isPeerLed: true,
    isNationalResource: true,
    groupType: "Peer Support"
  }
];

// Apply filters to results
function applyFilters(results: SupportGroup[], filters: SearchFilters): SupportGroup[] {
  let filtered = [...results];

  // Meeting type filter
  if (filters.meetingType === MeetingType.ONLINE) {
    filtered = filtered.filter(r => r.isOnline);
  } else if (filters.meetingType === MeetingType.IN_PERSON) {
    filtered = filtered.filter(r => !r.isOnline || r.location === 'Nationwide' || r.location === 'Worldwide');
  }

  // Session type filter (group vs individual)
  if (filters.sessionType === SessionType.GROUP) {
    filtered = filtered.filter(r => r.isGroup !== false);
  } else if (filters.sessionType === SessionType.INDIVIDUAL) {
    filtered = filtered.filter(r => r.isGroup === false);
  }

  // Leadership type filter
  if (filters.leadershipType === LeadershipType.PEER) {
    filtered = filtered.filter(r => r.isPeerLed === true);
  } else if (filters.leadershipType === LeadershipType.PROFESSIONAL) {
    filtered = filtered.filter(r => r.isPeerLed === false);
  }

  // Age group filter
  if (filters.ageGroup === AgeGroup.CHILD_ADOLESCENT) {
    filtered = filtered.filter(r => r.isYouth === true);
  } else if (filters.ageGroup === AgeGroup.ADULT) {
    // Only include groups explicitly marked as adult, or groups that don't exclude adults (not marked as youth-only)
    filtered = filtered.filter(r => r.isAdult === true || (r.isYouth !== true && r.isAdult !== false));
  }

  return filtered;
}

// Get fallback results. `topic` is the user's original wording (kept for
// display); `searchTopic` is the normalized term used in search URLs.
function getFallbackResults(topic: string, location: string, filters: SearchFilters, searchTopic: string = topic): SupportGroup[] {
  let resources = [...FALLBACK_RESOURCES];

  // Apply all filters
  resources = applyFilters(resources.map(r => ({ ...r, id: '', topic: '', completenessScore: calculateCompletenessScore(r) })), filters) as typeof resources;

  // Add Google search link
  resources.unshift({
    name: `Find ${topic} Groups in ${location}`,
    description: `Search Google for current ${topic.toLowerCase()} support groups with addresses, phone numbers, and meeting times near ${location}.`,
    location: location,
    website: `https://www.google.com/search?q=${encodeURIComponent(`${searchTopic} support group ${location} address phone`)}`,
    url: `https://www.google.com/search?q=${encodeURIComponent(`${searchTopic} support group ${location} address phone`)}`,
    schedule: "Live search results",
    sourceName: "Google",
    isFallbackUrl: true,
    isOnline: false,
    isGroup: true,
    groupType: "Search"
  });

  return resources.map(r => ({
    ...r,
    id: stableGroupId(r),
    topic,
    completenessScore: calculateCompletenessScore(r)
  }));
}

// Search via serverless API
async function searchViaAPI(
  topic: string,
  location: string,
  filters: SearchFilters
): Promise<SupportGroup[]> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      location,
      meetingType: filters.meetingType,
      sessionType: filters.sessionType,
      leadershipType: filters.leadershipType,
      ageGroup: filters.ageGroup
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.results || []).map((result: any) => {
    const group = {
      id: stableGroupId(result),
      name: result.name,
      description: result.description,
      topic,
      location: result.location,
      address: result.address,
      city: result.city,
      state: result.state,
      zipCode: result.zipCode,
      latitude: result.latitude,
      longitude: result.longitude,
      phoneNumber: result.phoneNumber,
      website: result.website,
      url: result.url,
      sourceName: result.isOnline ? 'Web' : 'Google Maps',
      isFallbackUrl: !result.website,
      isOnline: result.isOnline,
      isFree: result.isFree,
      isGroup: result.isGroup,
      isPeerLed: result.isPeerLed,
      isYouth: result.isYouth,
      isAdult: result.isAdult,
      rating: result.rating,
      reviewCount: result.reviewCount,
      groupType: result.groupType
    };
    return {
      ...group,
      completenessScore: calculateCompletenessScore(group)
    };
  });
}

// Build a descriptive search query based on filters
function buildFilteredSearchQuery(topic: string, location: string, filters: SearchFilters): string {
  const parts = [topic];

  if (filters.sessionType === SessionType.GROUP) {
    parts.push('group');
  } else if (filters.sessionType === SessionType.INDIVIDUAL) {
    parts.push('individual counseling');
  } else {
    parts.push('support group');
  }

  if (filters.leadershipType === LeadershipType.PEER) {
    parts.push('peer-led');
  } else if (filters.leadershipType === LeadershipType.PROFESSIONAL) {
    parts.push('therapist');
  }

  if (filters.meetingType === MeetingType.ONLINE) {
    parts.push('online virtual');
  } else if (filters.meetingType === MeetingType.IN_PERSON) {
    parts.push(location);
  } else {
    parts.push(location);
  }

  if (filters.ageGroup === AgeGroup.CHILD_ADOLESCENT) {
    parts.push('teen youth adolescent');
  } else if (filters.ageGroup === AgeGroup.ADULT) {
    parts.push('adult');
  }

  return parts.join(' ');
}

// Check if any non-default filters are active
function hasActiveFilters(filters: SearchFilters): boolean {
  return filters.sessionType !== SessionType.ANY ||
         filters.leadershipType !== LeadershipType.ANY ||
         filters.meetingType !== MeetingType.ALL ||
         filters.ageGroup !== AgeGroup.ALL ||
         filters.distance !== DistanceFilter.ANY;
}

// Main search function
export const searchSupportGroups = async (
  topic: string,
  location: string,
  filters: SearchFilters,
  sortBy: SortOption
): Promise<SupportGroup[]> => {
  // Search with the normalized term ("panic attacks" -> "anxiety") while
  // keeping the user's original wording for everything they see
  const searchTopic = normalizeTopicForSearch(topic);

  let results: SupportGroup[] = [];
  let apiResultCount = 0;

  try {
    results = await searchViaAPI(searchTopic, location, filters);
    apiResultCount = results.length;
  } catch (error) {
    console.error('API search error:', error);
    // API not available or failed - use fallback
  }

  // Results display the user's original topic
  results = results.map(r => ({ ...r, topic }));

  // Apply client-side filters for additional precision
  const filteredResults = applyFilters(results, filters);

  // Check if filters eliminated all results
  const filtersActive = hasActiveFilters(filters);
  const filtersEliminatedResults = apiResultCount > 0 && filteredResults.length === 0;

  if (filtersEliminatedResults && filtersActive) {
    // Filters were too restrictive - create a targeted Google search
    const searchQuery = buildFilteredSearchQuery(searchTopic, location, filters);
    // Build filter description
    const activeFilters = [];
    if (filters.meetingType !== MeetingType.ALL) activeFilters.push(`${filters.meetingType.toLowerCase()}`);
    if (filters.sessionType !== SessionType.ANY) activeFilters.push(`${filters.sessionType.toLowerCase()}`);
    if (filters.leadershipType !== LeadershipType.ANY) activeFilters.push(`${filters.leadershipType.toLowerCase()}`);
    if (filters.ageGroup !== AgeGroup.ALL) activeFilters.push(`${filters.ageGroup.toLowerCase()}`);
    if (filters.distance !== DistanceFilter.ANY) activeFilters.push(`${filters.distance.toLowerCase()}`);

    const filterText = activeFilters.length > 0 ? `for ${activeFilters.join(', ')} ` : '';

    const noMatchResult: SupportGroup = {
      id: stableGroupId({ name: `search-${topic}`, location, url: searchQuery }),
      name: `Search for specific ${topic} resources`,
      description: `No exact matches found ${filterText}in your area. Try widening your filters or click to search Google for more options.`,
      topic,
      location: location,
      website: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
      sourceName: 'Google',
      isFallbackUrl: true,
      isOnline: filters.meetingType === MeetingType.ONLINE,
      isGroup: filters.sessionType !== SessionType.INDIVIDUAL,
      isPeerLed: filters.leadershipType === LeadershipType.PEER,
      groupType: 'Search',
      completenessScore: 100
    };

    // Get matching fallbacks only
    const matchingFallbacks = getFallbackResults(topic, location, filters, searchTopic).filter(r => r.sourceName !== 'Google');

    if (matchingFallbacks.length > 0) {
      // We have some matching national resources
      return [noMatchResult, ...matchingFallbacks];
    } else {
      // No matching fallbacks either - just return the search link
      return [noMatchResult];
    }
  }

  results = filteredResults;

  // If no results at all, use fallback
  if (results.length === 0) {
    results = getFallbackResults(topic, location, filters, searchTopic);
  } else {
    // Append matching fallback resources for comprehensiveness
    const fallbacks = getFallbackResults(topic, location, filters, searchTopic)
      .filter(r => r.sourceName !== 'Google')
      .slice(0, 3);
    results = [...results, ...fallbacks];
  }

  // Remove duplicates using fuzzy matching for known organizations
  const KNOWN_ORGS = ['nami', 'dbsa', 'aa', 'alcoholics anonymous', 'psychology today', '7 cups', 'samhsa', 'mha', 'mental health america'];

  const seen = new Set<string>();
  results = results.filter(r => {
    const nameLower = r.name.toLowerCase();

    // Check exact match
    if (seen.has(nameLower)) return false;

    // Check if this is a known organization in different format
    const isKnownOrg = KNOWN_ORGS.some(org => nameLower.includes(org) || org.includes(nameLower.split(' ')[0]));
    if (isKnownOrg) {
      for (const existingKey of seen) {
        if (KNOWN_ORGS.some(org => existingKey.includes(org) && nameLower.includes(org))) {
          return false; // Duplicate of known org in different format
        }
      }
    }

    seen.add(nameLower);
    return true;
  });

  // Sort
  if (sortBy === SortOption.NEAREST) {
    results.sort((a, b) => {
      const aHasAddress = a.address ? 1 : 0;
      const bHasAddress = b.address ? 1 : 0;
      if (bHasAddress !== aHasAddress) return bHasAddress - aHasAddress;
      return (b.rating || 0) - (a.rating || 0);
    });
  } else {
    results.sort((a, b) => {
      const aScore = (a.phoneNumber ? 2 : 0) + (a.address ? 2 : 0) + (a.rating ? 1 : 0);
      const bScore = (b.phoneNumber ? 2 : 0) + (b.address ? 2 : 0) + (b.rating ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  return results;
};
