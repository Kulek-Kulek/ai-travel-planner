# Google Maps Integration Setup Guide

## Overview

This guide explains how to set up Google Maps integration for displaying itinerary locations on an interactive map.

## Features

- ✅ **Interactive Map**: Embedded Google Maps showing all itinerary locations
- ✅ **Numbered Markers**: Each location marked with its order in the itinerary
- ✅ **Info Windows**: Click markers to see location names
- ✅ **Auto-Zoom**: Map automatically fits to show all locations
- ✅ **External Navigation**: "Open in Google Maps" button for turn-by-turn directions
- ✅ **Geocoding**: Automatic conversion of place names to coordinates
- ✅ **Graceful Fallback**: UI gracefully handles missing API key

## Step 1: Get Google Maps API Key

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click **Create Project** or select an existing project
4. Give your project a name (e.g., "Travel Planner")
5. Click **Create**

### 1.2 Enable Required APIs

You need to enable these APIs:

1. Go to **APIs & Services > Library**
2. Search for and enable:
   - **Maps JavaScript API** (for displaying maps)
   - **Geocoding API** (for converting place names to coordinates)
   - **Places API** (optional, for enhanced place data)

### 1.3 Create API Key

1. Go to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS** → **API key**
3. Your API key will be created and displayed
4. Click **RESTRICT KEY** (recommended for security)

### 1.4 Restrict Your API Key (Important!)

For security, restrict your API key:

**Application restrictions:**
- Choose **HTTP referrers (websites)**
- Add your domains:
  ```
  localhost:3000/*
  yourdomain.com/*
  *.yourdomain.com/*
  *.vercel.app/*  (if deploying to Vercel)
  ```

**API restrictions:**
- Choose **Restrict key**
- Select:
  - Maps JavaScript API
  - Geocoding API
  - Places API

Click **Save**

## Step 2: Configure Your Application

### 2.1 Add API Key to Environment Variables

Create or update your `.env.local` file:

```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

⚠️ **Important**: The `NEXT_PUBLIC_` prefix makes this available to the client-side code.

### 2.2 Add to .env.example (Optional)

Update `.env.example` for documentation:

```bash
# Google Maps Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2.3 Restart Your Development Server

```bash
npm run dev
```

## Step 3: Verify Installation

1. Generate or view an existing itinerary
2. You should see a "Map View" section with an interactive map
3. Markers should appear for each location
4. Click markers to see location names
5. Click "Open in Google Maps" to test external navigation

## Pricing & Free Tier

### Free Monthly Credits

Google provides **$200 free credit per month**, which includes:

- **Maps JavaScript API**: 28,000 map loads/month free
- **Geocoding API**: 40,000 requests/month free (0.005/request after)
- **Places API**: 28,000 requests/month free

### Cost Estimates

For a typical travel planning app:
- Each itinerary view = 1 map load + N geocoding requests (where N = number of places)
- Example: 5-day trip with 15 places = 1 map load + 15 geocoding = ~$0.08
- With free tier: ~2,800 itinerary views/month **free**

### Staying Within Free Tier

1. **Cache geocoded coordinates** (implement later if needed)
2. **Only show maps on detail pages** (already implemented)
3. **Monitor usage** in Google Cloud Console

## Troubleshooting

### Map Not Showing

**Problem**: Map section shows "Map view is not available"

**Solution**: Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`

### "This page can't load Google Maps correctly"

**Problem**: API key restrictions or billing not enabled

**Solutions**:
1. Verify API key restrictions allow your domain
2. Enable billing in Google Cloud Console (you won't be charged within free tier)
3. Check that Maps JavaScript API is enabled

### "REQUEST_DENIED" Error

**Problem**: API not enabled or key restrictions too strict

**Solutions**:
1. Enable all required APIs (Maps JavaScript, Geocoding, Places)
2. Check API key restrictions
3. Wait 5-10 minutes for changes to propagate

### Locations Not Found

**Problem**: Some markers don't appear on map

**Solutions**:
- Check the geocoding results counter at bottom-left of map
- Place names may be too vague (e.g., "The Tower" vs "Eiffel Tower, Paris")
- Geocoding API quota may be exceeded

### Slow Loading

**Problem**: Map takes a long time to load

**Solution**: This is normal for the first load as each place needs to be geocoded. Consider implementing coordinate caching in the future.

## Architecture

### Files Created

```
src/
├── lib/
│   ├── config/
│   │   └── google-maps.ts          # API configuration
│   └── utils/
│       └── geocoding.ts            # Geocoding utilities
└── components/
    ├── itinerary-map.tsx           # Interactive map component
    └── google-maps-button.tsx      # External navigation button
```

### How It Works

1. **ItineraryMap Component** (`itinerary-map.tsx`):
   - Loads Google Maps JavaScript API
   - Geocodes all place names to coordinates
   - Displays interactive map with numbered markers
   - Auto-fits bounds to show all locations

2. **GoogleMapsButton Component** (`google-maps-button.tsx`):
   - Creates Google Maps directions URL
   - Opens external Google Maps app with all locations
   - No API key required (uses Google Maps URLs)

3. **Geocoding Utility** (`geocoding.ts`):
   - Converts place names to coordinates
   - Adds city context for better accuracy
   - Handles rate limiting with delays
   - Calculates map center

## Future Enhancements

Consider these improvements:

1. **Coordinate Caching**: Store geocoded coordinates in database to avoid re-geocoding
2. **Day Filtering**: Toggle between days to show only relevant locations
3. **Route Lines**: Draw lines between locations in order
4. **Travel Time**: Calculate and display travel time between stops
5. **Place Photos**: Show place photos from Google Places API
6. **Custom Map Styles**: Apply custom styling to match your brand

## Next Steps

1. **Test the feature**: Create a few itineraries and verify maps work
2. **Monitor usage**: Check Google Cloud Console after a few days
3. **Set up billing alerts**: Get notified if you approach free tier limits
4. **Consider caching**: If you have high traffic, implement coordinate caching

## Support

For Google Maps specific issues, see:
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Google Maps Platform Support](https://developers.google.com/maps/support)

For application-specific issues, check the code comments in:
- `src/components/itinerary-map.tsx`
- `src/lib/utils/geocoding.ts`

## Summary

✅ Interactive maps showing all itinerary locations  
✅ One-click navigation to Google Maps  
✅ Free for up to 28,000 views/month  
✅ Graceful fallback if API key not configured  
✅ Simple setup with environment variable  

The map integration is now complete! Add your API key to `.env.local` and restart your dev server to see it in action.




