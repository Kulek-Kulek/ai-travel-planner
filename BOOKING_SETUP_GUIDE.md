# Booking.com Integration - Quick Setup Guide

## 🎉 Implementation Complete!

The Booking.com accommodation integration has been successfully implemented in Phase 1.

## What Was Built

### 1. Utility Functions (`src/lib/utils/booking-affiliate.ts`)

Three main functions for generating Booking.com deep links:

```typescript
// Generate a single booking link
generateBookingLink(params, propertyTypeFilter?)

// Generate links for all accommodation types (hotels, apartments, hostels, resorts)
generateBookingLinks(params)

// Validate parameters before generating links
validateBookingParams(params)
```

### 2. UI Component (`src/components/booking-accommodation-card.tsx`)

A beautiful, responsive card that displays:
- Trip summary (dates, nights, travelers)
- Primary "Search All Accommodations" button
- Expandable section with 4 accommodation types:
  - 🏨 Hotels & Resorts
  - 🏠 Apartments & Homes
  - 🏢 Hostels
  - 🌴 Resorts
- Affiliate disclosure

### 3. Integration Point

The card appears on the itinerary detail page (`/itinerary/[id]`) when:
- ✅ The itinerary has `start_date` and `end_date`
- ✅ Positioned after the header card, before itinerary days
- ✅ Automatically passes destination, dates, travelers, children, and child ages

### 4. Tests

Comprehensive unit tests in `src/lib/utils/__tests__/booking-affiliate.test.ts`:
- Link generation validation
- Edge case handling
- Parameter validation
- Special character encoding

## How It Works

When a user views an itinerary with dates, they'll see the accommodation card that:

1. **Displays trip details** - Dates, nights, and traveler count
2. **Primary action** - "Search All Accommodations" button opens Booking.com with pre-filled search
3. **Expandable options** - User can browse by accommodation type
4. **Opens in new tab** - All links open externally with proper security
5. **Passes all parameters** - Destination, dates, adults, children, child ages, room estimates

## Next Steps to Enable Affiliate Earnings

### Step 1: Register with Booking.com Partner Program

1. Visit https://partners.booking.com
2. Click "Sign Up" or "Become a Partner"
3. Fill out the application:
   - **Website**: Your production domain
   - **Traffic estimates**: Current or projected monthly visitors
   - **Content type**: Travel itinerary planning / AI travel assistant
   - **Audience**: Travel enthusiasts, trip planners
4. Submit application
5. **Wait for approval** (typically 1-3 business days)

### Step 2: Get Your Affiliate ID

After approval:
1. Log into your Booking.com Partner account
2. Navigate to "Account Settings" or "Partner Information"
3. Copy your **Affiliate ID (AID)**
4. This is typically a numeric value like `123456` or alphanumeric like `abc123xyz`

### Step 3: Add Affiliate ID to Your Environment

#### For Development (.env.local)
```bash
NEXT_PUBLIC_BOOKING_AFFILIATE_ID=your_affiliate_id_here
```

#### For Production (Vercel/Cloudflare)
Add the environment variable in your hosting platform:
- **Vercel**: Project Settings → Environment Variables
- **Cloudflare Pages**: Settings → Environment Variables

```
NEXT_PUBLIC_BOOKING_AFFILIATE_ID = your_affiliate_id_here
```

### Step 4: Deploy

After adding the environment variable:
1. Redeploy your application
2. The affiliate ID will now be included in all Booking.com links
3. Verify by checking a link (should contain `&aid=your_affiliate_id`)

### Step 5: Monitor Performance

Track in Booking.com Partner Dashboard:
- **Click-through rate (CTR)**: How many users click accommodation links
- **Conversion rate**: How many clicks result in bookings
- **Commission earned**: Your revenue from successful bookings
- **Popular destinations**: Which locations get most bookings

## Testing the Feature

### Manual Testing

1. Create or view an itinerary with dates
2. The "Find Accommodation" card should appear
3. Click "Search All Accommodations" → Should open Booking.com with pre-filled search
4. Expand "Browse by Type" → Click any accommodation type → Should open with correct filter

### What to Verify

- ✅ Destination is correct in Booking.com search
- ✅ Dates are pre-filled (check-in and check-out)
- ✅ Number of adults matches your itinerary
- ✅ Children count and ages are passed (if applicable)
- ✅ Room count is reasonable for group size
- ✅ Links open in new tab
- ✅ Mobile responsive design

### Without Affiliate ID

If you haven't added your affiliate ID yet:
- ✅ Links still work perfectly
- ✅ Users can still search and book
- ❌ You won't earn commissions (yet)

## Customization Options

### Change Button Text

Edit `src/components/booking-accommodation-card.tsx`:

```typescript
// Line ~112
Search All Accommodations
// Change to:
Find Your Perfect Stay
```

### Change Placement

Edit `src/app/itinerary/[id]/page.tsx`:

Move the `<BookingAccommodationCard />` component to a different position, such as:
- Below itinerary days (after users read the plan)
- In a sidebar (if you add one)
- As a floating button

### Adjust Room Estimation Logic

Edit `src/lib/utils/booking-affiliate.ts`:

```typescript
// Line ~42
function estimateRooms(adults: number, children: number = 0): number {
  // Customize logic here
  // Current: 2 adults per room
  // Option: 3 adults per room for budget travelers
  return Math.max(1, Math.ceil(adults / 3));
}
```

## Troubleshooting

### Card doesn't appear
- Check if itinerary has `start_date` and `end_date`
- Card only shows when dates are available

### Links don't work
- Verify parameters are being passed correctly
- Check browser console for errors
- Ensure destination name is valid

### Dates are wrong
- Check timezone handling in your database
- Verify date formatting in itinerary data

### Mobile layout issues
- Test in responsive mode
- Check Tailwind classes for mobile breakpoints

## Revenue Expectations

Based on industry averages:

- **Click-through rate**: 15-25% of users who view itinerary
- **Conversion rate**: 1-3% of clicks result in bookings
- **Average commission**: $10-30 per booking
- **Example**: 1,000 itinerary views/month
  - 200 clicks (20% CTR)
  - 4 bookings (2% conversion)
  - $80 revenue ($20 avg commission)

## Legal Requirements

### Disclosure
Already included in the component:
> "We partner with Booking.com to help you find accommodations. If you make a booking through our links, we may earn a commission at no extra cost to you."

### Privacy Policy
Add to your privacy policy:
- Mention affiliate partnership with Booking.com
- Explain that clicking links may share user data
- State that commissions don't affect user pricing

### Terms of Service
Add to your terms:
- External links disclaimer
- No warranty for third-party services
- Booking.com's terms apply to bookings

## Future Enhancements

When ready to expand:

1. **Analytics Tracking**
   - Track which accommodation types are most popular
   - A/B test card placement and design
   - Measure impact on user engagement

2. **AI Recommendations**
   - Suggest accommodation type based on trip (family → apartments, solo → hostels)
   - Personalize based on user preferences
   - Show estimated price ranges

3. **Multiple Platforms**
   - Airbnb integration for vacation rentals
   - Hotels.com as alternative
   - Compare prices across platforms

4. **Enhanced UX**
   - Show accommodation locations on a map
   - Display popular areas based on itinerary
   - Add user reviews from Booking.com

## Support

For questions or issues:
1. Check Booking.com Partner Help Center
2. Review implementation files:
   - `src/lib/utils/booking-affiliate.ts`
   - `src/components/booking-accommodation-card.tsx`
   - `src/app/itinerary/[id]/page.tsx`
3. Run unit tests to verify functionality
4. Contact Booking.com Partner Support for affiliate-specific questions

---

**Implementation Date**: October 26, 2025  
**Status**: ✅ Production Ready  
**Next Action**: Register for Booking.com Partner Program

