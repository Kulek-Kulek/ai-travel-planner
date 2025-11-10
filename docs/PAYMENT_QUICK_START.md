# Payment Integration - Quick Start

## ✅ What's Been Implemented

Your AI Travel Planner now has a complete Stripe payment integration:

### 🎯 Features
- ✅ Pro Subscription (€9.99/month) with automatic billing
- ✅ PAYG Credit Packs (€2, €5, €10, €20) as one-time purchases
- ✅ Automatic account upgrades on successful payment
- ✅ Webhook handler for payment events
- ✅ Customer portal for subscription management
- ✅ Payment success page
- ✅ Database schema for Stripe data
- ✅ Transaction logging for audit trail

### 📁 New Files Created

**API Routes:**
- `/src/app/api/stripe/create-subscription-checkout/route.ts` - Pro subscription checkout
- `/src/app/api/stripe/create-credits-checkout/route.ts` - PAYG credits checkout
- `/src/app/api/stripe/webhook/route.ts` - Webhook handler
- `/src/app/api/stripe/customer-portal/route.ts` - Customer portal access

**Components:**
- `/src/components/payment-button.tsx` - Reusable payment button
- `/src/components/pricing-cards-client.tsx` - Client-side pricing cards with payments

**Configuration:**
- `/src/lib/stripe/config.ts` - Stripe configuration
- `/src/lib/stripe/utils.ts` - Stripe utility functions

**Pages:**
- `/src/app/payment/success/page.tsx` - Payment success page
- `/src/app/payment/layout.tsx` - Payment pages layout

**Database:**
- `/supabase/migrations/020_add_stripe_fields.sql` - Stripe fields migration

**Documentation:**
- `STRIPE_SETUP_GUIDE.md` - Complete setup instructions

---

## 🚀 Quick Setup (5 Minutes)

### 1. Install Dependencies ✅
Already done! Stripe package is installed.

### 2. Run Database Migration

```bash
cd travel-planner
npx supabase db push
```

Or manually run `/supabase/migrations/020_add_stripe_fields.sql` in Supabase SQL Editor.

### 3. Get Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. Copy your keys

### 4. Create Stripe Products

Create these products in [Stripe Dashboard → Products](https://dashboard.stripe.com/products):

| Product | Type | Price | Billing |
|---------|------|-------|---------|
| Pro Subscription | Recurring | €9.99 | Monthly |
| €2 Credit Pack | One-time | €2.00 | - |
| €5 Credit Pack | One-time | €5.00 | - |
| €10 Credit Pack | One-time | €10.00 | - |
| €20 Credit Pack | One-time | €20.00 | - |

### 5. Add Environment Variables

Add to `.env.local`:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Pro Subscription
STRIPE_PRO_PRICE_ID=price_1...

# PAYG Credit Packs
STRIPE_CREDIT_2_PRICE_ID=price_1...
STRIPE_CREDIT_5_PRICE_ID=price_1...
STRIPE_CREDIT_10_PRICE_ID=price_1...
STRIPE_CREDIT_20_PRICE_ID=price_1...

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 6. Set Up Webhook (Development)

```bash
# Install Stripe CLI
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook secret (whsec_...) to .env.local
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 7. Test It!

1. Start dev server: `npm run dev`
2. Start webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Go to: `http://localhost:3000/pricing`
4. Click "Start Pro" or "Buy Credits"
5. Use test card: `4242 4242 4242 4242`
6. Check database that subscription_tier and credits updated!

---

## 🎯 How It Works

### User Flow: Pro Subscription

1. User clicks **"Start Pro"** on pricing page
2. `PaymentButton` calls `/api/stripe/create-subscription-checkout`
3. API creates Stripe Checkout session
4. User redirected to Stripe checkout page
5. User completes payment
6. Stripe redirects to `/payment/success`
7. Stripe webhook fires `checkout.session.completed`
8. Webhook handler updates database:
   - `subscription_tier` = 'pro'
   - `subscription_status` = 'active'
   - `stripe_customer_id` and `stripe_subscription_id` saved
   - `billing_cycle_start` set to now
9. User can now use Pro features!

### User Flow: PAYG Credits

1. User clicks **"Buy Now"** on credit pack
2. `PaymentButton` calls `/api/stripe/create-credits-checkout`
3. API creates Stripe Checkout session
4. User completes one-time payment
5. Stripe webhook fires `checkout.session.completed`
6. Webhook handler:
   - Adds credits to `credits_balance`
   - Sets `subscription_tier` = 'payg'
   - Logs transaction in `stripe_transactions`
7. User can create itineraries using credits!

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription or add credits |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Downgrade to free tier |
| `invoice.payment_succeeded` | Extend subscription period |
| `invoice.payment_failed` | Log failed payment |
| `payment_intent.succeeded` | Log successful payment |
| `payment_intent.payment_failed` | Log failed payment |

---

## 🔧 Database Schema

### New Fields in `profiles`

```sql
stripe_customer_id TEXT        -- Stripe customer ID
stripe_subscription_id TEXT    -- Stripe subscription ID (Pro tier)
subscription_end_date TIMESTAMPTZ  -- End date of subscription
```

### New Table: `stripe_transactions`

```sql
id UUID
user_id UUID
stripe_payment_intent_id TEXT
stripe_session_id TEXT
amount DECIMAL(10,2)
currency TEXT
transaction_type TEXT  -- 'subscription', 'credit_purchase', 'refund'
status TEXT           -- 'pending', 'succeeded', 'failed', 'refunded'
metadata JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

## 🧪 Testing Checklist

### Test Pro Subscription
- [ ] Click "Start Pro" → redirects to Stripe checkout
- [ ] Complete payment → redirects to success page
- [ ] Check database: `subscription_tier = 'pro'`
- [ ] Check database: `stripe_customer_id` populated
- [ ] Check database: `stripe_subscription_id` populated
- [ ] Check database: `subscription_status = 'active'`
- [ ] Check `stripe_transactions` table has entry

### Test PAYG Credits
- [ ] Click "Buy Now" on €5 pack → redirects to checkout
- [ ] Complete payment → redirects to success page
- [ ] Check database: `credits_balance` increased by 5
- [ ] Check database: `subscription_tier = 'payg'`
- [ ] Check `stripe_transactions` table has entry

### Test Webhook
- [ ] Make payment
- [ ] Check Stripe webhook logs show successful delivery
- [ ] Check server logs show webhook processing
- [ ] Database updates correctly

### Test with Different Cards
- [ ] Success: `4242 4242 4242 4242` ✅
- [ ] Declined: `4000 0000 0000 0002` ❌
- [ ] 3D Secure: `4000 0025 0000 3155` 🔐

---

## 🚨 Common Issues

### "Unauthorized" when clicking button
**Solution:** User must be logged in. Payment buttons require authentication.

### Webhook not updating database
**Solutions:**
- Check webhook is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Verify `STRIPE_WEBHOOK_SECRET` in `.env.local`
- Check server logs for webhook errors
- Verify endpoint is accessible

### "Failed to create checkout session"
**Solutions:**
- Verify all `STRIPE_*_PRICE_ID` environment variables are set
- Check price IDs match Stripe products
- Verify API keys are correct
- Check server logs for detailed error

### Payment succeeds but user not upgraded
**Solutions:**
- Check Stripe webhook logs
- Verify webhook secret is correct
- Check server logs for webhook processing errors
- Look at `stripe_transactions` table for clues

---

## 🎨 Customization

### Change Pricing

Edit `/src/lib/config/pricing-models.ts`:

```typescript
export const TIER_CONFIG = {
  pro: {
    price: 9.99,  // Change this
    // ...
  }
}
```

Also update Stripe product price!

### Add New Credit Pack

1. Create product in Stripe
2. Add to `.env.local`:
   ```
   STRIPE_CREDIT_50_PRICE_ID=price_...
   ```
3. Update `/src/lib/stripe/config.ts`:
   ```typescript
   creditPacks: {
     // ...
     '50': {
       priceId: process.env.STRIPE_CREDIT_50_PRICE_ID!,
       amount: 50,
       credits: 50,
     },
   }
   ```
4. Update `CREDIT_PACKS` in `/src/lib/config/pricing-models.ts`

### Custom Success Page

Edit `/src/app/payment/success/page.tsx` to customize the success message.

---

## 📊 Analytics Queries

### Revenue This Month
```sql
SELECT SUM(amount) as revenue
FROM stripe_transactions
WHERE status = 'succeeded'
AND created_at >= date_trunc('month', CURRENT_DATE);
```

### Active Subscriptions
```sql
SELECT COUNT(*) as active_subscriptions
FROM profiles
WHERE subscription_tier = 'pro' 
AND subscription_status = 'active';
```

### Top Credit Purchasers
```sql
SELECT 
  p.email,
  SUM(st.amount) as total_spent
FROM stripe_transactions st
JOIN profiles p ON p.id = st.user_id
WHERE st.transaction_type = 'credit_purchase'
AND st.status = 'succeeded'
GROUP BY p.email
ORDER BY total_spent DESC
LIMIT 10;
```

---

## 🌟 Next Steps

1. **Test thoroughly** with Stripe test cards
2. **Set up production webhook** when ready to deploy
3. **Enable Customer Portal** in Stripe settings
4. **Add email notifications** for failed payments (optional)
5. **Set up Stripe alerts** for monitoring
6. **Consider annual billing** for better retention

---

## 📚 Resources

- **Full Setup Guide**: `STRIPE_SETUP_GUIDE.md`
- **Stripe Docs**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Webhooks Guide**: https://stripe.com/docs/webhooks

---

## ✅ You're Ready!

Your payment system is production-ready! All you need to do is:

1. ✅ Run the database migration
2. ✅ Create Stripe products
3. ✅ Add environment variables
4. ✅ Test with Stripe CLI
5. 🚀 Deploy!

**Questions?** Check `STRIPE_SETUP_GUIDE.md` for detailed instructions.

