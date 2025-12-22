# Quick Start - Deploy Your PWA

Your Support Group Finder is ready to deploy to iOS, Android, and the web! 🚀

## 1. Quick Build & Local Test

```bash
# Install dependencies (if not already done)
npm install

# Build for production
npm run build

# Test locally
npx serve -s dist
```

Open `http://localhost:3000` in your browser and test the app.

## 2. Choose Your Deployment (30 seconds)

### ⭐ Vercel (Easiest)
```bash
npm install -g vercel
vercel
# Follow the prompts, done!
```
Your app will be live at: `https://your-app-name.vercel.app`

### Netlify
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Build command: `npm run build`
5. Publish directory: `dist`

### Self-Hosted
Upload the `dist/` folder to any server with HTTPS enabled.

## 3. Install on iOS

1. Open the app URL in **Safari** on iPhone/iPad
2. Tap **Share** button (arrow from bottom)
3. Tap **"Add to Home Screen"**
4. Name it "Support Groups"
5. Tap **"Add"**
6. Done! It's now on your home screen like a native app

## 4. Install on Android

1. Open the app URL in **Chrome** on Android phone
2. Tap **⋮** menu (top right)
3. Tap **"Install app"**
4. Confirm
5. Done! It's on your home screen

## 5. Key Features

✅ **Works offline** - Cached search results available without internet
✅ **Auto-updates** - Gets new features automatically
✅ **Fast** - Loads in <1 second on repeat visits
✅ **Home screen** - Looks like a native app
✅ **No app store** - Just share a URL!

## 6. File Overview

```
Your PWA includes:

vite.config.ts              - Service worker & caching setup
manifest.webmanifest        - App metadata & icons
public/icons/               - App icons (192x192, 512x512)
dist/                       - Built production files (ready to deploy)
sw.js                       - Service worker (auto-generated)
workbox-*.js               - Caching logic (auto-generated)

📖 Guides:
PWA_DEPLOYMENT_GUIDE.md     - Detailed deployment instructions
PWA_SETUP_CHECKLIST.md      - Pre-deployment checklist
```

## 7. Deployment Checklist

Before you deploy, verify:

- [ ] Set `SERPER_API_KEY` in `.env` for search
- [ ] Run `npm run build` - no errors
- [ ] Test with `npx serve -s dist`
- [ ] Choose deployment platform (Vercel recommended)
- [ ] Deploy! 🚀

## 8. Environment Setup

Create/update `.env` file:

```env
VITE_HAS_API_KEY=true
SERPER_API_KEY=your_api_key_from_serper.dev
```

**Note**: The app works without an API key using fallback resources, but search features need the key.

## 9. Post-Deployment

After you deploy:

1. ✅ Test the live URL
2. ✅ Try installing on iOS (Safari) or Android (Chrome)
3. ✅ Test offline mode (DevTools → Network → Offline)
4. ✅ Share the URL with users!

## 10. Updates & Maintenance

The app automatically:
- ✅ Checks for updates when opened
- ✅ Updates in the background
- ✅ Notifies users of new versions

To push an update:
1. Make code changes
2. Run `npm run build`
3. Deploy the `dist/` folder
4. Users get the update within 24 hours

## Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Netlify Dashboard**: https://app.netlify.com
- **Serper API**: https://serper.dev
- **PWA Debugging**: Chrome DevTools → Application tab

## Troubleshooting

**Issue**: "Can't install app"
- **Solution**: Use Safari (iOS) or Chrome (Android), ensure HTTPS

**Issue**: "Search not working"
- **Solution**: Add `SERPER_API_KEY` to `.env` and redeploy

**Issue**: "Icons not showing"
- **Solution**: Check `public/icons/` folder exists with PNG files

**Issue**: "Offline mode not working"
- **Solution**: Verify service worker is active (DevTools → Application → Service Workers)

## Need More Help?

- Read `PWA_DEPLOYMENT_GUIDE.md` for detailed instructions
- Check `PWA_SETUP_CHECKLIST.md` for step-by-step checklist
- Visit [vite-pwa-org.netlify.app](https://vite-pwa-org.netlify.app/) for PWA docs

---

## Summary

1. **Build**: `npm run build` ✅
2. **Deploy**: Choose Vercel/Netlify/Your host ✅
3. **Install**: Share URL, users add to home screen ✅
4. **Done!** App works like native app with offline support 🎉

**Ready? Let's go!** 🚀
