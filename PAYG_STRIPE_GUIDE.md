# Pay-As-You-Go (PAYG) Stripe Integration Guide

## 📊 Overview

Your PAYG system uses Stripe for one-time credit purchases. Users buy credit packs, and the euro amount is added to their balance in your database. When they generate plans, the cost is deducted from their balance.

**Updated Pricing: €1.00-€1.75 per plan (varies by model)**

---

## 🎯 How PAYG Works in Stripe

### 1. **Stripe Products (One-Time Payments)**

In Stripe, you create **products** with **one-time prices**:

| Product Name | Price | Stripe Type | User Gets |
|-------------|-------|-------------|-----------|
| €2 Credit Pack | €2.00 | One-time | €2 in credits = 1-2 plans |
| €5 Credit Pack | €5.00 | One-time | €5 in credits = 2-5 plans |
| €10 Credit Pack | €10.00 | One-time | €10 in credits = 5-10 plans |
| €20 Credit Pack | €20.00 | One-time | €20 in credits = 11-20 plans |

### 2. **Purchase Flow**

```
User clicks "Add €5 Credits"
    ↓
Frontend calls: POST /api/stripe/create-credits-checkout
    ↓
Stripe creates checkout session (mode: 'payment')
    ↓
User redirected to Stripe Checkout
    ↓
User pays with card
    ↓
Stripe sends webhook: checkout.session.completed
    ↓
Your webhook handler adds €5 to user's credits_balance
    ↓
User can now generate 2-5 plans (€1.00-€1.75 depending on model)
```

### 3. **Database Storage**

```sql
-- User credits stored in profiles table
profiles:
  - credits_balance: DECIMAL(10,2)  -- Example: 5.00 (€5)
  
-- When user generates a plan:
UPDATE profiles 
SET credits_balance = credits_balance - 0.99
WHERE id = 'user-id';
```

### 4. **Code Flow**

```typescript
// 1. Check if user has enough credits (BEFORE generation)
const canGenerate = await canGeneratePlan(userId, modelKey);
// Returns: { allowed: true/false, reason: "..." }

// 2. Generate the itinerary (if allowed)
const itinerary = await generateItinerary(...);

// 3. Deduct credits (AFTER successful generation)
await recordPlanGeneration(planId, modelKey, 'create');
// This deducts model cost (€1.00-€1.75) from credits_balance
```

---

## 🔧 Fixing Your Current Error

### Problem
```
Error: No such price: 'prod_TKgdG958urqB1S'
```

You're using a **Product ID** (`prod_...`) instead of a **Price ID** (`price_...`).

### Solution: Get Price IDs from Stripe

#### Step 1: Find Your Products in Stripe
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. You should see your 5-6 products:
   - Pro Subscription (recurring)
   - €2 Credit Pack (one-time)
   - €5 Credit Pack (one-time)
   - €10 Credit Pack (one-time)
   - €20 Credit Pack (one-time)

#### Step 2: Get the Price IDs
For **each product**, click on it and copy the **Price ID**:

```
Example Product View:
┌─────────────────────────────────────┐
│ €2 Credit Pack                      │
│ Product ID: prod_TKgdG958urqB1S ❌  │ ← Don't use this
│                                     │
│ Pricing:                            │
│ ┌─────────────────────────────┐   │
│ │ €2.00 (one-time)            │   │
│ │ Price ID: price_1ABC2XYZ... │ ✅ │ ← Use this!
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### Step 3: Update Your Environment Variables

Create/update `travel-planner/.env.local`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Subscription (Recurring)
STRIPE_PRO_PRICE_ID=price_1ABC123...

# PAYG Credit Packs (One-time)
STRIPE_CREDIT_2_PRICE_ID=price_1DEF456...
STRIPE_CREDIT_5_PRICE_ID=price_1GHI789...
STRIPE_CREDIT_10_PRICE_ID=price_1JKL012...
STRIPE_CREDIT_20_PRICE_ID=price_1MNO345...

# Webhook Secret (from Stripe CLI or Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...

# Your site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Step 4: Restart Your Server
```bash
# Stop the dev server (Ctrl+C)
cd travel-planner
npm run dev
```

---

## 🎨 Creating Stripe Products (If You Haven't)

### Create Pro Subscription (Recurring)

1. Go to [Products](https://dashboard.stripe.com/products) → **Add product**
2. Fill in:
   - **Name**: Pro Subscription
   - **Description**: Monthly subscription for unlimited AI travel planning
   - **Pricing model**: Standard pricing
   - **Price**: €9.99
   - **Billing period**: Recurring → Monthly
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_`)
5. Add to `.env.local`: `STRIPE_PRO_PRICE_ID=price_...`

### Create PAYG Credit Packs (One-Time)

Create **4 separate products** (one for each credit pack):

#### Product 1: €2 Credit Pack
1. **Add product**
2. Fill in:
   - **Name**: €2 Credit Pack
   - **Description**: 2 AI travel plans
   - **Pricing model**: Standard pricing
   - **Price**: €2.00
   - **Billing period**: One time
3. Copy **Price ID** → `.env.local`: `STRIPE_CREDIT_2_PRICE_ID=price_...`

#### Product 2: €5 Credit Pack
1. **Add product**
2. Fill in:
   - **Name**: €5 Credit Pack
   - **Description**: 5 AI travel plans
   - **Price**: €5.00
   - **Billing period**: One time
3. Copy **Price ID** → `.env.local`: `STRIPE_CREDIT_5_PRICE_ID=price_...`

#### Product 3: €10 Credit Pack
1. **Add product**
2. Fill in:
   - **Name**: €10 Credit Pack
   - **Description**: 10 AI travel plans
   - **Price**: €10.00
   - **Billing period**: One time
3. Copy **Price ID** → `.env.local`: `STRIPE_CREDIT_10_PRICE_ID=price_...`

#### Product 4: €20 Credit Pack
1. **Add product**
2. Fill in:
   - **Name**: €20 Credit Pack
   - **Description**: 20 AI travel plans
   - **Price**: €20.00
   - **Billing period**: One time
3. Copy **Price ID** → `.env.local`: `STRIPE_CREDIT_20_PRICE_ID=price_...`

---

## 🧪 Testing PAYG

### Test with Stripe Test Mode

1. Make sure you're using **test mode** keys (start with `sk_test_` and `pk_test_`)

2. Use [Stripe test cards](https://stripe.com/docs/testing):
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - Use any future expiry date (e.g., `12/34`)
   - Use any 3-digit CVC (e.g., `123`)

3. Test the flow:
   ```
   1. Sign up/login as a user
   2. Create 2 free plans (exhaust free tier)
   3. Try to create 3rd plan → should show upgrade modal
   4. Click "Add Credits" → select €5 pack
   5. Complete checkout with test card
   6. Check database: credits_balance should be 5.00
   7. Generate plan with economy model (€1.00) → credits_balance should be 4.00
   8. Generate plan with premium model (€1.75) → credits_balance should be 2.25
   9. Continue generating until balance insufficient
   ```

### Verify in Database

```sql
-- Check user credits
SELECT email, subscription_tier, credits_balance, plans_created_count
FROM profiles
WHERE email = 'test@example.com';

-- Check usage logs
SELECT model_used, operation, credits_deducted, created_at
FROM ai_usage_logs
WHERE user_id = 'user-id'
ORDER BY created_at DESC;
```

---

## 🔐 Webhook Setup

Your webhooks are already configured in:
- **File**: `travel-planner/src/app/api/stripe/webhook/route.ts`

### Events Handled:
- `checkout.session.completed` - Adds credits after successful payment
- `customer.subscription.created` - Activates Pro subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription

### Testing Webhooks Locally

```bash
# Install Stripe CLI (if you haven't)
# Windows (using Scoop):
scoop install stripe

# Or download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook secret (starts with whsec_) and add to .env.local:
# STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 💰 Pricing Summary (Variable Pricing)

### PAYG Credit Economics

| Credit Pack | Cost | Economy Plans | Premium Plans | 
|------------|------|---------------|---------------|
| €2 | €2.00 | 2 plans | 1 plan |
| €5 | €5.00 | 5 plans | 2-4 plans |
| €10 | €10.00 | 10 plans | 5-8 plans |
| €20 | €20.00 | 20 plans | 11-16 plans |

**Note**: Plan count varies based on which AI models you choose.

### Model Costs (Variable Pricing)

| Model | Tier | Cost | Quality |
|-------|------|------|---------|
| Gemini Flash | Economy | €1.00 | Good |
| GPT-4o Mini | Economy | €1.00 | Better |
| Gemini 2.5 Flash | Premium | €1.20 | Great |
| Claude Haiku | Premium | €1.35 | Great |
| Gemini 2.5 Pro | Premium | €1.50 | Advanced |
| GPT-4o | Premium | €1.75 | Best |

---

## 📋 Quick Checklist

- [ ] Created 5 products in Stripe (1 subscription + 4 credit packs)
- [ ] Copied all 5 **Price IDs** (not Product IDs)
- [ ] Added Price IDs to `.env.local`
- [ ] Restarted development server
- [ ] Tested credit purchase with test card
- [ ] Verified credits added to database
- [ ] Tested plan generation deducts €0.99
- [ ] Set up Stripe webhook (for production)

---

## 🚀 Go Live Checklist (Production)

When ready to accept real payments:

1. **Switch to Live Mode** in Stripe Dashboard
2. Copy **live keys** (start with `sk_live_` and `pk_live_`)
3. Create products again in **Live Mode** (test products don't transfer)
4. Set up **production webhook endpoint**:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`
5. Update environment variables in production (Vercel/etc.)
6. Test with a real card (use small amounts!)
7. Monitor Stripe Dashboard for payments

---

## 🆘 Troubleshooting

### Error: "No such price"
- **Cause**: Using Product ID instead of Price ID
- **Fix**: Copy the Price ID from inside the product (not the product ID)

### Credits not added after payment
- **Cause**: Webhook not working
- **Fix**: Check webhook endpoint is accessible, verify webhook secret

### User can't generate even with credits
- **Cause**: Rate limiting or insufficient balance
- **Fix**: Check `canGeneratePlan()` function logs

### Stripe test cards not working
- **Cause**: Using live mode keys with test cards (or vice versa)
- **Fix**: Ensure keys match the mode (test keys with test cards)

---

Need more help? Check:
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- `travel-planner/STRIPE_SETUP_GUIDE.md`

