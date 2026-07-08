// Server-side Meeting Guide feed integration.
// Fetches one or more Meeting Guide JSON feeds (the open, non-proprietary
// format used by AA/NA/Al-Anon intergroups - see github.com/code4recovery/spec),
// normalizes and groups them, and returns meetings relevant to a search.
// Used by both the Vercel function (api/meetings.ts) and the Vite dev
// middleware, so dev and prod behave identically.
//
// Operators choose which feeds to use via the MEETING_GUIDE_FEEDS env var
// (comma-separated URLs). With none configured, every call returns []
// and the app behaves exactly as before.

import type { MeetingSession } from '../types';
import { typeCodesToLabels } from './meetingFormat';

export interface MeetingQuery {
  meetingType?: string;   // 'Online' | 'In-Person' | 'All Types'
  latitude?: number;
  longitude?: number;
  location?: string;      // free-text location for fallback city/state matching
  maxResults?: number;
}

export interface NormalizedMeeting {
  name: string;
  group?: string;
  location?: string;      // venue / landmark name
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  sessions: MeetingSession[];
  types: string[];        // raw codes
  typeLabels: string[];   // human labels
  isOnline: boolean;
  conferenceUrl?: string;
  conferencePhone?: string;
  timezone?: string;
  notes?: string;
  url?: string;
  source: string;         // entity / feed-derived label
  distanceMiles?: number; // populated during ranking when coords are known
}

const FETCH_TIMEOUT_MS = 8000;
const FEED_CACHE_TTL_MS = 60 * 60 * 1000; // feeds update ~daily; 1h is plenty
const DEFAULT_MAX_RESULTS = 40;
const MAX_INPERSON_RADIUS_MILES = 75;

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

// Per-feed cache of normalized meetings (feeds are independent and reusable
// across requests). Survives the warm lifetime of a serverless instance.
const feedCache = new Map<string, { expires: number; meetings: NormalizedMeeting[] }>();

// ---- Geo ----

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---- Parsing ----

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeTime(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const m = /^(\d{1,2}):(\d{2})/.exec(v.trim());
  if (!m) return undefined;
  const hh = Math.min(23, parseInt(m[1], 10));
  return `${String(hh).padStart(2, '0')}:${m[2]}`;
}

function normalizeDays(v: unknown): number[] {
  const arr = Array.isArray(v) ? v : [v];
  const days: number[] = [];
  for (const d of arr) {
    const n = toNumber(d);
    if (n !== undefined && n >= 0 && n <= 6 && !days.includes(n)) days.push(n);
  }
  return days;
}

function normalizeTypes(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(t => typeof t === 'string').map(t => t.trim().toUpperCase()).filter(Boolean);
}

// Parse a single raw Meeting Guide record into our normalized shape.
// Returns null for records lacking the essentials (name + a time).
function parseRecord(raw: any, feedLabel: string): NormalizedMeeting | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const days = normalizeDays(raw.day);
  const time = normalizeTime(raw.time);
  if (days.length === 0 || !time) return null; // by-appointment / malformed: skip

  const endTime = normalizeTime(raw.end_time);
  const sessions: MeetingSession[] = days.map(day => ({ day, time, ...(endTime ? { endTime } : {}) }));

  const types = normalizeTypes(raw.types);
  const conferenceUrl = typeof raw.conference_url === 'string' && /^https?:\/\//.test(raw.conference_url)
    ? raw.conference_url.trim() : undefined;
  const isOnline = types.includes('ONL') || Boolean(conferenceUrl);

  // Address: prefer split fields, fall back to formatted_address
  let address = typeof raw.address === 'string' ? raw.address.trim() : undefined;
  const city = typeof raw.city === 'string' ? raw.city.trim() : undefined;
  const state = typeof raw.state === 'string' ? raw.state.trim() : undefined;
  const postalCode = raw.postal_code != null ? String(raw.postal_code).trim() : undefined;
  if (!address && typeof raw.formatted_address === 'string') {
    address = raw.formatted_address.split(',')[0].trim();
  }

  const source = typeof raw.entity === 'string' && raw.entity.trim()
    ? raw.entity.trim()
    : feedLabel;

  return {
    name: name.slice(0, 120),
    group: typeof raw.group === 'string' ? raw.group.trim() : undefined,
    location: typeof raw.location === 'string' ? raw.location.trim() : undefined,
    address,
    city,
    state,
    postalCode,
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    sessions,
    types,
    typeLabels: typeCodesToLabels(types),
    isOnline,
    conferenceUrl,
    conferencePhone: typeof raw.conference_phone === 'string' ? raw.conference_phone.trim() : undefined,
    timezone: typeof raw.timezone === 'string' ? raw.timezone.trim() : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes.trim().slice(0, 300) : undefined,
    url: typeof raw.url === 'string' ? raw.url.trim() : (typeof raw.website === 'string' ? raw.website.trim() : undefined),
    source
  };
}

// Parse a whole feed (array of records) into normalized meetings.
export function parseFeed(data: unknown, feedLabel: string): NormalizedMeeting[] {
  if (!Array.isArray(data)) return [];
  const out: NormalizedMeeting[] = [];
  for (const raw of data) {
    const m = parseRecord(raw, feedLabel);
    if (m) out.push(m);
  }
  return out;
}

// Merge meetings that are the same group at the same place into one entry
// with all their weekly sessions, so we show "First Church — Mon 7pm, Wed 6:30pm"
// instead of a separate card per night.
export function groupMeetings(meetings: NormalizedMeeting[]): NormalizedMeeting[] {
  const byKey = new Map<string, NormalizedMeeting>();

  for (const m of meetings) {
    const place = m.isOnline ? (m.conferenceUrl || 'online') : (m.address || m.location || '');
    const key = `${(m.group || m.name).toLowerCase()}|${place.toLowerCase()}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, { ...m, sessions: [...m.sessions], types: [...m.types] });
      continue;
    }

    // Merge sessions (dedupe by day+time)
    for (const s of m.sessions) {
      if (!existing.sessions.some(e => e.day === s.day && e.time === s.time)) {
        existing.sessions.push(s);
      }
    }
    // Union of types -> refresh labels
    for (const t of m.types) if (!existing.types.includes(t)) existing.types.push(t);
    existing.typeLabels = typeCodesToLabels(existing.types);
    // Fill any missing contact/geo from the duplicate
    existing.conferenceUrl ||= m.conferenceUrl;
    existing.conferencePhone ||= m.conferencePhone;
    existing.latitude ??= m.latitude;
    existing.longitude ??= m.longitude;
    existing.url ||= m.url;
    existing.notes ||= m.notes;
  }

  return [...byKey.values()];
}

// Filter to meetings relevant to the query and rank them.
export function filterAndRank(meetings: NormalizedMeeting[], query: MeetingQuery): NormalizedMeeting[] {
  const max = query.maxResults ?? DEFAULT_MAX_RESULTS;
  const wantOnline = query.meetingType !== 'In-Person';
  const wantInPerson = query.meetingType !== 'Online';

  const online: NormalizedMeeting[] = [];
  const inPerson: NormalizedMeeting[] = [];

  for (const m of meetings) {
    if (m.isOnline) {
      if (wantOnline) online.push(m);
      continue;
    }
    if (!wantInPerson) continue;

    if (query.latitude != null && query.longitude != null && m.latitude != null && m.longitude != null) {
      const d = haversineMiles(query.latitude, query.longitude, m.latitude, m.longitude);
      if (d <= MAX_INPERSON_RADIUS_MILES) {
        inPerson.push({ ...m, distanceMiles: Math.round(d * 10) / 10 });
      }
    } else if (query.location) {
      // No coordinates: keep meetings whose city/state matches the typed text
      const loc = query.location.toLowerCase();
      const hay = `${m.city || ''} ${m.state || ''} ${m.address || ''}`.toLowerCase();
      const tokens = loc.split(/[\s,]+/).filter(t => t.length >= 2);
      if (tokens.some(t => hay.includes(t))) inPerson.push(m);
    }
    // else: in-person with no geo and no location text -> can't place it, drop
  }

  // Nearest in-person first; online meetings after (universally reachable)
  inPerson.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));

  const inPersonCap = Math.ceil(max * 0.65);
  const onlineCap = max - Math.min(inPerson.length, inPersonCap);

  return [...inPerson.slice(0, inPersonCap), ...online.slice(0, Math.max(onlineCap, 0))];
}

// ---- Fetching ----

async function fetchFeed(url: string, fetchImpl: FetchLike): Promise<NormalizedMeeting[]> {
  const cached = feedCache.get(url);
  if (cached && cached.expires > Date.now()) return cached.meetings;

  let meetings: NormalizedMeeting[] = [];
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : undefined;
    try {
      const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
      if (res.ok) {
        const data = await res.json();
        const label = feedLabelFromUrl(url);
        meetings = groupMeetings(parseFeed(data, label));
      } else {
        console.warn(`Meeting feed ${url} returned HTTP ${res.status}`);
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err) {
    console.warn(`Meeting feed ${url} fetch failed:`, (err as Error).message);
  }

  // Cache even empty results briefly to avoid hammering a failing feed
  feedCache.set(url, { expires: Date.now() + FEED_CACHE_TTL_MS, meetings });
  return meetings;
}

function feedLabelFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Meeting Guide';
  }
}

// Parse the MEETING_GUIDE_FEEDS env value into a clean list of URLs.
export function parseFeedList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(s => /^https?:\/\//.test(s));
}

// Top-level entry: fetch all configured feeds (in parallel, fault-tolerant),
// then filter and rank for this query.
export async function fetchMeetings(
  query: MeetingQuery,
  feedUrls: string[],
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<NormalizedMeeting[]> {
  if (!feedUrls.length) return [];
  const perFeed = await Promise.all(feedUrls.map(url => fetchFeed(url, fetchImpl)));
  const combined = perFeed.flat();
  return filterAndRank(combined, query);
}

// Exposed for tests so cache state doesn't leak between cases.
export function __clearFeedCache(): void {
  feedCache.clear();
}
