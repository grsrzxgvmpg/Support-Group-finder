import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { performSearch, validateParams } from './lib/searchCore';
import { fetchMeetings, parseFeedList } from './lib/meetingsCore';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const SERPER_API_KEY = env.SERPER_API_KEY || '';
    const MEETING_GUIDE_FEEDS = parseFeedList(env.MEETING_GUIDE_FEEDS);

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          // Registration happens in index.tsx so native (Capacitor) builds
          // can skip the service worker entirely
          injectRegister: false,
          includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
          manifest: {
            name: 'Support Group Finder',
            short_name: 'Support Groups',
            description: 'Find local and online support groups near you. Connect with community resources for mental health, addiction, grief, and more.',
            theme_color: '#0D9488',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            start_url: '/',
            categories: ['healthcare', 'lifestyle'],
            shortcuts: [
              {
                name: 'Search Groups',
                short_name: 'Search',
                description: 'Search for support groups',
                url: '/?tab=search',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
              },
              {
                name: 'Saved Groups',
                short_name: 'Saved',
                description: 'View your saved support groups',
                url: '/?tab=saved',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
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
            navigateFallbackDenylist: [/^\/api\//],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\//,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'geocoding',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60
                  }
                }
              },
              {
                urlPattern: /\/api\/search/,
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
        // Dev-only middleware mirroring the Vercel serverless function (api/search.ts)
        {
          name: 'api-search-handler',
          configureServer(server) {
            server.middlewares.use('/api/search', async (req, res) => {
              res.setHeader('Content-Type', 'application/json');

              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.end(JSON.stringify({ error: 'Method not allowed' }));
                return;
              }

              if (!SERPER_API_KEY) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'SERPER_API_KEY not configured. Add it to your .env file.' }));
                return;
              }

              let body = '';
              for await (const chunk of req) {
                body += chunk;
              }

              try {
                const params = validateParams(JSON.parse(body));
                if (!params) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Topic and location are required' }));
                  return;
                }

                const results = await performSearch(params, SERPER_API_KEY);
                res.end(JSON.stringify({ results }));
              } catch (error: any) {
                console.error('API search error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message, results: [] }));
              }
            });
          }
        },
        // Dev-only middleware mirroring the Vercel function (api/meetings.ts)
        {
          name: 'api-meetings-handler',
          configureServer(server) {
            server.middlewares.use('/api/meetings', async (req, res) => {
              res.setHeader('Content-Type', 'application/json');

              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.end(JSON.stringify({ error: 'Method not allowed' }));
                return;
              }

              if (MEETING_GUIDE_FEEDS.length === 0) {
                res.end(JSON.stringify({ meetings: [] }));
                return;
              }

              let body = '';
              for await (const chunk of req) {
                body += chunk;
              }

              try {
                const parsed = body ? JSON.parse(body) : {};
                const meetings = await fetchMeetings({
                  meetingType: typeof parsed.meetingType === 'string' ? parsed.meetingType : undefined,
                  latitude: typeof parsed.latitude === 'number' ? parsed.latitude : undefined,
                  longitude: typeof parsed.longitude === 'number' ? parsed.longitude : undefined,
                  location: typeof parsed.location === 'string' ? parsed.location : undefined
                }, MEETING_GUIDE_FEEDS);
                res.end(JSON.stringify({ meetings }));
              } catch (error: any) {
                console.error('API meetings error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message, meetings: [] }));
              }
            });
          }
        }
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
