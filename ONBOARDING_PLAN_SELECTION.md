# Onboarding Plan Selection Feature

## Overview
New users now see a plan selection page immediately after signing up (or after confirming their email). This captures users who want to start with a paid plan and increases conversion from free to paid tiers.

## Business Problem
**Before:** All new users defaulted to the free tier with no opportunity to choose a paid plan during signup.

**Risk:** Users who want premium features or unlimited plans are forced to:
1. Start with free tier
2. Hit the 2-plan limit
3. Navigate to pricing page
4. Upgrade manually

This friction causes:
- Lost revenue from ready-to-pay users
- Poor first impression (limits hit quickly)
- Reduced conversion rates
- Extra support tickets

## Solution Implemented

### New User Onboarding Flow

#### Flow 1: Email Confirmation Enabled (Default)
```
1. User signs up → /sign-up
2. Redirected to → /confirm-email
3. User checks email and clicks link
4. Redirected to → /choose-plan  ⭐ NEW
5. User selects plan (Free, Pro, or PAYG)
6. Redirected to → / (home page)
7. User starts creating itineraries
```

#### Flow 2: Email Confirmation Disabled
```
1. User signs up → /sign-up
2. Redirected to → /choose-plan  ⭐ NEW
3. User selects plan (Free, Pro, or PAYG)
4. Redirected to → / (home page)
5. User starts creating itineraries
```

#### Flow 3: With Draft Itinerary
```
1. Anonymous user creates itinerary
2. Clicks "Sign up" with itineraryId
3. Completes signup → /sign-up?itineraryId=abc123
4. Confirms email (if required)
5. Redirected to → /choose-plan?itineraryId=abc123  ⭐ NEW
6. Selects plan
7. Redirected to → /?itineraryId=abc123
8. Draft itinerary is claimed ✅
```

## Implementation Details

### 1. Plan Selection Page (`/choose-plan`)

**Location:** `src/app/(auth)/choose-plan/page.tsx`

**Features:**
- ✅ Beautiful, responsive card layout
- ✅ All 3 tiers displayed (Free, Pro, PAYG)
- ✅ Pro tier highlighted as "Recommended"
- ✅ Visual selection state with checkmarks
- ✅ Feature lists for each tier
- ✅ Trust indicators (100+ countries, 4 AI models, 24/7)
- ✅ "Continue with [Plan]" CTA button
- ✅ "I'll choose later" skip option
- ✅ Preserves itineraryId throughout flow

**UI/UX Highlights:**
- Default selection: Free tier (low-friction)
- Pro tier scaled slightly larger (draws attention)
- Selected card has ring, shadow, and checkmark
- Clear pricing and features comparison
- One-click plan selection
- Non-intrusive skip option

### 2. Auth Callback Handler

**Location:** `src/app/auth/callback/route.ts`

Handles email confirmation redirects from Supabase:
```typescript
GET /auth/callback?code=xxx&itineraryId=xxx
  ↓
Exchanges code for session
  ↓
Redirects to /choose-plan?itineraryId=xxx
```

This ensures users are taken to plan selection after confirming their email.

### 3. Updated Sign-Up Flow

**Location:** `src/lib/actions/auth-actions.ts` - `signUp()` function

```typescript
// Before:
redirect('/') // Default free tier, no choice

// After:
if (data.session === null) {
  // Email confirmation required
  redirect(`/confirm-email?email=${email}&itineraryId=${itineraryId}`);
} else {
  // Email confirmation disabled
  redirect(`/choose-plan?itineraryId=${itineraryId}`);
}
```

### 4. Updated Confirmation Page

**Location:** `src/app/(auth)/confirm-email/page.tsx`

Added step in instructions:
```
4. Choose your plan (Free, Pro, or Pay-as-you-go)
5. Start creating amazing travel itineraries!
```

This sets expectations that plan selection is next.

## Plan Selection Logic

### Free Tier
- **Action:** Redirect immediately (already default)
- **No API call needed** - users are already on free tier
- **Fast onboarding** - one click and they're in

### Pro Tier
- **Action:** Call `updateSubscriptionTier('pro')`
- **Updates:** subscription_tier, subscription_status, billing_cycle_start
- **Initializes:** monthly counters
- **Note:** Payment integration needed (Stripe webhook)

### PAYG Tier
- **Action:** Call `updateSubscriptionTier('payg')`
- **Updates:** subscription_tier
- **Note:** Users need to add credits before creating plans
- **Future:** Could prompt for initial credit purchase

## User Experience

### Visual Design
```
┌─────────────────────────────────────────────────┐
│              Choose Your Plan                    │
│   Start planning your dream trips today          │
│                                                  │
│  ┌────────┐  ┌────────────┐  ┌────────┐        │
│  │  Free  │  │ ⭐ Pro     │  │  PAYG  │        │
│  │  €0    │  │ €9.99/mo   │  │ €0.15+ │        │
│  │        │  │ [SELECTED] │  │        │        │
│  │ • 2 AI │  │ • 100+20   │  │ • Pay  │        │
│  │ plans  │  │   plans/mo │  │   per  │        │
│  │ • 2    │  │ • All      │  │   plan │        │
│  │ models │  │   models   │  │ • All  │        │
│  └────────┘  └────────────┘  └────────┘        │
│                                                  │
│  [Continue with Pro →]                          │
│                                                  │
│  I'll choose later                              │
└─────────────────────────────────────────────────┘
```

### Benefits Display

Each plan card shows:
- Plan name and icon
- Price (prominent)
- Short description
- Feature list with checkmarks
- Selection indicator

**Free Plan:**
- Icon: ⚡ Zap
- Emphasis: "Perfect for trying out"
- Features: Limited but complete

**Pro Plan:**
- Icon: 👑 Crown
- Badge: "⭐ Recommended"
- Emphasis: "Best for frequent travelers"
- Features: Comprehensive
- Scaled: 105% size on desktop

**PAYG Plan:**
- Icon: ✨ Sparkles
- Emphasis: "Perfect for occasional travelers"
- Features: Flexible pricing

## Configuration

### Supabase Email Redirect URL

Set this in Supabase Dashboard:
```
Authentication → URL Configuration → Redirect URLs
Add: https://yourdomain.com/auth/callback
```

For development:
```
http://localhost:3000/auth/callback
```

### Skip Option Behavior

Users can click "I'll choose later" to:
- Stay on free tier (default)
- Go directly to home page
- Not see plan selection again (unless they manually go to pricing)

This respects user autonomy while still presenting the choice.

## Analytics & Metrics

### Key Metrics to Track

1. **Conversion Rates:**
   - % choosing Free vs Pro vs PAYG
   - % skipping plan selection
   - Free → Pro conversion rate
   - Free → PAYG conversion rate

2. **User Behavior:**
   - Time spent on plan selection page
   - Plan changes before confirming
   - Drop-off rate at plan selection

3. **Revenue Impact:**
   - New Pro signups from onboarding
   - New PAYG credit purchases
   - Lifetime value by onboarding tier chosen

### Recommended Events to Log

```typescript
// Plan selected
analytics.track('plan_selected', {
  tier: 'pro',
  from_onboarding: true,
  has_itinerary: !!itineraryId
});

// Plan skipped
analytics.track('plan_selection_skipped', {
  from_onboarding: true
});

// Payment initiated (for Pro/PAYG)
analytics.track('payment_initiated', {
  tier: 'pro',
  amount: 9.99,
  from_onboarding: true
});
```

## Testing

### Manual Test Cases

#### Test 1: Sign Up → Plan Selection (Email Confirmation Disabled)
1. Disable email confirmation in Supabase
2. Go to `/sign-up`
3. Complete signup form
4. **Expected:** Redirect to `/choose-plan`
5. Select Pro plan
6. Click "Continue with Pro"
7. **Expected:** Redirect to `/`, subscription_tier = 'pro'

#### Test 2: Sign Up → Email Confirm → Plan Selection
1. Enable email confirmation in Supabase
2. Go to `/sign-up`
3. Complete signup form
4. **Expected:** Redirect to `/confirm-email`
5. Check email, click confirmation link
6. **Expected:** Redirect to `/choose-plan`
7. Select Free plan
8. Click "Continue with Free"
9. **Expected:** Redirect to `/`, subscription_tier = 'free'

#### Test 3: Draft Itinerary Flow
1. Create itinerary while logged out
2. Click sign up link (preserves itineraryId)
3. Complete signup
4. Confirm email (if required)
5. **Expected:** Redirect to `/choose-plan?itineraryId=xxx`
6. Select any plan
7. **Expected:** Redirect to `/?itineraryId=xxx`
8. Verify draft is claimed

#### Test 4: Skip Plan Selection
1. Complete signup
2. Arrive at `/choose-plan`
3. Click "I'll choose later"
4. **Expected:** Redirect to `/`, subscription_tier = 'free'

### Edge Cases

✅ User refreshes page → Selection state preserved
✅ User presses back button → Can change selection
✅ Multiple itineraryIds (shouldn't happen) → Uses first one
✅ Invalid itineraryId → Ignored, proceed normally
✅ Network error during tier update → Shows error toast
✅ Already on paid tier → Still shows (can downgrade)

## Payment Integration

### Current State
Plan selection updates the database but doesn't collect payment.

### TODO: Payment Flow

For Pro tier:
```typescript
// When user selects Pro
1. Show plan selection UI
2. User clicks "Continue with Pro"
3. Redirect to Stripe Checkout
4. After payment → Stripe webhook
5. Webhook updates subscription_tier and status
6. Redirect to home page
```

For PAYG tier:
```typescript
// When user selects PAYG
1. Show plan selection UI
2. User clicks "Continue with PAYG"
3. Show credit purchase modal
4. User selects amount (€2, €5, €10, €20)
5. Redirect to Stripe Checkout
6. After payment → Stripe webhook
7. Webhook adds credits to balance
8. Redirect to home page
```

### Stripe Integration Points

Create these routes:
- `POST /api/stripe/create-checkout-session` - For Pro subscriptions
- `POST /api/stripe/create-credits-checkout` - For PAYG credits
- `POST /api/webhooks/stripe` - Handle payment confirmations

## A/B Testing Opportunities

### Variants to Test

1. **Default Selection:**
   - A: Free (current)
   - B: Pro
   - Hypothesis: Pre-selecting Pro increases conversions

2. **Skip Option:**
   - A: Visible (current)
   - B: Hidden
   - Hypothesis: Hiding increases plan selection

3. **Pro Positioning:**
   - A: Middle position (current)
   - B: Left position
   - Hypothesis: Left position gets more selections

4. **Social Proof:**
   - A: No social proof (current)
   - B: "5,000+ travelers chose Pro"
   - Hypothesis: Social proof increases Pro conversions

5. **Pricing Display:**
   - A: Monthly only (current)
   - B: Monthly + annual savings
   - Hypothesis: Annual option increases Pro conversions

## Future Enhancements

### Phase 2: Payment Integration
- [ ] Stripe checkout for Pro subscriptions
- [ ] PAYG credit purchase flow
- [ ] Payment success/failure handling
- [ ] Receipt emails

### Phase 3: Enhanced UX
- [ ] Plan comparison toggle/modal
- [ ] Feature highlights on hover
- [ ] Testimonials/reviews
- [ ] Money-back guarantee badge
- [ ] Live chat support button

### Phase 4: Personalization
- [ ] Show different default based on user intent
- [ ] Recommend plan based on itinerary complexity
- [ ] Seasonal pricing/promotions
- [ ] Referral discount codes

### Phase 5: Analytics
- [ ] Conversion funnel visualization
- [ ] A/B test results dashboard
- [ ] Cohort analysis by onboarding tier
- [ ] LTV predictions

## Security Considerations

### Implemented
✅ Server-side tier updates (not client-controlled)
✅ Authentication required for plan changes
✅ RLS policies enforce user-specific data
✅ Input validation on tier values

### Future Security
- [ ] Rate limiting on tier changes
- [ ] Fraud detection for PAYG purchases
- [ ] Payment verification before tier upgrade
- [ ] Audit log for subscription changes

## Support & Troubleshooting

### Common Issues

**Q: User stuck on plan selection page**
- Check: Is updateSubscriptionTier() working?
- Check: Are there database errors?
- Solution: Provide skip option for workaround

**Q: User selected Pro but shows as Free**
- Check: Did payment complete?
- Check: Did Stripe webhook fire?
- Solution: Manual tier update or payment link

**Q: itineraryId not preserved**
- Check: URL parameters throughout flow
- Check: Callback route implementation
- Solution: Re-send itinerary claim link

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Plan Choice** | ❌ Default free only | ✅ Choice during signup |
| **Paid Conversion** | ❌ Requires extra step | ✅ Immediate option |
| **User Friction** | ✅ Zero (but limiting) | ✅ Minimal (empowering) |
| **Revenue** | ❌ Delayed | ✅ Immediate capture |
| **UX** | ❌ Limits surprise users | ✅ Clear expectations |
| **Skip Option** | N/A | ✅ Available |
| **Mobile UX** | N/A | ✅ Fully responsive |

## Files Created/Modified

### Created
1. `src/app/(auth)/choose-plan/page.tsx` - Plan selection UI
2. `src/app/auth/callback/route.ts` - Email confirmation callback

### Modified  
1. `src/lib/actions/auth-actions.ts` - Updated signup redirect
2. `src/app/(auth)/confirm-email/page.tsx` - Updated instructions

## Dependencies

No new dependencies! Uses existing:
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `next/navigation` - Router
- shadcn/ui components

## Conclusion

This feature captures revenue opportunities at the perfect moment - right when users are excited about the product after signing up. By presenting plans in a beautiful, non-intrusive way with a skip option, we:

1. ✅ Increase Pro tier signups during onboarding
2. ✅ Set clear expectations about plans and limits
3. ✅ Reduce friction with simple, visual UI
4. ✅ Preserve user autonomy with skip option
5. ✅ Maintain excellent UX with seamless flow

**Expected Impact:**
- 15-25% of new users selecting paid plans immediately
- Reduced support tickets about free tier limits
- Increased user satisfaction (clear expectations)
- Higher LTV for onboarded paid users

The key is making it **easy and appealing** to choose a paid plan while **never forcing** users into it.

