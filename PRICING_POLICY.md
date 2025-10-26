# AI Travel Planner - Pricing Policy

## Overview
This document defines our pricing structure, business logic, and user limits for the AI Travel Planner application.

**Last Updated:** October 26, 2025  
**Status:** ✅ Approved for Implementation

---

## Pricing Tiers

### 🆓 Free Tier - €0/month

**Target Audience:** New users trying the product

**Limits:**
- 2 travel plans (lifetime, not renewable)
- 1 regeneration per plan (lifetime)
- AI models: Gemini Flash, GPT-4o Mini only
- Destination, dates, and travelers locked after creation

**Included Features:**
- ✅ Create 2 AI-powered itineraries
- ✅ Edit/regenerate each plan once
- ✅ Full feature access (like, share, download, bucket list)
- ✅ Browse all public plans
- ✅ Manage own plans (view, share, delete)

**Upgrade Path:**
After 2 plans, users must choose:
- Add credits (Pay-as-you-go)
- Subscribe to Pro plan

---

### 💳 Pay-as-you-go (PAYG)

**Target Audience:** Occasional travelers who don't want subscriptions

**How It Works:**
- Top up account with credits
- Pay per plan generation based on AI model
- Credits never expire
- No monthly commitment

**Top-up Options:**
- €2 (~10-13 plans)
- €5 (~25-33 plans)
- €10 (~50-67 plans)
- €20 (~100-133 plans)

**Pricing per Plan:**
| Model | Cost | Quality | Speed |
|-------|------|---------|-------|
| Gemini Flash | €0.15 | Good | Fast ⚡ |
| GPT-4o Mini | €0.20 | Better | Fast ⚡ |
| Claude Haiku | €0.30 | Great | Medium 🚀 |
| GPT-4o | €0.50 | Best | Medium 🚀 |

**Included Features:**
- ✅ All AI models unlocked
- ✅ Choose model per generation
- ✅ See exact cost before generating
- ✅ All premium features
- ✅ Credits never expire

---

### ⭐ Pro - €9.99/month

**Target Audience:** Frequent travelers, travel planners, agencies

**Monthly Allowance:**
- **100 plans** with economy models (Gemini Flash, GPT-4o Mini)
- **20 plans** with premium models (Claude Haiku, GPT-4o)
- Unused premium plans roll over (max 40 total)

**After Monthly Limits:**
- Continue with economy models (unlimited)
- Premium models: €0.20 per additional plan

**Included Features:**
- ✅ 100 economy + 20 premium generations/month
- ✅ All AI models included
- ✅ Priority generation queue
- ✅ All features unlocked
- ✅ Batch create (coming soon)
- ✅ API access (coming soon)
- ✅ Advanced analytics (coming soon)

**Breakeven Analysis:**
- vs PAYG: Profitable after ~40-50 plans/month
- Cost to us: ~€2-8/user/month (depending on usage)
- Target margin: 50-80% profit

---

## Business Logic & Rules

### 1. Cost Protection
**Problem:** "Unlimited" with expensive AI models = bankruptcy risk

**Solution:** Smart limits + fair use policy
- Economy models: Generous/unlimited
- Premium models: Capped with rollover
- Rate limiting: Max 20 generations/hour (all tiers)
- Alert system: Flag users with >€20 cost in single day

### 2. Edit Mode Restrictions
**Why:** Prevent users from "editing" to essentially get free new plans

**Rules:**
- Destination, dates, travelers **locked after creation**
- Can only modify: activities, preferences, dietary needs
- Free tier: 1 edit per plan (lifetime)
- Paid tiers: Unlimited edits (but costs same as new generation)

**Implementation:**
- Show locked fields as disabled with 🔒 icon
- Display clear message: "Create a new plan to change destination"
- Track edit count per plan in database

### 3. Model Selection UI

**For Free Users:**
```
[Available Models]
✓ Gemini Flash (Fast)
✓ GPT-4o Mini (Balanced)

[Locked Models]
🔒 Claude Haiku (Better) - Available in PAYG or Pro
🔒 GPT-4o (Best) - Available in PAYG or Pro
```

**For PAYG Users:**
```
[Select AI Model]
○ Gemini Flash - €0.15
○ GPT-4o Mini - €0.20
● Claude Haiku - €0.30 ✨ Recommended
○ GPT-4o - €0.50

Your Balance: €5.00 → €4.70 after
```

**For Pro Users:**
```
[Select AI Model]
Economy (92/100 remaining this month):
○ Gemini Flash
● GPT-4o Mini

Premium (18/20 remaining this month):
○ Claude Haiku
○ GPT-4o

After limits: Economy unlimited, Premium €0.20 each
```

### 4. Upgrade Triggers

**Trigger 1: Free user attempts 3rd plan**
```
Modal:
"You've used your 2 free plans! 🎉"
[Add Credits] [Go Pro - €9.99/mo] ← Highlighted
```

**Trigger 2: PAYG user balance < model cost**
```
Alert:
"Insufficient credits (€0.10 remaining, need €0.30)"
[Top Up Account]
```

**Trigger 3: Pro user exceeds limits**
```
Alert:
"You've used all 20 premium generations this month.
Continue with economy models or add €2 for 10 more premium plans"
[Use Economy] [Add Premium Credits]
```

---

## Database Schema Requirements

```sql
-- User subscription tracking
ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN credits_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN monthly_economy_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN monthly_premium_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN premium_rollover INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN billing_cycle_start TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN plans_created_count INTEGER DEFAULT 0;

-- Plan creation/edit tracking
ALTER TABLE itineraries ADD COLUMN ai_model_used TEXT;
ALTER TABLE itineraries ADD COLUMN generation_cost DECIMAL(10,4);
ALTER TABLE itineraries ADD COLUMN edit_count INTEGER DEFAULT 0;

-- Cost monitoring
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
  ai_model TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'create' or 'edit'
  estimated_cost DECIMAL(10,4),
  actual_cost DECIMAL(10,4),
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE rate_limits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  generations_last_hour INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Safety & Abuse Prevention

### Rate Limiting
| Tier | Per Hour | Per Day |
|------|----------|---------|
| Free | 2 | 2 (lifetime) |
| PAYG | 10 | 50 |
| Pro | 20 | 200 |

### Cost Alerts
- Alert admin if single user costs >€20/day
- Alert admin if new account (<7 days) generates >50 plans
- Temporary throttle suspicious accounts

### Fair Use Policy
Pro tier "unlimited economy" subject to fair use:
- Clearly not for resale/commercial use
- Not for API scraping
- Not for training competitor models
- We reserve right to throttle abuse

---

## Success Metrics

**Target Conversion Rates:**
- Free → PAYG: 15-20%
- Free → Pro: 5-10%
- PAYG → Pro: 25-30%

**Target Revenue Per User (Monthly):**
- PAYG: €2-5
- Pro: €9.99

**Target Costs:**
- PAYG: 20-30% of revenue
- Pro: 20-40% of revenue

**Breakeven:**
- Estimated 200-300 paying users for sustainable operation

---

## Future Enhancements

### Potential Add-ons
- Team plans (Pro + collaboration)
- API access tiers
- White-label options for agencies
- Annual plans (2 months free)
- Referral credits

### A/B Tests to Consider
- €9.99 vs €12.99 for Pro
- 100+20 limits vs 150+10 limits
- Credit pack sizes and discounts
- Free tier: 2 plans vs 3 plans

---

## Notes & Decisions

**Why limit free to 2 plans?**
- Enough to get value and judge quality
- Creates urgency to upgrade
- Industry standard for AI products

**Why PAYG model?**
- Removes subscription objection
- Captures occasional travelers
- Higher total addressable market
- Common in European markets

**Why limit Pro premium models?**
- Prevents bankruptcy from abuse
- Still feels generous (20 is a lot)
- Encourages thoughtful use of premium models
- Allows unlimited economy as safety valve

**Why these specific models?**
- Gemini Flash: Cheapest, good quality
- GPT-4o Mini: Brand recognition, balanced
- Claude Haiku: Best value premium
- GPT-4o: Flagship option for quality seekers

---

## Contact & Questions
For questions about this policy, contact: [Your email]
For technical implementation, see: `.cursor/rules/pricing-policy.md`

