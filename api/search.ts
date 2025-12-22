// Vercel Serverless Function - API key stays server-side
// This file runs on Vercel's servers, NOT in the browser

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SerperPlace {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  ratingCount?: number;
  category?: string;
  phoneNumber?: string;
  website?: string;
}

interface SerperPlacesResponse {
  places?: SerperPlace[];
}

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperSearchResponse {
  organic?: SerperSearchResult[];
}

// Parse address into components
function parseAddress(fullAddress: string) {
  const parts = fullAddress.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    const stateZip = parts[parts.length - 1].trim();
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

// Determine group type
function determineGroupType(name: string, category?: string): string {
  const combined = (name + ' ' + (category || '')).toLowerCase();

  if (combined.includes('aa') || combined.includes('alcoholics anonymous')) return '12-Step';
  if (combined.includes('na') || combined.includes('narcotics anonymous')) return '12-Step';
  if (combined.includes('therapy') || combined.includes('counseling')) return 'Therapy Group';
  if (combined.includes('peer') || combined.includes('nami')) return 'Peer Support';
  if (combined.includes('church') || combined.includes('faith')) return 'Faith-Based';
  if (combined.includes('grief')) return 'Grief Support';

  return 'Support Group';
}

// Check if place is relevant
function isRelevantPlace(place: SerperPlace, topic: string): boolean {
  const combined = (place.title + ' ' + (place.category || '')).toLowerCase();
  const lowerTopic = topic.toLowerCase();

  const positiveKeywords = [
    'support', 'mental health', 'counseling', 'therapy', 'recovery',
    'nami', 'dbsa', 'aa', 'na', 'community', 'wellness', 'peer', 'group',
    lowerTopic
  ];

  const negativeKeywords = ['insurance', 'pharmacy', 'hospital', 'detox center'];

  const hasPositive = positiveKeywords.some(kw => combined.includes(kw));
  const hasNegative = negativeKeywords.some(kw => combined.includes(kw));

  return hasPositive && !hasNegative;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment (server-side only - never exposed to client)
  const SERPER_API_KEY = process.env.SERPER_API_KEY;

  if (!SERPER_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { topic, location, meetingType, costFilter } = req.body;

    if (!topic || !location) {
      return res.status(400).json({ error: 'Topic and location are required' });
    }

    let query = `${topic} support group`;
    if (costFilter === 'Free Only') query += ' free';

    // Use Places API for in-person, Search API for online
    const isOnline = meetingType === 'Online';
    const endpoint = isOnline
      ? 'https://google.serper.dev/search'
      : 'https://google.serper.dev/places';

    const requestBody = isOnline
      ? { q: `${topic} online support group virtual`, num: 15, gl: 'us' }
      : { q: query, location: location, gl: 'us', hl: 'en' };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();

    let results;

    if (isOnline) {
      // Process search results
      const searchData = data as SerperSearchResponse;
      const phoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

      results = (searchData.organic || [])
        .filter(result => {
          const combined = (result.title + ' ' + result.snippet).toLowerCase();
          return ['support', 'group', 'mental health', topic.toLowerCase()]
            .some(kw => combined.includes(kw));
        })
        .slice(0, 8)
        .map(result => {
          const phones = result.snippet.match(phoneRegex);
          return {
            name: result.title.replace(/ - .*$/, '').replace(/\|.*$/, '').trim(),
            description: result.snippet.slice(0, 200),
            location: 'Online',
            phoneNumber: phones ? phones[0] : null,
            website: result.link,
            url: result.link,
            isOnline: true,
            groupType: determineGroupType(result.title)
          };
        });
    } else {
      // Process places results
      const placesData = data as SerperPlacesResponse;

      results = (placesData.places || [])
        .filter(place => isRelevantPlace(place, topic))
        .slice(0, 10)
        .map(place => {
          const parsed = parseAddress(place.address);

          return {
            name: place.title,
            description: place.category || `${topic} support services`,
            location: `${parsed.city || location}${parsed.state ? ', ' + parsed.state : ''}`,
            address: parsed.address,
            city: parsed.city,
            state: parsed.state,
            zipCode: parsed.zipCode,
            latitude: place.latitude,
            longitude: place.longitude,
            phoneNumber: place.phoneNumber || null,
            website: place.website || null,
            url: place.website || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title + ' ' + place.address)}`,
            rating: place.rating || null,
            reviewCount: place.ratingCount || null,
            isOnline: false,
            groupType: determineGroupType(place.title, place.category)
          };
        });
    }

    return res.status(200).json({ results });

  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
}
