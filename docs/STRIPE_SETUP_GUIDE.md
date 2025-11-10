# Stripe Payment Integration Setup Guide

This guide walks you through setting up Stripe payments for your AI Travel Planner application.

## 🎯 What You'll Set Up

- **Pro Subscription**: €9.99/month recurring subscription
- **PAYG Credit Packs**: One-time purchases of €2, €5, €10, €20
- **Customer Portal**: Allow users to manage their subscriptions
- **Webhooks**: Automatically update user accounts when payments succeed

---

## 📋 Prerequisites

1. A Stripe account ([sign up here](https://dashboard.stripe.com/register))
2. Access to your Supabase project
3. Your application deployed or running locally

---

## Step 1: Run Database Migration

First, add the Stripe fields to your database:

```bash
cd travel-planner

# Option A: Using Supabase CLI
npx supabase db push

# Option B: Manual
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/020_add_stripe_fields.sql
# 3. Paste and run
```

**Verify the migration:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'subscription_end_date');
```

---

## Step 2: Create Stripe Products

### A. Create Pro Subscription

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: Pro Subscription
   - **Description**: Monthly subscription for unlimited AI travel planning
   - **Pricing**: Recurring
   - **Price**: €9.99
   - **Billing period**: Monthly
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_...`)
6. Add to `.env.local`: `STRIPE_PRO_PRICE_ID=price_...`

### B. Create PAYG Credit Packs

Create 4 products for credit packs:

| Product Name | Price | Type |
|-------------|-------|------|
| €2 Credit Pack | €2.00 | One-time |
| €5 Credit Pack | €5.00 | One-time |
| €10 Credit Pack | €10.00 | One-time |
| €20 Credit Pack | €20.00 | One-time |

For each pack:
1. Click **"+ Add product"**
2. Fill in:
   - **Name**: €X Credit Pack
   - **Description**: Add €X to your account balance
   - **Pricing**: One-time
   - **Price**: €X
3. **Copy the Price ID** and add to `.env.local`

---

## Step 3: Configure Environment Variables

Create or update your `.env.local` file:

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

# Site URL (important for redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

### Where to Find Stripe Keys

1. **Secret Key & Publishable Key**:
   - Go to [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
   - Copy both keys

2. **Price IDs**:
   - Go to [Products](https://dashboard.stripe.com/products)
   - Click on each product
   - Copy the Price ID from the pricing section

---

## Step 4: Set Up Stripe Webhook

Webhooks allow Stripe to notify your app when payments succeed.

### Development (Local Testing)

1. **Install Stripe CLI**:
   ```bash
   # Windows (using Scoop)
   scoop install stripe
   
   # Mac (using Homebrew)
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to localhost**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copy the webhook secret** (starts with `whsec_...`) and add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Production

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Enter your webhook URL:
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. Click **"Add endpoint"**
6. **Copy the webhook secret** and add to your production environment variables

---

## Step 5: Test the Integration

### A. Test Pro Subscription

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, start Stripe webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Go to `http://localhost:3000/pricing`
4. Click **"Start Pro"** on the Pro plan
5. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any postal code

6. Complete the checkout
7. Verify:
   - You're redirected to `/payment/success`
   - In Supabase, check `profiles` table:
     - `subscription_tier` = 'pro'
     - `subscription_status` = 'active'
     - `stripe_customer_id` is populated
     - `stripe_subscription_id` is populated

### B. Test PAYG Credits

1. Click **"Buy Credits"** and select a credit pack
2. Complete checkout with test card
3. Verify:
   - You're redirected to `/payment/success`
   - In Supabase, check `profiles` table:
     - `credits_balance` increased by the purchase amount
     - `subscription_tier` = 'payg'
   - In `stripe_transactions` table:
     - New row with transaction details

### C. Test Stripe Test Cards

```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
Requires authentication: 4000 0025 0000 3155
```

More test cards: https://stripe.com/docs/testing

---

## Step 6: Enable Customer Portal (Optional but Recommended)

The customer portal lets users manage their subscriptions (cancel, update payment method, etc.).

1. Go to [Stripe Dashboard → Settings → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Click **"Activate"**
3. Configure settings:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to update billing information
   - ✅ Allow customers to cancel subscriptions
4. Click **"Save"**

Users can now access the portal from their dashboard.

---

## 🔐 Security Checklist

- [ ] Never commit `.env.local` to version control
- [ ] Use test mode keys during development
- [ ] Add webhook endpoint secret to production environment
- [ ] Enable Stripe webhook signature verification (already implemented)
- [ ] Set up proper CORS if using custom domains
- [ ] Use environment variables for all sensitive data

---

## 🚀 Going to Production

Before launching:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Create production products** (same as test mode)
3. **Update environment variables** with live keys:
   - `STRIPE_SECRET_KEY` (starts with `sk_live_...`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_...`)
   - Update all `STRIPE_*_PRICE_ID` with live price IDs
4. **Set up production webhook** endpoint
5. **Update `NEXT_PUBLIC_SITE_URL`** to production domain
6. **Test with real card** (small amount first!)

---

## 📊 Monitor Your Payments

### Stripe Dashboard

- [Payments](https://dashboard.stripe.com/payments) - See all transactions
- [Subscriptions](https://dashboard.stripe.com/subscriptions) - Manage subscriptions
- [Customers](https://dashboard.stripe.com/customers) - View customer details
- [Logs](https://dashboard.stripe.com/logs) - Debug webhook events

### Supabase Analytics

Check your database tables:

```sql
-- Recent transactions
SELECT * FROM stripe_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Active Pro subscriptions
SELECT email, subscription_tier, subscription_status, subscription_end_date
FROM profiles
WHERE subscription_tier = 'pro' AND subscription_status = 'active';

-- Total revenue (approximate from transactions)
SELECT 
  SUM(amount) as total_revenue,
  COUNT(*) as total_transactions
FROM stripe_transactions
WHERE status = 'succeeded';
```

---

## 🐛 Troubleshooting

### "Unauthorized" error when clicking payment button
- Check that you're logged in
- Verify authentication cookies are working

### "Failed to create checkout session"
- Check Stripe API keys in `.env.local`
- Verify price IDs are correct
- Check server logs for detailed error

### Webhook not updating database
- Verify webhook secret is correct
- Check webhook is running (for local: `stripe listen`)
- Look at Stripe logs for webhook delivery status
- Check server logs for webhook processing errors

### User charged but database not updated
- Check `stripe_transactions` table for the transaction
- Look at Stripe webhook logs
- Verify webhook endpoint is accessible
- May need to manually update database and investigate logs

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

## 🎉 You're Done!

Your payment system is now fully functional! Users can:
- ✅ Subscribe to Pro plan (€9.99/month)
- ✅ Purchase PAYG credits (€2, €5, €10, €20)
- ✅ Manage subscriptions via customer portal
- ✅ Automatic account upgrades on payment

Next steps:
- Test thoroughly in development
- Deploy to production
- Monitor initial payments closely
- Set up Stripe alerts for failed payments
- Consider adding email receipts (Stripe handles this by default)

