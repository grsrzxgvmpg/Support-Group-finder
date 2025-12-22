# API Key Setup Guide

## 🔑 Where to Place Your API Key

### Step 1: Get Your Serper API Key

1. Go to **https://serper.dev**
2. Sign up for a free account (includes 2,500 free queries/month)
3. Navigate to your dashboard
4. Copy your API key (looks like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Step 2: Local Development Setup

**File Location**: `.env` (in project root)

**Current Content**:
```
# Serper API Key (server-side only)
SERPER_API_KEY=your_serper_api_key_here
```

**Replace `your_serper_api_key_here` with your actual key**:

```
# Serper API Key (server-side only)
SERPER_API_KEY=your_actual_api_key_12345678910
```

### Step 3: Test Locally

1. Restart the dev server:
   ```bash
   npm run dev
   ```
2. Search for a support group
3. Results should load with your real data (not test data)

### Step 4: Production Deployment

For **Vercel**, **Netlify**, or other cloud platforms:

#### **Option A: Vercel**
1. Go to **Vercel Dashboard** → Your Project
2. Settings → **Environment Variables**
3. Add new variable:
   - **Name**: `SERPER_API_KEY`
   - **Value**: Your API key
4. Redeploy project

#### **Option B: Netlify**
1. Go to **Netlify Dashboard** → Your Site
2. Site Settings → **Build & Deploy** → **Environment**
3. Add new variable:
   - **Key**: `SERPER_API_KEY`
   - **Value**: Your API key
4. Trigger rebuild

#### **Option C: Self-Hosted (Docker/VPS)**
```bash
# Set environment variable before running
export SERPER_API_KEY="your_api_key_here"
npm run build
npm run preview
```

Or add to `.env.production`:
```
SERPER_API_KEY=your_api_key_here
```

## 📁 File Structure

```
Support-Group-finder/
├── .env                    ← PUT YOUR KEY HERE (local development)
├── .env.example            ← Template (do not edit)
├── vite.config.ts          ← Reads from .env
├── api/
│   └── search.ts           ← Serverless function (uses key)
└── services/
    └── geminiService.ts    ← Search service
```

## 🔒 Security Notes

### ✅ Do This:
- Keep API key in `.env` (never commit to git)
- Use `.gitignore` (already configured)
- Rotate key periodically
- Monitor usage on Serper dashboard
- Use environment variables on production

### ❌ Don't Do This:
- ~~Don't commit `.env` to git~~
- ~~Don't hardcode API key in source code~~
- ~~Don't share key in messages/emails~~
- ~~Don't use production key for local testing~~

## 📊 How It Works

### Local Development Flow:
```
Your Computer
    ↓
npm run dev (localhost:3005)
    ↓
App makes search request
    ↓
Vite dev server reads .env
    ↓
Extracts SERPER_API_KEY
    ↓
Calls Serper API with key
    ↓
Returns results to app
```

### Production Flow (Vercel):
```
User on Web
    ↓
Visits your domain
    ↓
App makes search request
    ↓
Vercel serverless function triggered
    ↓
Reads SERPER_API_KEY from env vars
    ↓
Calls Serper API with key
    ↓
Returns results to user
```

## 🧪 Testing API Key

### Test If Key Works:

1. **Check Dev Server Logs**:
   ```
   npm run dev
   ```
   Should show successful searches without errors

2. **Try a Search**:
   - Open http://localhost:3005
   - Search for "Anxiety in San Francisco"
   - Should return real results

3. **Check Serper Dashboard**:
   - Visit https://serper.dev/dashboard
   - Look at "API Calls" counter
   - Should increase when you search

## ⚠️ Common Issues

### Issue: "API key not found"
**Solution**:
- Restart dev server after adding key to `.env`
- Ensure no typos in key
- Check .env file encoding (should be UTF-8)

### Issue: "Invalid API key"
**Solution**:
- Copy key directly from Serper dashboard (no extra spaces)
- Check key format on Serper (should start with specific prefix)
- Regenerate key if needed

### Issue: "Rate limit exceeded"
**Solution**:
- Free tier: 2,500 queries/month (~83/day)
- Upgrade plan on Serper dashboard
- Cache results to reduce API calls

### Issue: "No results found"
**Solution**:
- Your key is working, search terms might be too specific
- Try different keywords: "Support groups", "Mental health"
- Check internet connection

## 📞 Support

- **Serper Issues**: https://serper.dev/support
- **API Docs**: https://serper.dev/docs
- **Pricing**: https://serper.dev/pricing (free tier includes 2,500 queries/month)

## Quick Reference

| Environment | File | Location |
|---|---|---|
| **Local Dev** | `.env` | Project root |
| **Vercel** | Dashboard | Settings → Environment Variables |
| **Netlify** | Dashboard | Site Settings → Build & Deploy |
| **Docker** | `-e` flag or `.env.production` | Container env |
| **VPS** | `.env.production` | Server |

---

**Last Updated**: 2025-12-21
**Status**: Ready for API integration
