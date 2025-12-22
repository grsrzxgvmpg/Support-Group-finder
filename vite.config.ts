import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const SERPER_API_KEY = env.SERPER_API_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
          manifest: {
            name: 'Support Group Finder',
            short_name: 'Support Groups',
            description: 'Find local and online support groups near you. Connect with community resources for mental health, addiction, grief, and more.',
            theme_color: '#0D9488',
            background_color: '#ffffff',
            display: 'standalone',
            scope: '/',
            start_url: '/',
            categories: ['healthcare', 'lifestyle'],
            screenshots: [
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              }
            ],
            icons: [
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            navigateFallback: '/index.html',
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/(nominatim\.openstreetmap\.org|google\.serper\.dev)\//,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'external-apis',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60
                  }
                }
              },
              {
                urlPattern: /^\/api\//,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 12 * 60 * 60
                  }
                }
              }
            ]
          }
        }),
        // Custom plugin to handle /api/search during dev
        {
          name: 'api-search-handler',
          configureServer(server) {
            server.middlewares.use('/api/search', async (req, res) => {
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.end(JSON.stringify({ error: 'Method not allowed' }));
                return;
              }

              // Read request body
              let body = '';
              for await (const chunk of req) {
                body += chunk;
              }

              try {
                const { topic, location, meetingType, sessionType, leadershipType, ageGroup } = JSON.parse(body);
                const isOnline = meetingType === 'Online';

                // Build query with filters
                let queryParts = [topic];

                // Session type (group vs individual)
                if (sessionType === 'Group Only') {
                  queryParts.push('group');
                } else if (sessionType === 'Individual Only') {
                  queryParts.push('individual counseling therapist');
                } else {
                  queryParts.push('support group'); // default
                }

                // Leadership type
                if (leadershipType === 'Peer-Led') {
                  queryParts.push('peer support peer-led');
                } else if (leadershipType === 'Therapist-Led') {
                  queryParts.push('therapist professional licensed');
                }

                // Age group filter
                if (ageGroup === 'Youth (Under 18)') {
                  queryParts.push('teen adolescent youth child children');
                } else if (ageGroup === 'Adult (18+)') {
                  queryParts.push('adult');
                }

                // Include location in query for better local results
                const query = isOnline
                  ? `${queryParts.join(' ')} online virtual`
                  : `${queryParts.join(' ')} near ${location}`;

                // Call Serper API - fetch multiple pages for more results
                const serperUrl = isOnline
                  ? 'https://google.serper.dev/search'
                  : 'https://google.serper.dev/places';

                // Helper to fetch a single page
                const fetchPage = async (page: number) => {
                  const serperBody = isOnline
                    ? { q: query, num: 20, page }
                    : { q: query, location: location, gl: 'us', num: 20, page };

                  const res = await fetch(serperUrl, {
                    method: 'POST',
                    headers: {
                      'X-API-KEY': SERPER_API_KEY,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(serperBody)
                  });

                  if (!res.ok) {
                    throw new Error(`Serper API error: ${res.status}`);
                  }
                  return res.json();
                };

                // Fetch first 2 pages in parallel to get more results (up to ~40)
                const [page1, page2] = await Promise.all([
                  fetchPage(1),
                  fetchPage(2)
                ]);

                // Combine results from both pages
                const data = {
                  organic: [...(page1.organic || []), ...(page2.organic || [])],
                  places: [...(page1.places || []), ...(page2.places || [])]
                };

                // Helper to detect group characteristics from name/type
                const detectGroupType = (name: string, type: string = '') => {
                  const text = `${name} ${type}`.toLowerCase();
                  const isPeerLed = /peer|aa\b|na\b|12.?step|anonymous|self.?help|nami/i.test(text);
                  const isTherapist = /therapist|counselor|psycholog|psychiatr|clinic|professional|licensed|lcsw|lmft|phd|md\b/i.test(text);
                  const isIndividual = /individual|private|counseling|therapy session|1.?on.?1|one.?on.?one/i.test(text) && !/group/i.test(text);
                  const isFree = /free|no.?cost|sliding.?scale|community/i.test(text);
                  const isYouth = /teen|adolescent|youth|child|children|kid|minor|young|pediatric|school/i.test(text);
                  const isAdult = /adult|senior|elder|geriatric|mature/i.test(text) && !isYouth;

                  return {
                    isGroup: !isIndividual,
                    isPeerLed: isPeerLed && !isTherapist,
                    isFree: isFree,
                    isYouth: isYouth,
                    isAdult: isAdult && !isYouth,
                    groupType: isIndividual ? 'Individual Counseling' :
                               isPeerLed ? 'Peer Support' :
                               isTherapist ? 'Therapy Group' :
                               'Support Group'
                  };
                };

                // Parse results - return all results, pagination handled client-side
                let results: any[] = [];
                const seenTitles = new Set<string>();

                if (isOnline && data.organic) {
                  for (const item of data.organic) {
                    const key = item.title?.toLowerCase() || item.link;
                    if (seenTitles.has(key)) continue;
                    seenTitles.add(key);

                    const detected = detectGroupType(item.title, item.snippet || '');
                    results.push({
                      name: item.title,
                      description: item.snippet || '',
                      location: 'Online',
                      website: item.link,
                      url: item.link,
                      isOnline: true,
                      isGroup: detected.isGroup,
                      isPeerLed: detected.isPeerLed,
                      isFree: detected.isFree,
                      isYouth: detected.isYouth,
                      isAdult: detected.isAdult,
                      groupType: detected.groupType
                    });
                  }
                } else if (data.places) {
                  for (const place of data.places) {
                    const key = (place.title + (place.address || '')).toLowerCase();
                    if (seenTitles.has(key)) continue;
                    seenTitles.add(key);

                    const detected = detectGroupType(place.title, place.type || '');
                    // Extract coordinates from gps_coordinates object
                    const coords = place.gps_coordinates || {};
                    results.push({
                      name: place.title,
                      description: place.address || '',
                      location: place.city || location,
                      address: place.address,
                      city: place.city,
                      state: place.state,
                      zipCode: place.zipCode,
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                      phoneNumber: place.phoneNumber,
                      website: place.website,
                      url: place.website || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title + ' ' + (place.address || ''))}`,
                      rating: place.rating,
                      reviewCount: place.ratingCount,
                      isOnline: false,
                      isGroup: detected.isGroup,
                      isPeerLed: detected.isPeerLed,
                      isFree: detected.isFree,
                      isYouth: detected.isYouth,
                      isAdult: detected.isAdult,
                      groupType: detected.groupType
                    });
                  }
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ results }));
              } catch (error: any) {
                console.error('API search error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message, results: [] }));
              }
            });
          }
        }
      ],
      define: {
        // Pass API key availability to client (not the key itself)
        'import.meta.env.VITE_HAS_API_KEY': JSON.stringify(!!SERPER_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
