# Booking.com Integration - Testing Guide

## 🎯 Quick Test (5 minutes)

### Prerequisites
- Have at least one itinerary with **dates** (start_date and end_date)
- If you don't have one, create a new itinerary with dates

### Steps

1. **Navigate to an itinerary detail page**
   ```
   http://localhost:3000/itinerary/[your-itinerary-id]
   ```

2. **Verify the Booking Card Appears**
   - Should appear after the header card
   - Should show:
     - 🏨 Icon
     - "Find Accommodation" heading
     - Trip details (dates, nights, travelers)
     - "Search All Accommodations" button
     - "Browse by Type" expandable section

3. **Test Primary Button**
   - Click **"Search All Accommodations"**
   - **Expected**: Opens Booking.com in new tab
   - **Verify**:
     - Destination matches your itinerary
     - Check-in date is correct
     - Check-out date is correct
     - Number of adults is correct
     - Opens in new tab (doesn't replace your app)

4. **Test Accommodation Types**
   - Click **"Browse by Type"** to expand
   - Click each type:
     - 🏨 **Hotels & Resorts**
     - 🏠 **Apartments & Homes**  
     - 🏢 **Hostels**
     - 🌴 **Resorts**
   - **Expected**: Each opens Booking.com with property type filter

5. **Test on Mobile**
   - Open DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Select mobile device
   - Verify card is responsive and readable

## ✅ What to Verify in Booking.com

When the link opens, check the Booking.com page:

### URL Parameters Check
Open browser DevTools → Network tab → Check the URL:

```
https://www.booking.com/searchresults.html?
  ss=Paris           ← Your destination
  &checkin=2025-11-01  ← Check-in date
  &checkout=2025-11-08 ← Check-out date
  &group_adults=2      ← Number of adults
  &group_children=1    ← Number of children (if any)
  &age=8               ← Child ages (if any)
  &no_rooms=1          ← Room count
  &label=ai-travel-planner ← Tracking label
```

### On Booking.com Page
- ✅ Destination field is pre-filled
- ✅ Check-in date is correct
- ✅ Check-out date is correct
- ✅ Number of guests is correct
- ✅ Children and ages are shown (if applicable)
- ✅ Search results appear immediately

## 🧪 Comprehensive Test Scenarios

### Scenario 1: Simple Trip (2 Adults)
```typescript
Destination: "Paris, France"
Check-in: November 1, 2025
Check-out: November 8, 2025
Adults: 2
Children: 0
```

**Expected**:
- 7 nights displayed
- 2 travelers shown
- 1 room estimated
- No child fields

### Scenario 2: Family Trip
```typescript
Destination: "Orlando, Florida"
Check-in: December 15, 2025
Check-out: December 22, 2025
Adults: 2
Children: 2
Child Ages: [8, 5]
```

**Expected**:
- 7 nights displayed
- 4 travelers (2 adults + 2 children)
- 2 rooms estimated
- Child ages: 8 and 5 passed to Booking.com

### Scenario 3: Group Trip
```typescript
Destination: "Barcelona, Spain"
Check-in: June 1, 2026
Check-out: June 5, 2026
Adults: 6
Children: 0
```

**Expected**:
- 4 nights displayed
- 6 travelers shown
- 3 rooms estimated (2 adults per room)

### Scenario 4: Special Characters
```typescript
Destination: "Cote d'Azur, France"
Check-in: July 10, 2026
Check-out: July 17, 2026
Adults: 2
Children: 0
```

**Expected**:
- Special characters (') encoded properly
- Search works correctly
- Destination displays correctly on Booking.com

### Scenario 5: Short Stay
```typescript
Destination: "Amsterdam, Netherlands"
Check-in: March 5, 2026
Check-out: March 7, 2026
Adults: 2
Children: 0
```

**Expected**:
- "2 nights" displayed
- Weekend stay properly handled

## 🔍 Edge Cases to Test

### 1. No Dates (Card Should Not Appear)
- Create or find an itinerary **without** start_date/end_date
- **Expected**: No booking card appears
- **Why**: Can't search without dates

### 2. Same Day Check-in/Check-out
```sql
-- Test in database
UPDATE itineraries 
SET start_date = '2025-11-01',
    end_date = '2025-11-01'
WHERE id = 'your-test-id';
```
- **Expected**: Shows "1 night" or handles gracefully

### 3. Long Stay (30+ days)
```sql
UPDATE itineraries 
SET start_date = '2025-11-01',
    end_date = '2025-12-15'
WHERE id = 'your-test-id';
```
- **Expected**: Shows "44 nights"
- Room estimation still reasonable

### 4. Large Group (10+ people)
```sql
UPDATE itineraries 
SET travelers = 12,
    children = 3
WHERE id = 'your-test-id';
```
- **Expected**: 
  - Shows "15 travelers"
  - Estimates ~8 rooms (2 adults per room)

### 5. Multiple Children Different Ages
```sql
UPDATE itineraries 
SET children = 4,
    child_ages = ARRAY[3, 7, 10, 14]
WHERE id = 'your-test-id';
```
- **Expected**: All 4 ages passed to Booking.com

## 🛠️ Testing Utilities

### Check Generated Links Manually

You can test link generation in browser console:

```javascript
// Open any itinerary page, then paste in console:

// Import the utility (if needed)
const params = {
  destination: "Paris, France",
  checkIn: new Date("2025-11-01"),
  checkOut: new Date("2025-11-08"),
  adults: 2,
  children: 1,
  childAges: [8]
};

// This won't work in console, but you can test via API route
fetch('/api/test-booking-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(params)
}).then(r => r.json()).then(console.log);
```

### Create Test API Route (Optional)

Create `src/app/api/test-booking-link/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { generateBookingLink, generateBookingLinks } from '@/lib/utils/booking-affiliate';

export async function POST(request: Request) {
  const params = await request.json();
  
  const singleLink = generateBookingLink(params);
  const allLinks = generateBookingLinks(params);
  
  return NextResponse.json({
    single: singleLink,
    byType: allLinks
  });
}
```

Then test from browser console or Postman.

## 📱 Device Testing

### Desktop Browsers
- ✅ Chrome (Windows/Mac)
- ✅ Firefox
- ✅ Safari (Mac)
- ✅ Edge

### Mobile Devices
- ✅ iPhone Safari
- ✅ Android Chrome
- ✅ iPad Safari

### Screen Sizes
- ✅ Mobile (320px - 480px)
- ✅ Tablet (481px - 768px)  
- ✅ Desktop (769px - 1200px)
- ✅ Large Desktop (1200px+)

## 🐛 Common Issues & Solutions

### Issue 1: Card Doesn't Appear
**Symptom**: Booking card not visible on itinerary page

**Check**:
```sql
SELECT id, destination, start_date, end_date 
FROM itineraries 
WHERE id = 'your-id';
```

**Solution**: Ensure `start_date` and `end_date` are NOT NULL

---

### Issue 2: Dates Are Wrong in Booking.com
**Symptom**: Dates don't match or are off by one day

**Check**: Timezone issues
```javascript
// In browser console on itinerary page
console.log(new Date('2025-11-01')); // Should be Nov 1, not Oct 31
```

**Solution**: Dates should be in YYYY-MM-DD format, will work correctly

---

### Issue 3: Children Not Showing
**Symptom**: Child count not passed to Booking.com

**Check**:
```sql
SELECT travelers, children, child_ages 
FROM itineraries 
WHERE id = 'your-id';
```

**Solution**: Ensure `children` > 0 and `child_ages` array has values

---

### Issue 4: Wrong Destination
**Symptom**: Booking.com shows wrong location

**Check**: Special characters in destination
```sql
SELECT destination FROM itineraries WHERE id = 'your-id';
```

**Solution**: URL encoding should handle this automatically. If not, the destination field might have typos.

---

### Issue 5: Link Doesn't Open
**Symptom**: Click does nothing

**Check Browser Console**: Look for JavaScript errors

**Solution**: Check if pop-up blocker is active (links should open in new tab)

## 📊 Unit Tests

Run the existing unit tests:

```bash
cd travel-planner
npm test booking-affiliate
```

**Tests included**:
- ✅ Basic link generation
- ✅ Multiple accommodation types
- ✅ Parameter validation
- ✅ Special character handling
- ✅ Child ages
- ✅ Room estimation
- ✅ Date formatting
- ✅ Edge cases

**Expected**: All tests pass ✅

## 🎨 Visual Testing Checklist

### Desktop View
- [ ] Card has proper spacing
- [ ] Icon displays correctly
- [ ] Dates are readable
- [ ] Button is prominent
- [ ] Expandable section works smoothly
- [ ] Affiliate disclosure is visible but not intrusive

### Mobile View
- [ ] Card fits screen width
- [ ] Text is readable (not too small)
- [ ] Button is tappable (not too small)
- [ ] Expandable section works on touch
- [ ] No horizontal scrolling

### Dark Mode (if applicable)
- [ ] Card visible in dark mode
- [ ] Text has good contrast
- [ ] Icon remains visible

## 🚀 Performance Testing

### Page Load Impact
1. Open itinerary page without booking card (no dates)
2. Note load time
3. Add dates to itinerary
4. Refresh page
5. Note load time

**Expected**: < 50ms difference

### Link Generation Speed
All links should generate instantly (< 1ms)

## ✨ Affiliate ID Testing

### Without Affiliate ID (Current State)
```
NEXT_PUBLIC_BOOKING_AFFILIATE_ID not set
```

**Check URL**: Should NOT contain `&aid=` parameter

**Expected**: Links work, but no commission tracking

### With Affiliate ID (After Registration)
```bash
# Add to .env.local
NEXT_PUBLIC_BOOKING_AFFILIATE_ID=123456
```

**Check URL**: Should contain `&aid=123456`

**Test**:
1. Add affiliate ID to `.env.local`
2. Restart dev server
3. Generate a link
4. Verify `&aid=123456` is in URL

## 📈 Analytics Testing (Future)

If you add click tracking:

```typescript
// Check if events are logged
SELECT * FROM affiliate_clicks 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## ✅ Final Checklist

Before considering testing complete:

### Functional Tests
- [ ] Card appears on itinerary with dates
- [ ] Card does NOT appear without dates
- [ ] Primary button opens correct Booking.com search
- [ ] All 4 accommodation types work
- [ ] Destination pre-filled correctly
- [ ] Dates pre-filled correctly
- [ ] Travelers count correct
- [ ] Children and ages passed correctly

### Cross-Browser Tests
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] Works on mobile Safari
- [ ] Works on mobile Chrome

### Edge Cases
- [ ] Single traveler
- [ ] Large group (10+ people)
- [ ] Family with multiple children
- [ ] Special characters in destination
- [ ] Short stay (1-2 nights)
- [ ] Long stay (30+ days)

### Visual Tests
- [ ] Mobile responsive
- [ ] Desktop layout
- [ ] Icons display correctly
- [ ] Text readable on all devices
- [ ] Buttons properly sized

### Security Tests
- [ ] Links open in new tab
- [ ] Has `rel="noopener noreferrer"`
- [ ] No sensitive data in URLs
- [ ] HTTPS only

## 🎓 Pro Testing Tips

### 1. Use Different Destinations
Test with various types:
- Major cities: "New York, USA"
- European cities: "Paris, France"
- Asian cities: "Tokyo, Japan"
- Beach destinations: "Bali, Indonesia"
- Multi-word: "San Francisco, USA"

### 2. Test Date Ranges
- Near future (< 1 month)
- Far future (> 6 months)
- Peak season dates
- Weekend stays
- Week-long stays
- Month-long stays

### 3. Test Group Sizes
- Solo (1 adult)
- Couple (2 adults)
- Family (2 adults + 2 children)
- Group (6-8 adults)
- Large group (10+ people)

### 4. Use Real Itineraries
Test with itineraries you've actually created, not just test data. Real usage patterns reveal issues test data misses.

## 🆘 Need Help?

If something doesn't work:

1. **Check Console**: Look for JavaScript errors
2. **Check Network Tab**: See what URL is generated
3. **Check Database**: Verify itinerary data is correct
4. **Check Tests**: Run unit tests to isolate issue
5. **Check Documentation**: Refer to BOOKING_SETUP_GUIDE.md

## 📝 Test Report Template

After testing, document your findings:

```markdown
## Test Report - Booking.com Integration

**Date**: [Date]
**Tester**: [Your Name]
**Environment**: Development / Production

### Results
- ✅ All core functionality works
- ✅ Cross-browser compatible
- ✅ Mobile responsive
- ⚠️ [Any issues found]

### Issues Found
1. [Issue description]
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Recommendations
- [Any improvements or suggestions]

### Next Steps
- [What needs to be done before production]
```

---

**Ready to test?** Start with the 🎯 Quick Test at the top of this guide! Good luck! 🚀

