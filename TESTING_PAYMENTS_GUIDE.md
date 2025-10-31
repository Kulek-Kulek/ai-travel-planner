# 🧪 Testing Payments - Step-by-Step Guide

This guide will walk you through testing the Stripe payment integration from start to finish.

## ⏱️ Time Required: ~20 minutes

---

## Step 1: Run Database Migration (2 minutes)

First, add the Stripe fields to your database.

```bash
cd c:\Users\klugowski\Desktop\ai-travel-planner\travel-planner
npx supabase db push
```

**Expected output:**
```
Applying migration 020_add_stripe_fields.sql...
Migration completed successfully.
```

**Verify it worked:**
Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → SQL Editor, run:

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'subscription_end_date');
```

**Expected result:**
```
stripe_customer_id     | text
stripe_subscription_id | text
subscription_end_date  | timestamp with time zone
```

---

## Step 2: Create Stripe Account & Get Test Keys (5 minutes)

### A. Sign Up for Stripe
1. Go to https://dashboard.stripe.com/register
2. Create account (use your email)
3. Skip onboarding for now (you're testing)

### B. Get Your Test API Keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. Make sure you're in **TEST MODE** (toggle in top-right)
3. Copy both keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - Click "Reveal test key"

---

## Step 3: Create Test Products in Stripe (5 minutes)

### A. Create Pro Subscription Product

1. Go to https://dashboard.stripe.com/test/products
2. Click **"+ Create product"**
3. Fill in:
   ```
   Name: Pro Subscription
   Description: Monthly AI Travel Planner Pro subscription
   Pricing model: Standard pricing
   Price: €9.99 EUR
   Recurring: ✓ Yes
   Billing period: Monthly
   ```
4. Click **"Save product"**
5. **COPY THE PRICE ID** - You'll see it like `price_1Abc123...`
   - It's in the Pricing section
   - Should start with `price_`

### B. Create Credit Pack Products

Create 4 more products (one-time payments):

**Product 1: €2 Credit Pack**
```
Name: €2 Credit Pack
Description: Add €2 to your account balance
Pricing model: Standard pricing
Price: €2.00 EUR
Recurring: ✗ No (One-time)
```
**COPY THE PRICE ID**

**Product 2: €5 Credit Pack**
```
Name: €5 Credit Pack
Price: €5.00 EUR
Recurring: ✗ No
```
**COPY THE PRICE ID**

**Product 3: €10 Credit Pack**
```
Name: €10 Credit Pack
Price: €10.00 EUR
Recurring: ✗ No
```
**COPY THE PRICE ID**

**Product 4: €20 Credit Pack**
```
Name: €20 Credit Pack
Price: €20.00 EUR
Recurring: ✗ No
```
**COPY THE PRICE ID**

---

## Step 4: Configure Environment Variables (2 minutes)

Create/update `.env.local` in the `travel-planner` folder:

```bash
# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your-existing-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-existing-key

# Stripe Keys (add these)
STRIPE_SECRET_KEY=sk_test_51ABC...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...

# Stripe Product Price IDs (add these)
STRIPE_PRO_PRICE_ID=price_1ABC...
STRIPE_CREDIT_2_PRICE_ID=price_1DEF...
STRIPE_CREDIT_5_PRICE_ID=price_1GHI...
STRIPE_CREDIT_10_PRICE_ID=price_1JKL...
STRIPE_CREDIT_20_PRICE_ID=price_1MNO...

# Site URL (add this)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Webhook secret (we'll add this in next step)
# STRIPE_WEBHOOK_SECRET=whsec_... (leave empty for now)
```

**Save the file!**

---

## Step 5: Install Stripe CLI & Set Up Webhook (3 minutes)

### A. Install Stripe CLI

**Windows (PowerShell as Administrator):**
```powershell
# Option 1: Using Scoop
scoop install stripe

# Option 2: Direct download
# Download from: https://github.com/stripe/stripe-cli/releases/latest
# Extract and add to PATH
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

### B. Login to Stripe CLI
```bash
stripe login
```

This will open your browser. Click **"Allow access"**.

**Expected output:**
```
Your pairing code is: word-word-word
Press Enter to open the browser (^C to quit)
> Done! The Stripe CLI is configured for [your account]
```

### C. Start Webhook Listener

**Keep this terminal open!** Open a new terminal/PowerShell and run:

```bash
cd c:\Users\klugowski\Desktop\ai-travel-planner\travel-planner
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Expected output:**
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef...
  (^C to quit)
```

**Copy that webhook secret!** Add it to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

---

## Step 6: Start Development Server (1 minute)

Open a **NEW** terminal (keep the webhook listener running):

```bash
cd c:\Users\klugowski\Desktop\ai-travel-planner\travel-planner
npm run dev
```

**Expected output:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

Now you should have **2 terminals running**:
1. ✅ Stripe webhook listener
2. ✅ Next.js dev server

---

## Step 7: Test Pro Subscription Payment! 🎉

### A. Sign Up / Log In

1. Open browser: http://localhost:3000
2. If not logged in:
   - Click "Sign Up"
   - Create test account: `test@example.com`
   - Confirm email (check Supabase auth)

### B. Go to Pricing Page

Navigate to: http://localhost:3000/pricing

You should see 3 pricing tiers with payment buttons.

### C. Click "Start Pro"

1. Click the **"Start Pro"** button on the Pro plan
2. You should be redirected to Stripe Checkout page
3. You'll see: "Pro Subscription - €9.99/month"

### D. Complete Test Payment

Use Stripe test card:
```
Card number:     4242 4242 4242 4242
Expiry:          12/34 (any future date)
CVC:             123 (any 3 digits)
Name:            Test User
Email:           test@example.com
Country:         Any
ZIP:             12345
```

Click **"Subscribe"**

### E. Watch the Magic! ✨

**In the webhook terminal, you'll see:**
```
[200] POST /api/stripe/webhook [evt_1ABC...]
  checkout.session.completed
  customer.subscription.created
```

**In your browser:**
- You're redirected to: http://localhost:3000/payment/success
- You see: "Payment Successful!" 🎉

### F. Verify Database Update

Go to Supabase → SQL Editor:

```sql
SELECT 
  email,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  billing_cycle_start
FROM profiles
WHERE email = 'test@example.com';
```

**Expected result:**
```
email                | test@example.com
subscription_tier    | pro
subscription_status  | active
stripe_customer_id   | cus_ABC123...
stripe_subscription_id | sub_DEF456...
billing_cycle_start  | 2025-10-30 12:34:56
```

**Check transaction log:**
```sql
SELECT 
  transaction_type,
  amount,
  status,
  created_at
FROM stripe_transactions
WHERE user_id = (SELECT id FROM profiles WHERE email = 'test@example.com')
ORDER BY created_at DESC;
```

**Expected result:**
```
transaction_type | subscription
amount          | 9.99
status          | succeeded
created_at      | 2025-10-30 12:35:01
```

---

## Step 8: Test PAYG Credits Purchase! 💰

### A. Go Back to Pricing Page

Navigate to: http://localhost:3000/pricing

Scroll down to "Pay-as-you-go Credit Packs"

### B. Buy €5 Credits

1. Click **"Buy Now"** on the €5 pack
2. Redirected to Stripe Checkout
3. You'll see: "€5 Credit Pack - €5.00"

### C. Complete Payment

Use same test card:
```
4242 4242 4242 4242
12/34
123
```

Click **"Pay"**

### D. Check Webhook Terminal

You should see:
```
[200] POST /api/stripe/webhook [evt_2XYZ...]
  checkout.session.completed
  payment_intent.succeeded
```

### E. Verify Credits Added

Supabase → SQL Editor:

```sql
SELECT 
  email,
  subscription_tier,
  credits_balance
FROM profiles
WHERE email = 'test@example.com';
```

**Expected result:**
```
email             | test@example.com
subscription_tier | pro (stays pro)
credits_balance   | 5.00
```

**Check credit transaction:**
```sql
SELECT 
  transaction_type,
  amount,
  status,
  metadata
FROM stripe_transactions
WHERE user_id = (SELECT id FROM profiles WHERE email = 'test@example.com')
ORDER BY created_at DESC
LIMIT 1;
```

**Expected result:**
```
transaction_type | credit_purchase
amount          | 5.00
status          | succeeded
metadata        | {"credits_amount": "5"}
```

---

## Step 9: Test Different Scenarios 🧪

### Test Card Scenarios

**Successful payment:**
```
4242 4242 4242 4242
```

**Card declined:**
```
4000 0000 0000 0002
```
- Try this
- Payment should fail
- Check that database is NOT updated

**Requires 3D Secure authentication:**
```
4000 0025 0000 3155
```
- You'll see authentication modal
- Complete authentication
- Payment should succeed

**Insufficient funds:**
```
4000 0000 0000 9995
```
- Payment should fail

### More test cards:
https://stripe.com/docs/testing

---

## Step 10: View in Stripe Dashboard 📊

### A. View Payments

Go to: https://dashboard.stripe.com/test/payments

You should see:
- Your €9.99 subscription payment
- Your €5.00 credit purchase

Click on each to see details!

### B. View Customers

Go to: https://dashboard.stripe.com/test/customers

You should see your test customer:
- Name/Email from test
- Subscription status: Active
- Click to see details

### C. View Subscriptions

Go to: https://dashboard.stripe.com/test/subscriptions

You should see:
- Pro Subscription - €9.99/month
- Status: Active
- Next billing date

### D. View Webhook Events

Go to: https://dashboard.stripe.com/test/webhooks

Click on the webhook endpoint (your CLI listener)

You should see all the events:
- `checkout.session.completed`
- `customer.subscription.created`
- `payment_intent.succeeded`

---

## 🎉 Success Checklist

By now you should have:

- [x] Database migration completed
- [x] Stripe products created
- [x] Environment variables configured
- [x] Webhook listener running
- [x] Dev server running
- [x] Successfully completed Pro subscription payment
- [x] Database updated with subscription details
- [x] Successfully purchased PAYG credits
- [x] Credits added to account balance
- [x] Transactions logged in `stripe_transactions` table
- [x] Payments visible in Stripe Dashboard

---

## 🐛 Troubleshooting

### "Failed to create checkout session"

**Check:**
1. All environment variables are set in `.env.local`
2. Price IDs match your Stripe products
3. Server restarted after adding env vars: `npm run dev`

**Fix:**
```bash
# Restart server
# Press Ctrl+C in server terminal
npm run dev
```

### "No signature" webhook error

**Check:**
1. Webhook listener is running
2. `STRIPE_WEBHOOK_SECRET` is set in `.env.local`
3. Server restarted after adding secret

**Fix:**
```bash
# In webhook terminal
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the new secret to .env.local
# Restart server
```

### Database not updating

**Check:**
1. Webhook terminal shows successful delivery `[200]`
2. No errors in server console
3. User is logged in

**Debug:**
```sql
-- Check recent webhook attempts
SELECT * FROM stripe_transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check user's current state
SELECT * FROM profiles 
WHERE email = 'test@example.com';
```

### "Unauthorized" error

**Fix:**
Make sure you're logged in:
1. Go to http://localhost:3000/sign-in
2. Log in with your test account
3. Try payment again

---

## 🎯 What's Next?

Now that testing works, you can:

1. **Test more scenarios** (subscription cancellation, failed payments)
2. **Customize the UI** (payment buttons, success page)
3. **Set up production** (follow STRIPE_SETUP_GUIDE.md)
4. **Go live!** 🚀

---

## 📊 Useful SQL Queries for Testing

```sql
-- See all transactions
SELECT * FROM stripe_transactions ORDER BY created_at DESC;

-- See all Pro users
SELECT email, subscription_tier, subscription_status, subscription_end_date
FROM profiles 
WHERE subscription_tier = 'pro';

-- See all users with credits
SELECT email, credits_balance, subscription_tier
FROM profiles
WHERE credits_balance > 0;

-- Total revenue (test data)
SELECT 
  SUM(amount) as total_revenue,
  COUNT(*) as total_transactions
FROM stripe_transactions
WHERE status = 'succeeded';

-- Revenue by type
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as revenue
FROM stripe_transactions
WHERE status = 'succeeded'
GROUP BY transaction_type;
```

---

## 🎊 Congratulations!

You've successfully tested the complete payment integration! Your app can now:
- ✅ Accept Pro subscriptions
- ✅ Sell PAYG credits
- ✅ Automatically upgrade users
- ✅ Handle webhooks
- ✅ Log all transactions

**You're ready to launch! 🚀**

