# ✅ Quick Test Checklist

Use this checklist to test payments step-by-step. Check off each item as you complete it.

## Setup Phase (10 minutes)

```
□ 1. Run database migration
   cd travel-planner
   npx supabase db push

□ 2. Create Stripe account at dashboard.stripe.com

□ 3. Get test API keys (dashboard.stripe.com/test/apikeys)
   - Copy Publishable key (pk_test_...)
   - Copy Secret key (sk_test_...)

□ 4. Create 5 products in Stripe:
   □ Pro Subscription (€9.99/month, recurring)
   □ €2 Credit Pack (€2, one-time)
   □ €5 Credit Pack (€5, one-time)
   □ €10 Credit Pack (€10, one-time)
   □ €20 Credit Pack (€20, one-time)

□ 5. Copy all 5 Price IDs (price_...)

□ 6. Update .env.local with:
   - STRIPE_SECRET_KEY
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - STRIPE_PRO_PRICE_ID
   - STRIPE_CREDIT_2_PRICE_ID
   - STRIPE_CREDIT_5_PRICE_ID
   - STRIPE_CREDIT_10_PRICE_ID
   - STRIPE_CREDIT_20_PRICE_ID
   - NEXT_PUBLIC_SITE_URL=http://localhost:3000

□ 7. Install Stripe CLI
   scoop install stripe (Windows)
   brew install stripe (Mac)

□ 8. Login to Stripe CLI
   stripe login

□ 9. Start webhook listener (Terminal 1)
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   Copy webhook secret (whsec_...)

□ 10. Add webhook secret to .env.local
   STRIPE_WEBHOOK_SECRET=whsec_...

□ 11. Start dev server (Terminal 2)
   npm run dev
```

## Test Phase (5 minutes)

```
□ 12. Open http://localhost:3000

□ 13. Sign up / Log in with test account
   Email: test@example.com

□ 14. Go to /pricing page

□ 15. Test Pro Subscription:
   □ Click "Start Pro"
   □ Use test card: 4242 4242 4242 4242
   □ See webhook in Terminal 1: [200] checkout.session.completed
   □ Redirected to /payment/success
   
□ 16. Verify in Supabase:
   SELECT subscription_tier, subscription_status 
   FROM profiles WHERE email = 'test@example.com';
   
   Expected: tier='pro', status='active'

□ 17. Test PAYG Credits:
   □ Go back to /pricing
   □ Click "Buy Now" on €5 pack
   □ Use test card: 4242 4242 4242 4242
   □ See webhook in Terminal 1
   □ Redirected to /payment/success

□ 18. Verify credits in Supabase:
   SELECT credits_balance FROM profiles 
   WHERE email = 'test@example.com';
   
   Expected: credits_balance = 5.00

□ 19. Check Stripe Dashboard:
   □ See payments at dashboard.stripe.com/test/payments
   □ See customer at dashboard.stripe.com/test/customers
   □ See subscription at dashboard.stripe.com/test/subscriptions

□ 20. Check database transactions:
   SELECT * FROM stripe_transactions 
   ORDER BY created_at DESC LIMIT 5;
```

## Test Cards

```
✅ Success:              4242 4242 4242 4242
❌ Declined:             4000 0000 0000 0002  
🔐 3D Secure:            4000 0025 0000 3155
❌ Insufficient Funds:   4000 0000 0000 9995
```

## Terminals You Need Running

```
Terminal 1: Stripe webhook listener
  stripe listen --forward-to localhost:3000/api/stripe/webhook

Terminal 2: Next.js dev server
  npm run dev
```

## Quick Troubleshooting

```
❌ "Failed to create checkout"
   → Check all env vars in .env.local
   → Restart server

❌ "No signature" webhook error
   → Check STRIPE_WEBHOOK_SECRET in .env.local
   → Restart webhook listener

❌ Database not updating
   → Check webhook terminal shows [200]
   → Check server logs for errors

❌ "Unauthorized"
   → Log in to the app first
```

## Success! ✅

When everything is checked off, you have:
- ✅ Working subscription payments
- ✅ Working credit purchases  
- ✅ Automatic database updates
- ✅ Transaction logging
- ✅ Webhook integration

**You're ready to go live! 🚀**

See TESTING_PAYMENTS_GUIDE.md for detailed instructions.






