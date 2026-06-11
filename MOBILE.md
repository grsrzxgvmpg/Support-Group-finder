# Building the Android & iOS Apps

The mobile apps are built with [Capacitor](https://capacitorjs.com): the same React app
in `dist/` runs inside native Android and iOS shells, with native plugins for
geolocation (runtime permissions), haptics, sharing, and the Android back button.

```
capacitor.config.ts   app ID, name, and shell configuration
android/              Android Studio project (committed)
ios/                  Xcode project, Swift Package Manager based (committed)
assets/               source icon/splash images for `npm run assets:native`
services/platform.ts  web vs. native API abstraction
```

App ID: `com.supportgroupfinder.app` · App name: `Support Groups`

## 1. One-time setup

| Target | Requirements |
|---|---|
| Android | [Android Studio](https://developer.android.com/studio) (bundles the SDK; JDK 21) |
| iOS | macOS with [Xcode 16+](https://developer.apple.com/xcode/) (no CocoaPods needed — the project uses Swift Package Manager) |

```bash
npm install
```

## 2. Point the app at your backend (required)

The web app calls `/api/search` on its own origin. The native shells have no
backend, so the deployed URL must be baked in at build time:

```bash
# .env
VITE_API_BASE_URL=https://your-app.vercel.app
```

Without this, native builds still run but only show the curated national
fallback resources. The serverless function already sends permissive CORS
headers, so no backend change is needed.

## 3. Build and run

```bash
npm run cap:sync     # vite build + copy web assets + update native plugins
npm run android      # sync, then open in Android Studio
npm run ios          # sync, then open in Xcode (macOS only)
```

From Android Studio / Xcode, run on an emulator/simulator or device as usual.
Or from the CLI: `npx cap run android` / `npx cap run ios`.

After any web-code change, re-run `npm run cap:sync` (or `npx cap copy` if only
web assets changed).

## 4. Icons & splash screens

Native icons and splash screens are generated from `assets/icon.png` and
`assets/splash*.png`, which in turn come from the SVG in `generate-icons.js`:

```bash
npm run icons          # regenerate assets/ + public/icons/ from the SVG
npm run assets:native  # regenerate android/ios icon & splash resources
```

## 5. Release checklist

### Android (Play Store)
1. Bump `versionCode`/`versionName` in `android/app/build.gradle`.
2. Create a signing keystore and configure it (Android Studio: *Build → Generate Signed App Bundle*). **Never commit the keystore.**
3. Build an `.aab` (release bundle) and upload via [Play Console](https://play.google.com/console).
4. Play data-safety form: the app stores everything on-device (localStorage); location is used only to search nearby groups and is sent to your own backend + OpenStreetMap reverse geocoding.

### iOS (App Store)
1. In Xcode, set your Team and a unique bundle ID (defaults to `com.supportgroupfinder.app`) under *Signing & Capabilities*.
2. Bump the version/build number, then *Product → Archive* and upload via the Organizer.
3. App privacy: same story as Android — location (approximate/precise, app functionality only), no tracking, no accounts.
4. The location permission prompt text lives in `ios/App/App/Info.plist` (`NSLocationWhenInUseUsageDescription`).

### Both
- Health apps get extra review scrutiny: the 988 crisis resources and the
  "verify with the organizer" disclaimers in-app are assets here, keep them.
- Test the offline path (airplane mode → curated fallbacks should appear).

## Platform behavior notes

- `services/platform.ts` switches implementations automatically:
  geolocation/haptics/share use Capacitor plugins natively and the web APIs in browsers.
- The Android hardware back button closes the detail modal, then returns to the
  Search tab, then exits (handled in `App.tsx`).
- The service worker is web-only; native shells load assets locally and skip SW
  registration (`index.tsx`).
- External links (`target="_blank"`, `tel:`, `sms:`, `mailto:`) open in the
  system browser/dialer — Capacitor's default behavior.
