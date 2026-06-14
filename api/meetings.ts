// Vercel Serverless Function - Meeting Guide feed proxy.
// Fetches configured Meeting Guide JSON feeds server-side (avoids browser
// CORS), normalizes them, and returns meetings relevant to the search.
// Configure feeds via the MEETING_GUIDE_FEEDS env var (comma-separated URLs).
// With none configured, returns an empty list and the app is unaffected.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchMeetings, parseFeedList, type MeetingQuery } from '../lib/meetingsCore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const feeds = parseFeedList(process.env.MEETING_GUIDE_FEEDS);
  if (feeds.length === 0) {
    // No feeds configured - feature is simply inactive.
    return res.status(200).json({ meetings: [] });
  }

  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const query: MeetingQuery = {
      meetingType: typeof body.meetingType === 'string' ? body.meetingType : undefined,
      latitude: typeof body.latitude === 'number' ? body.latitude : undefined,
      longitude: typeof body.longitude === 'number' ? body.longitude : undefined,
      location: typeof body.location === 'string' ? body.location.slice(0, 100) : undefined
    };

    const meetings = await fetchMeetings(query, feeds);
    return res.status(200).json({ meetings });
  } catch (error) {
    console.error('Meetings API error:', error);
    return res.status(500).json({ error: 'Meeting lookup failed', meetings: [] });
  }
}
