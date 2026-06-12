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

## Android & iOS

Native apps are built with Capacitor from the same codebase — see **[MOBILE.md](MOBILE.md)**:

```bash
VITE_API_BASE_URL=https://your-app.vercel.app   # in .env — native shells need an absolute API URL
npm run android   # build + sync + open Android Studio
npm run ios       # build + sync + open Xcode (macOS)
```

## Roadmap

- **Real meeting schedules** — integrate sources that publish actual meeting times
  (the open [Meeting Guide JSON format](https://github.com/code4recovery/spec) used by
  AA/12-step intergroups, NAMI affiliate listings, DBSA online groups) so results can
  show *"Tuesday 7 PM · open to newcomers"* instead of just an address. Requires
  verifying/aggregating per-region feeds server-side.
- Map view of nearby results (Leaflet + OpenStreetMap, no API key)
- Outreach tracker on saved groups (to contact / waitlisted / scheduled + notes)
- Spanish localization
- Provider search mode (NPPES NPI registry + SAMHSA findtreatment.gov data:
  credentials, insurance/payment, services)

## Repository
[https://github.com/grsrzxgvmpg/Support-Group-finder](https://github.com/grsrzxgvmpg/Support-Group-finder)
