# 🔗 Share Feature Implementation

## Overview

The share feature allows users to easily share travel itineraries with friends and family using either native device sharing or a simple link copy.

## How It Works

### Smart Sharing Strategy

1. **Native Share API (Preferred)** 
   - On mobile devices and modern browsers that support the Web Share API
   - Opens the device's native share dialog
   - Allows sharing via WhatsApp, Email, SMS, social media, etc.
   - Includes: Title, Description, and URL

2. **Clipboard Fallback** 
   - For desktop browsers or when native share is unavailable
   - Copies the itinerary link to clipboard
   - Shows toast notification: "Link copied to clipboard! 📋"
   - Users can then paste the link anywhere

3. **Legacy Support** 
   - Falls back to legacy `document.execCommand('copy')` if modern Clipboard API fails
   - Ensures sharing works on older browsers

## Files Modified

### New File: `src/lib/utils/share.ts`
- **`shareItinerary()`** - Main sharing function
  - Tries Web Share API first
  - Falls back to clipboard
  - Returns success status and method used
  
- **`getItineraryShareUrl()`** - Utility to get shareable URL
  - Builds full URL from base URL and itinerary ID

### New File: `src/components/itinerary-share-button.tsx`
- Reusable client component for sharing itineraries
- Self-contained with its own loading state
- Used on the itinerary detail page

### Updated File: `src/components/itinerary-card.tsx`
- Added `handleShare()` function
  - Prevents event propagation
  - Creates descriptive share content
  - Shows appropriate toast messages
  
- Updated share button
  - Removed "coming soon" placeholder
  - Added loading state with `isSharing`
  - Proper error handling

### Updated File: `src/app/itinerary/[id]/page.tsx`
- Added `ItineraryShareButton` component
- Positioned next to the like button in header
- Includes title and description for sharing

## Shared Content

When users share an itinerary, they share:

```
Title: "Paris - Travel Itinerary"
Description: "A 5-day itinerary for Paris including Eiffel Tower, Louvre Museum, Arc de Triomphe and more!"
URL: https://your-domain.com/itinerary/abc123
```

## User Experience

### Mobile (iOS/Android)
1. User clicks share button (green icon)
2. Native share sheet appears
3. User selects sharing method (WhatsApp, Email, etc.)
4. Content is shared with title, description, and link

### Desktop
1. User clicks share button (green icon)
2. Link is copied to clipboard
3. Toast notification: "Link copied to clipboard! 📋"
4. User can paste the link anywhere

## Environment Variables

The share function uses `NEXT_PUBLIC_APP_URL` for building links:

```env
# .env.local
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Falls back to `window.location.origin` in the browser if not set.

## Benefits

✅ **Universal**: Works on all devices and browsers  
✅ **Smart**: Uses best method available for each platform  
✅ **User-Friendly**: Clear feedback with toast notifications  
✅ **Reliable**: Multiple fallback methods ensure it always works  
✅ **SEO-Friendly**: Shares full, crawlable URLs  

## Testing

### Test on Mobile
1. Open the app on a mobile device
2. Click share button on any itinerary
3. Verify native share dialog appears
4. Try sharing via different apps

### Test on Desktop
1. Open the app on desktop browser
2. Click share button on any itinerary
3. Verify "Link copied to clipboard!" toast appears
4. Paste in a text editor to verify URL is correct

### Test URL Format
Expected URL format: `https://your-domain.com/itinerary/{itinerary-id}`

## Future Enhancements

Potential improvements:
- Add social media preview meta tags (Open Graph, Twitter Cards)
- Track share analytics
- Add QR code generation for offline sharing
- Email sharing with pre-filled template
- WhatsApp direct share button

