import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseFeed, groupMeetings, filterAndRank, parseFeedList, fetchMeetings, __clearFeedCache
} from '../lib/meetingsCore';
import { typeCodesToLabels, formatTime, sessionLabel } from '../lib/meetingFormat';
import { nextOccurrence, buildNextOccurrenceICS } from '../lib/ics';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEED = JSON.parse(readFileSync(join(__dirname, 'fixtures/meetingGuideFeed.json'), 'utf-8'));

describe('parseFeed', () => {
  it('parses valid records and skips by-appointment / malformed ones', () => {
    const meetings = parseFeed(FEED, 'test-feed');
    // "By Appointment Only" (no day/time) must be dropped
    expect(meetings.some(m => m.name === 'By Appointment Only')).toBe(false);
    // 6 records, 1 dropped => 5 parsed
    expect(meetings.length).toBe(5);
  });

  it('detects online meetings via ONL type or conference_url', () => {
    const meetings = parseFeed(FEED, 'test-feed');
    const online = meetings.find(m => m.name === 'Sunday Serenity')!;
    expect(online.isOnline).toBe(true);
    expect(online.conferenceUrl).toBe('https://zoom.us/j/123456789');
    expect(online.timezone).toBe('America/New_York');
  });

  it('expands array days into multiple sessions', () => {
    const meetings = parseFeed(FEED, 'test-feed');
    const womens = meetings.find(m => m.name === "Multi-day Women's Meeting")!;
    expect(womens.sessions.map(s => s.day).sort()).toEqual([2, 4]);
  });

  it('uses entity as the source label', () => {
    const meetings = parseFeed(FEED, 'test-feed');
    expect(meetings.find(m => m.name === 'Sunday Serenity')!.source).toBe('Online Intergroup of AA');
  });

  it('returns [] for non-array input', () => {
    expect(parseFeed({ not: 'an array' }, 'x')).toEqual([]);
    expect(parseFeed(null, 'x')).toEqual([]);
  });
});

describe('groupMeetings', () => {
  it('merges the same group at the same address into one entry with all sessions', () => {
    const grouped = groupMeetings(parseFeed(FEED, 'test-feed'));
    const downtown = grouped.find(m => m.name === 'Downtown Daily Reflections')!;
    // Monday + Wednesday merged
    expect(downtown.sessions.map(s => s.day).sort()).toEqual([1, 3]);
    // Type union across both nights
    expect(downtown.types).toEqual(expect.arrayContaining(['C', 'BB', 'O', 'D']));
  });

  it('keeps meetings with the same name at different places separate', () => {
    const grouped = groupMeetings(parseFeed(FEED, 'test-feed'));
    // Austin downtown vs Seattle far-away are distinct entries
    expect(grouped.filter(m => m.city === 'Austin' || m.city === 'Seattle').length).toBeGreaterThanOrEqual(2);
  });
});

describe('filterAndRank', () => {
  const grouped = () => groupMeetings(parseFeed(FEED, 'test-feed'));

  it('online-only returns just online meetings', () => {
    const res = filterAndRank(grouped(), { meetingType: 'Online' });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every(m => m.isOnline)).toBe(true);
  });

  it('in-person within radius is ranked by distance from coords', () => {
    // Austin coordinates -> Austin meetings near, Seattle far (>75mi excluded)
    const res = filterAndRank(grouped(), { meetingType: 'In-Person', latitude: 30.2672, longitude: -97.7431 });
    expect(res.every(m => !m.isOnline)).toBe(true);
    expect(res.some(m => m.city === 'Austin')).toBe(true);
    expect(res.some(m => m.city === 'Seattle')).toBe(false); // beyond 75 miles
    // distances populated and ascending
    const dists = res.map(m => m.distanceMiles ?? Infinity);
    expect(dists).toEqual([...dists].sort((a, b) => a - b));
  });

  it('falls back to city/state text match when no coordinates', () => {
    const res = filterAndRank(grouped(), { meetingType: 'In-Person', location: 'Austin, TX' });
    expect(res.some(m => m.city === 'Austin')).toBe(true);
    expect(res.some(m => m.city === 'Seattle')).toBe(false);
  });

  it('respects maxResults', () => {
    const res = filterAndRank(grouped(), { meetingType: 'All Types', latitude: 30.2672, longitude: -97.7431, maxResults: 1 });
    expect(res.length).toBeLessThanOrEqual(1);
  });
});

describe('typeCodesToLabels', () => {
  it('maps codes to human labels, prioritized and de-duplicated', () => {
    const labels = typeCodesToLabels(['D', 'O', 'X', 'ONL']);
    expect(labels[0]).toBe('Open'); // priority-sorted ahead of Discussion
    expect(labels).toContain('Wheelchair accessible');
    expect(labels).toContain('Online');
  });

  it('collapses G/L/T/LGBTQ into a single LGBTQ+ label', () => {
    expect(typeCodesToLabels(['G', 'L', 'T'])).toEqual(['LGBTQ+']);
  });

  it('ignores unknown codes', () => {
    expect(typeCodesToLabels(['ZZZ', 'O'])).toEqual(['Open']);
  });
});

describe('formatTime / sessionLabel', () => {
  it('formats 24h to 12h', () => {
    expect(formatTime('19:00')).toBe('7:00 PM');
    expect(formatTime('00:30')).toBe('12:30 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('09:05')).toBe('9:05 AM');
  });

  it('builds a readable session label', () => {
    expect(sessionLabel({ day: 1, time: '19:00' })).toBe('Mon 7:00 PM');
    expect(sessionLabel({ day: 1, time: '19:00', endTime: '20:30' }, { long: true })).toBe('Monday 7:00 PM–8:30 PM');
  });
});

describe('parseFeedList', () => {
  it('splits and validates URLs', () => {
    expect(parseFeedList('https://a.org/feed, https://b.org/feed ,not-a-url'))
      .toEqual(['https://a.org/feed', 'https://b.org/feed']);
    expect(parseFeedList(undefined)).toEqual([]);
    expect(parseFeedList('')).toEqual([]);
  });
});

describe('nextOccurrence (timezone-aware)', () => {
  it('computes the correct UTC instant for an Eastern-time meeting in winter', () => {
    // Next Sunday is 2026-01-11. 19:00 EST (UTC-5) crosses midnight -> 2026-01-12 00:00 UTC
    const now = new Date('2026-01-07T17:00:00Z');
    const occ = nextOccurrence([{ day: 0, time: '19:00' }], now, 'America/New_York');
    expect(occ).not.toBeNull();
    expect(occ!.start.toISOString()).toBe('2026-01-12T00:00:00.000Z');
  });

  it('accounts for daylight saving in summer', () => {
    // Sunday 19:00 ET in July = EDT (UTC-4) => 23:00 UTC
    const now = new Date('2026-07-06T12:00:00Z'); // a Monday
    const occ = nextOccurrence([{ day: 0, time: '19:00' }], now, 'America/New_York');
    expect(occ!.start.toISOString()).toBe('2026-07-12T23:00:00.000Z');
  });

  it('picks the soonest session across multiple days', () => {
    const now = new Date('2026-01-05T12:00:00Z'); // Monday
    const occ = nextOccurrence([
      { day: 0, time: '19:00' }, // Sunday
      { day: 2, time: '10:00' }  // Tuesday (sooner)
    ], now, 'America/New_York');
    expect(occ!.session.day).toBe(2);
  });

  it('returns null when there are no sessions', () => {
    expect(nextOccurrence([], new Date())).toBeNull();
  });
});

describe('buildNextOccurrenceICS', () => {
  const meeting = {
    name: 'Sunday, Serenity; Group',
    meetingSchedule: [{ day: 0, time: '19:00', endTime: '20:00' }],
    timezone: 'America/New_York',
    conferenceUrl: 'https://zoom.us/j/123',
    meetingTypes: ['Open', 'Online'],
    url: 'https://example.org/m/1'
  };

  it('produces a valid VEVENT with correct UTC times', () => {
    // Sun 19:00–20:00 EST -> 2026-01-12 00:00–01:00 UTC
    const ics = buildNextOccurrenceICS(meeting, new Date('2026-01-07T17:00:00Z'))!;
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('DTSTART:20260112T000000Z');
    expect(ics).toContain('DTEND:20260112T010000Z');
  });

  it('escapes commas and semicolons in the summary', () => {
    const ics = buildNextOccurrenceICS(meeting, new Date('2026-01-07T17:00:00Z'))!;
    expect(ics).toContain('SUMMARY:Sunday\\, Serenity\\; Group');
  });

  it('returns null when there is no schedule', () => {
    expect(buildNextOccurrenceICS({ name: 'x' })).toBeNull();
  });
});

describe('fetchMeetings (with injected fetch)', () => {
  beforeEach(() => __clearFeedCache());

  const mockFetch = (payload: unknown) =>
    async () => ({ ok: true, status: 200, json: async () => payload });

  it('returns [] when no feeds configured', async () => {
    const res = await fetchMeetings({ meetingType: 'Online' }, [], mockFetch(FEED));
    expect(res).toEqual([]);
  });

  it('fetches, parses, groups and filters a feed', async () => {
    const res = await fetchMeetings(
      { meetingType: 'Online' },
      ['https://example.org/feed.json'],
      mockFetch(FEED)
    );
    expect(res.length).toBeGreaterThan(0);
    expect(res.every(m => m.isOnline)).toBe(true);
  });

  it('tolerates a failing feed without throwing', async () => {
    const failing = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const res = await fetchMeetings({ meetingType: 'Online' }, ['https://bad.org/feed'], failing);
    expect(res).toEqual([]);
  });

  it('caches feed results across calls', async () => {
    let calls = 0;
    const counting = async () => { calls++; return { ok: true, status: 200, json: async () => FEED }; };
    await fetchMeetings({ meetingType: 'Online' }, ['https://example.org/feed.json'], counting);
    await fetchMeetings({ meetingType: 'Online' }, ['https://example.org/feed.json'], counting);
    expect(calls).toBe(1); // second call served from cache
  });
});
