# Support Group Finder

A mobile-first PWA that helps people find mental health support groups quickly — locally or online.

## Features
- **Real Search Results**: Uses the Serper API (Google Places + Search) through a serverless function, so the API key never reaches the browser.
- **Curated Fallbacks**: Always surfaces trusted national resources (NAMI, DBSA, SAMHSA, 7 Cups, and more) when local results are thin or the network is down.
- **Location Awareness**: Geolocation with reverse geocoding, distance calculation, and distance filtering.
- **Rich Filtering**: Meeting type, session format, leadership type, age group, and distance — in a collapsible filter panel.
- **Saved Groups**: Heart any group to keep it on the Saved tab (stable IDs keep the saved state consistent across searches).
- **Crisis Support**: Quick access to the 988 Suicide & Crisis Lifeline.
- **PWA**: Installable, offline-tolerant, with app shortcuts for Search and Saved.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (build-time via PostCSS)
- **Icons**: Lucide React
- **Search**: Serper API via Vercel serverless function (`api/search.ts`)
- **PWA**: vite-plugin-pwa (Workbox)

## Development

```bash
npm install
cp .env.example .env   # add your SERPER_API_KEY
npm run dev
```

The dev server exposes the same `/api/search` endpoint as production via a Vite middleware — both share the logic in `lib/searchCore.ts`. Without an API key the app still works using curated fallback resources.

```bash
npm run typecheck      # TypeScript check
npm run build          # production build (dist/)
```

## Deployment

Deploys as-is to Vercel. Set `SERPER_API_KEY` in Project Settings → Environment Variables.

## Repository
[https://github.com/grsrzxgvmpg/Support-Group-finder](https://github.com/grsrzxgvmpg/Support-Group-finder)
