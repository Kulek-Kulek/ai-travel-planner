# 🗺️ Google Maps - Quick Start Guide

## Get Started in 3 Steps

### Step 1: Get Your API Key (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Geocoding API**
4. Go to **Credentials** → **Create Credentials** → **API key**
5. Copy your API key

### Step 2: Add to Your Environment (30 seconds)

Create or edit `travel-planner/.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC-your-actual-api-key-here
```

### Step 3: Restart & Test (1 minute)

```bash
cd travel-planner
npm run dev
```

Then:
1. Open http://localhost:3000
2. Generate or view an itinerary
3. Scroll down to see the **Map View** section! 🎉

## That's It! 🚀

Your itineraries now have interactive maps showing all locations with numbered markers.

### What You Get

- 📍 Interactive map with all locations
- 🔢 Numbered markers in order
- 🗺️ "Open in Google Maps" button for directions
- 💰 **FREE** for up to ~2,800 views/month

### Need More Help?

- **Full setup guide**: See `GOOGLE_MAPS_SETUP.md`
- **Implementation details**: See `GOOGLE_MAPS_IMPLEMENTATION.md`
- **Troubleshooting**: Check the troubleshooting section in `GOOGLE_MAPS_SETUP.md`

---

**Pro Tip**: For production, make sure to restrict your API key to your domain for security!



