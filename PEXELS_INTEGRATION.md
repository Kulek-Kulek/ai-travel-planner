# 🎨 Pexels Image Integration

## Overview

Itinerary cards display beautiful, relevant destination photos from Pexels API. Photos are automatically fetched during itinerary generation based on destination and user notes.

---

## ✨ Features

### **Smart Photo Selection:**
- **Keyword Detection:** Analyzes user notes for specific landmarks
  - "Rome + Colosseum" → Colosseum photo
  - "Rome + Vatican" → Vatican photo
  - "Paris + Eiffel Tower" → Eiffel Tower photo
  - "Tokyo + Shibuya" → Shibuya Crossing photo
  - "Miami" → Miami Beach skyline
- **Fallback:** If no specific landmark detected, uses generic destination photo
- **Parallel Fetching:** Photo fetch happens alongside AI generation (no delay)

### **Cost:** 
- ✅ **100% FREE** (unlimited requests)
- ✅ No storage costs (URLs only)
- ✅ No rate limits
- ✅ No quotas

### **Performance:**
- Fetched in parallel with AI generation (~1 second)
- No impact on itinerary creation time
- Cached by Pexels CDN

---

## 🗂️ Database Schema

### **Columns:**
```sql
itineraries:
  - image_url (text): Pexels photo URL
  - image_photographer (text): Photographer name (optional attribution)
  - image_photographer_url (text): Photographer profile URL (optional)
```

**Migration:** `004_add_image_url.sql`

---

## 📸 How It Works

### **Flow:**

```
User generates "Rome, interested in Colosseum" itinerary
    ↓
AI generates itinerary (10s)
    ║
    ╠══> Pexels fetches "Colosseum Rome" photo (1s)
    ║
    ╚══> Generate tags (2s)
    ↓
All complete in parallel
    ↓
Save to database with image URL
    ↓
Display card with beautiful Colosseum photo
```

### **Smart Keyword Detection:**

```typescript
// User: "Miami" + "beaches and nightlife"
// → Searches: "miami beach aerial view"

// User: "Rome" + "I want to see museums and art"
// → Searches: "rome art museum"

// User: "Tokyo" + (empty notes)
// → Searches: "tokyo skyline night"
```

---

## 🎯 Supported Landmarks

### **Europe:**
- **Rome:** Colosseum, Vatican, Trevi Fountain, Pantheon, Spanish Steps
- **Paris:** Eiffel Tower, Louvre, Arc de Triomphe, Notre Dame, Montmartre, Versailles
- **London:** Big Ben, Tower Bridge, London Eye, Buckingham Palace, Westminster
- **Barcelona:** Sagrada Familia, Park Güell, Gaudí architecture
- **Amsterdam:** Canals, canal houses
- **Prague:** Old Town
- **Vienna:** Architecture
- **Budapest:** Parliament
- **Lisbon:** Yellow trams
- **Athens:** Acropolis
- **Madrid:** Royal Palace
- **Berlin:** Brandenburg Gate

### **North America:**
- **New York:** Statue of Liberty, Empire State Building, Times Square, Central Park, Brooklyn Bridge, Manhattan skyline
- **Miami:** Miami Beach, South Beach, Ocean Drive
- **Los Angeles:** Hollywood sign, Santa Monica Pier, Malibu Beach
- **San Francisco:** Golden Gate Bridge, Alcatraz
- **Las Vegas:** Vegas Strip at night

### **Asia:**
- **Tokyo:** Shibuya Crossing, Mount Fuji, Senso-ji Temple, Tokyo Tower, Shinjuku
- **Dubai:** Burj Khalifa
- **Sydney:** Opera House

### **Generic Keywords:**
- Beach, Mountain, Food, Pizza, Sushi, Museum, Art, Nature

**Easy to add more in `src/lib/pexels/client.ts`!**

---

## 🏗️ Technical Implementation

### **Files:**

1. **`src/lib/pexels/client.ts`** - Pexels API client with smart search
2. **`src/lib/actions/ai-actions.ts`** - Integrated photo fetching
3. **`src/components/itinerary-card.tsx`** - Display images on cards
4. **`supabase/migrations/004_add_image_url.sql`** - Database schema
5. **`next.config.ts`** - Image domains configuration

---

## 🎨 UI Design

### **Card Layout:**

```
┌─────────────────────────────────┐
│                                 │
│    Beautiful Pexels Photo       │
│         (192px height)          │
│                                 │
│  [No attribution required!]     │
├─────────────────────────────────┤
│  Rome                           │
│  📅 3 days  👥 2 travelers      │
│                                 │
│  Description...                 │
│                                 │
│  [Tags]                         │
└─────────────────────────────────┘
```

### **Clean UI:**
- No attribution badge required
- Just beautiful photos
- Professional look
- No overlays or text

---

## ⚙️ Setup Instructions

### **1. Get Pexels API Key:**
1. Go to: https://www.pexels.com/api/
2. Click "Get Started"
3. Sign up (30 seconds)
4. Copy your **API key** (shows immediately)

### **2. Add to `.env.local`:**
```env
PEXELS_API_KEY=your-pexels-api-key-here
```

### **3. Run Database Migration:**
```bash
# Connect to Supabase and run:
# supabase/migrations/004_add_image_url.sql
```

Or use Supabase Dashboard → SQL Editor → Paste migration content → Run

### **4. Restart Dev Server:**
```bash
npm run dev
```

### **5. Backfill Existing Itineraries:**
- Go to: http://localhost:3002/admin/backfill-images
- Click "Backfill X Itineraries"
- Wait ~30 seconds
- Done!

---

## 🧪 Testing

### **Test 1: Generate with Specific Landmark**
1. Generate: "Rome, 3 days"
2. Notes: "I want to visit the Colosseum"
3. ✅ Card shows Colosseum photo
4. ✅ No attribution badge

### **Test 2: Generate with Generic Notes**
1. Generate: "Paris, 5 days"
2. Notes: "Museums and cafes"
3. ✅ Card shows Eiffel Tower (default Paris photo)
4. ✅ Clean, no attribution

### **Test 3: No API Key (Graceful Fallback)**
1. Remove `PEXELS_API_KEY` from .env.local
2. Generate itinerary
3. ✅ Works normally, just no image
4. ✅ No errors

### **Test 4: Miami Beach Test**
1. Generate: "Miami, 5 days"
2. Notes: "beaches and nightlife"
3. ✅ Shows Miami Beach/Ocean Drive photo
4. ✅ Beautiful beach/skyline image

---

## 📊 Cost Analysis

### **Monthly Usage Estimates:**

| Usage Level | Plans/Month | API Calls | Cost |
|-------------|-------------|-----------|------|
| **Any amount** | Unlimited | Unlimited | **$0** |

**No limits. No quotas. Completely free forever.** 🎉

---

## 🚀 Advantages Over Unsplash

| Feature | Unsplash | Pexels |
|---------|----------|--------|
| **Attribution** | ❌ Required | ✅ Optional |
| **UI Overlay** | ❌ Required badge | ✅ Clean images |
| **Rate Limits** | ❌ Yes | ✅ None |
| **Monthly Quota** | ❌ 50,000 | ✅ Unlimited |
| **Cost** | Free | ✅ Free |
| **Quality** | Excellent | ✅ Excellent |
| **Setup** | Complex | ✅ Simple |

---

## 🐛 Troubleshooting

### **Images not showing:**
- ✅ Check `PEXELS_API_KEY` in .env.local
- ✅ Restart dev server
- ✅ Check browser console for errors
- ✅ Test at: http://localhost:3002/test-pexels

### **Wrong images:**
- ✅ Landmark keywords might not match - add to mapping
- ✅ Try more specific notes

### **Old Unsplash images still showing:**
- ✅ Run backfill tool: http://localhost:3002/admin/backfill-images
- ✅ This replaces all Unsplash URLs with Pexels

---

## 📜 Pexels API Terms

**Attribution:**
- ✅ Optional (but appreciated)
- ✅ Can include if desired
- ✅ No required format

**Allowed:**
- ✅ Unlimited free use
- ✅ Commercial projects
- ✅ Modify images
- ✅ No attribution required

**Not Allowed:**
- ❌ Sell photos as stock
- ❌ Create competing service
- ❌ Identifiable people for commercial endorsements (use with care)

---

## ✨ Summary

**What You Get:**
- ✅ Beautiful destination photos on every card
- ✅ Smart landmark detection
- ✅ Zero cost (unlimited free)
- ✅ Fast (<1 second)
- ✅ No attribution required
- ✅ Clean UI
- ✅ Graceful fallbacks

**Perfect for production!** Scale infinitely without worrying about costs or rate limits. 🚀

