# Support Group Finder

A mobile-first PWA that helps people find mental health support groups quickly — locally or online.

## Features
- **Real Search Results**: Uses the Serper API (Google Places + Search) through a serverless function, so the API key never reaches the browser.
- **Real Meeting Schedules**: For recovery/12-step searches, pulls live [Meeting Guide](https://github.com/code4recovery/spec) feeds (AA/NA/Al-Anon) and shows verified day/time, meeting types (open/closed/online/wheelchair/newcomer), "next meeting", and one-tap **Add to calendar**. Opt-in via `MEETING_GUIDE_FEEDS`.
- **Curated Fallbacks**: Always surfaces trusted national resources (NAMI, DBSA, SAMHSA, 7 Cups, and more) when local results are thin or the network is down.
- **Location Awareness**: Geolocation with reverse geocoding, distance calculation, and distance filtering.
- **Smart Search**: Plain-language synonym mapping ("panic attacks" → anxiety), crisis-query detection that surfaces the 988 lifeline, and one-tap topic chips.
- **Rich Filtering**: Meeting type, session format, leadership type, age group, and distance — in a collapsible filter panel.
- **Saved Groups**: Heart any group to keep it on the Saved tab (stable IDs keep the saved state consistent across searches).
- **Crisis Support**: Quick access to the 988 Suicide & Crisis Lifeline.
- **PWA + Native**: Installable PWA, plus native Android & iOS apps via Capacitor.

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

The dev server exposes the same `/api/search` and `/api/meetings` endpoints as production via Vite middleware — both share the logic in `lib/searchCore.ts` and `lib/meetingsCore.ts`. Without an API key the app still works using curated fallback resources.

```bash
npm run typecheck      # TypeScript check
npm run test           # unit tests (Vitest) - feed parsing, grouping, .ics, timezones
npm run build          # production build (dist/)
```

## Meeting Guide feeds (real schedules)

Set `MEETING_GUIDE_FEEDS` to a comma-separated list of [Meeting Guide JSON feed](https://github.com/code4recovery/spec) URLs (online AA, local intergroups, NA, Al-Anon, etc.). Recovery/addiction searches then merge in real meetings with verified times, types, and an "Add to calendar" action. Feeds are fetched server-side (no CORS), cached for an hour, and fault-tolerant — a failing feed never breaks search. Leave unset to disable.

## Deployment

Deploys as-is to Vercel. Set `SERPER_API_KEY` (and optionally `MEETING_GUIDE_FEEDS`) in Project Settings → Environment Variables.

## Android & iOS

Native apps are built with Capacitor from the same codebase — see **[MOBILE.md](MOBILE.md)**:

```bash
VITE_API_BASE_URL=https://your-app.vercel.app   # in .env — native shells need an absolute API URL
npm run android   # build + sync + open Android Studio
npm run ios       # build + sync + open Xcode (macOS)
```

## Roadmap

- Map view of nearby results (Leaflet + OpenStreetMap, no API key)
- Outreach tracker on saved groups (to contact / waitlisted / scheduled + notes)
- Spanish localization
- Provider search mode (NPPES NPI registry + SAMHSA findtreatment.gov data:
  credentials, insurance/payment, services)

## Repository
[https://github.com/grsrzxgvmpg/Support-Group-finder](https://github.com/grsrzxgvmpg/Support-Group-finder)
