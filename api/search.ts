// Vercel Serverless Function - API key stays server-side
// This file runs on Vercel's servers, NOT in the browser.
// The actual search logic lives in lib/searchCore.ts and is shared
// with the Vite dev-server middleware so dev and prod behave the same.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { performSearch, validateParams } from '../lib/searchCore';

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

  const params = validateParams(req.body);
  if (!params) {
    return res.status(400).json({ error: 'Topic and location are required' });
  }

  try {
    const results = await performSearch(params, SERPER_API_KEY);
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({ error: 'Search failed', results: [] });
  }
}
