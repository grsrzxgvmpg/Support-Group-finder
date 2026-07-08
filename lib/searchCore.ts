// Shared Serper search logic used by both the Vercel serverless function
// (api/search.ts) and the Vite dev-server middleware (vite.config.ts),
// so development and production behave identically.

export interface SearchParams {
  topic: string;
  location: string;
  meetingType?: string;
  sessionType?: string;
  leadershipType?: string;
  ageGroup?: string;
}

export interface SearchResultItem {
  name: string;
  description: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string | null;
  website?: string | null;
  url: string;
  rating?: number | null;
  reviewCount?: number | null;
  isOnline: boolean;
  isGroup: boolean;
  isPeerLed: boolean;
  isFree: boolean;
  isYouth: boolean;
  isAdult: boolean;
  groupType: string;
}

interface SerperPlace {
  title: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  ratingCount?: number;
  category?: string;
  type?: string;
  phoneNumber?: string;
  website?: string;
}

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet?: string;
}

interface SerperResponse {
  places?: SerperPlace[];
  organic?: SerperOrganicResult[];
}

const MAX_INPUT_LENGTH = 100;

// Validate and normalize request input. Returns null if invalid.
export function validateParams(body: unknown): SearchParams | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  const topic = typeof b.topic === 'string' ? b.topic.trim().slice(0, MAX_INPUT_LENGTH) : '';
  const location = typeof b.location === 'string' ? b.location.trim().slice(0, MAX_INPUT_LENGTH) : '';
  if (!topic || !location) return null;

  const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 50) : undefined);
  return {
    topic,
    location,
    meetingType: str(b.meetingType),
    sessionType: str(b.sessionType),
    leadershipType: str(b.leadershipType),
    ageGroup: str(b.ageGroup)
  };
}

// Parse a full address string into components (e.g. "123 Main St, Springfield, IL 62701")
function parseAddress(fullAddress: string) {
  const parts = fullAddress.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    const stateZip = parts[parts.length - 1];
    const stateMatch = stateZip.match(/([A-Z]{2})\s*(\d{5})?/);

    return {
      address: parts[0],
      city: parts[parts.length - 2] || '',
      state: stateMatch ? stateMatch[1] : '',
      zipCode: stateMatch ? stateMatch[2] || '' : ''
    };
  }

  return { address: fullAddress, city: '', state: '', zipCode: '' };
}

// Heuristically detect group characteristics from name/category/snippet text
function detectGroupTraits(name: string, extra: string = '') {
  const text = `${name} ${extra}`.toLowerCase();
  const isPeerLed = /peer|\baa\b|\bna\b|12.?step|anonymous|self.?help|nami|dbsa/i.test(text);
  const isTherapist = /therapist|counselor|psycholog|psychiatr|clinic|professional|licensed|lcsw|lmft|phd|\bmd\b/i.test(text);
  const isIndividual = /individual|private|1.?on.?1|one.?on.?one/i.test(text) && !/group/i.test(text);
  const isFree = /free|no.?cost|sliding.?scale/i.test(text);
  const isYouth = /teen|adolescent|youth|child|children|\bkid\b|minor|pediatric|school/i.test(text);
  const isAdult = /adult|senior|elder|geriatric/i.test(text) && !isYouth;

  let groupType = 'Support Group';
  if (/\baa\b|alcoholics anonymous|\bna\b|narcotics anonymous|12.?step/i.test(text)) groupType = '12-Step';
  else if (isIndividual) groupType = 'Individual Counseling';
  else if (/grief|bereavement/i.test(text)) groupType = 'Grief Support';
  else if (/church|faith|ministry/i.test(text)) groupType = 'Faith-Based';
  else if (isPeerLed && !isTherapist) groupType = 'Peer Support';
  else if (isTherapist) groupType = 'Therapy Group';

  return {
    isGroup: !isIndividual,
    isPeerLed: isPeerLed && !isTherapist,
    isFree,
    isYouth,
    isAdult: isAdult && !isYouth,
    groupType
  };
}

// Filter out places that clearly aren't support resources
function isRelevantPlace(place: SerperPlace, topic: string): boolean {
  const combined = `${place.title} ${place.category || ''} ${place.type || ''}`.toLowerCase();

  const positiveKeywords = [
    'support', 'mental health', 'counseling', 'therapy', 'recovery',
    'nami', 'dbsa', 'community', 'wellness', 'peer', 'group', 'center',
    topic.toLowerCase()
  ];
  const negativeKeywords = ['insurance', 'pharmacy', 'urgent care', 'detox center'];

  return positiveKeywords.some(kw => combined.includes(kw)) &&
    !negativeKeywords.some(kw => combined.includes(kw));
}

// Build a Serper query string reflecting the active filters
function buildQuery(params: SearchParams, isOnline: boolean): string {
  const parts = [params.topic];

  if (params.sessionType === 'Group Only') {
    parts.push('group');
  } else if (params.sessionType === 'Individual Only') {
    parts.push('individual counseling therapist');
  } else {
    parts.push('support group');
  }

  if (params.leadershipType === 'Peer-Led') {
    parts.push('peer support peer-led');
  } else if (params.leadershipType === 'Therapist-Led') {
    parts.push('therapist professional licensed');
  }

  if (params.ageGroup === 'Youth (Under 18)') {
    parts.push('teen adolescent youth');
  } else if (params.ageGroup === 'Adult (18+)') {
    parts.push('adult');
  }

  if (isOnline) {
    parts.push('online virtual');
  } else {
    parts.push(`near ${params.location}`);
  }

  return parts.join(' ');
}

const PHONE_REGEX = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

// In-memory cache: repeat searches are common (back-navigation, filter
// tweaking, multiple users in one area) and each Serper call costs quota.
// Serverless instances keep this for their warm lifetime; the Vite dev
// server keeps it for the whole session.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const searchCache = new Map<string, { expires: number; results: SearchResultItem[] }>();

function cacheKey(params: SearchParams): string {
  return [
    params.topic.toLowerCase(),
    params.location.toLowerCase(),
    params.meetingType || '',
    params.sessionType || '',
    params.leadershipType || '',
    params.ageGroup || ''
  ].join('|');
}

// Perform the search against the Serper API and normalize results
export async function performSearch(params: SearchParams, apiKey: string): Promise<SearchResultItem[]> {
  const key = cacheKey(params);
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.results;
  }

  const isOnline = params.meetingType === 'Online';
  const query = buildQuery(params, isOnline);

  const endpoint = isOnline
    ? 'https://google.serper.dev/search'
    : 'https://google.serper.dev/places';

  const fetchPage = async (page: number): Promise<SerperResponse> => {
    const body = isOnline
      ? { q: query, num: 20, page, gl: 'us', hl: 'en' }
      : { q: query, location: params.location, gl: 'us', hl: 'en', page };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Serper API error: ${res.status}`);
    }
    return res.json() as Promise<SerperResponse>;
  };

  // Fetch two pages in parallel for broader coverage; tolerate page-2 failure
  const [page1, page2] = await Promise.all([
    fetchPage(1),
    fetchPage(2).catch(() => ({} as SerperResponse))
  ]);

  const results: SearchResultItem[] = [];
  const seen = new Set<string>();

  if (isOnline) {
    const organic = [...(page1.organic || []), ...(page2.organic || [])];
    const topicLower = params.topic.toLowerCase();

    for (const item of organic) {
      if (!item.title || !item.link) continue;
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;

      const combined = `${item.title} ${item.snippet || ''}`.toLowerCase();
      const relevant = ['support', 'group', 'mental health', 'therapy', 'counseling', topicLower]
        .some(kw => combined.includes(kw));
      if (!relevant) continue;

      seen.add(key);
      const traits = detectGroupTraits(item.title, item.snippet || '');
      const phoneMatch = (item.snippet || '').match(PHONE_REGEX);

      results.push({
        name: item.title.replace(/ [-|–] .*$/, '').trim(),
        description: (item.snippet || '').slice(0, 300),
        location: 'Online',
        phoneNumber: phoneMatch ? phoneMatch[0] : null,
        website: item.link,
        url: item.link,
        isOnline: true,
        ...traits
      });
    }
  } else {
    const places = [...(page1.places || []), ...(page2.places || [])];

    for (const place of places) {
      if (!place.title) continue;
      const key = `${place.title}|${place.address || ''}`.toLowerCase();
      if (seen.has(key)) continue;
      if (!isRelevantPlace(place, params.topic)) continue;

      seen.add(key);
      const parsed = parseAddress(place.address || '');
      const traits = detectGroupTraits(place.title, `${place.category || ''} ${place.type || ''}`);

      results.push({
        name: place.title,
        description: place.category || `${params.topic} support services`,
        location: `${parsed.city || params.location}${parsed.state ? ', ' + parsed.state : ''}`,
        address: parsed.address || undefined,
        city: parsed.city || undefined,
        state: parsed.state || undefined,
        zipCode: parsed.zipCode || undefined,
        latitude: place.latitude,
        longitude: place.longitude,
        phoneNumber: place.phoneNumber || null,
        website: place.website || null,
        url: place.website ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.title} ${place.address || ''}`)}`,
        rating: place.rating ?? null,
        reviewCount: place.ratingCount ?? null,
        isOnline: false,
        ...traits
      });
    }
  }

  // Evict the oldest entry once the cache is full (Map preserves insertion order)
  if (searchCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  searchCache.set(key, { expires: Date.now() + CACHE_TTL_MS, results });

  return results;
}
