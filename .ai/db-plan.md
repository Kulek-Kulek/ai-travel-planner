# Database Schema - AI Travel Planner

## Overview

This document describes the complete PostgreSQL database schema for the AI Travel Planner application, designed to support Next.js 15 with Supabase as the backend. The schema implements Row-Level Security (RLS) for data privacy, supports anonymous and authenticated users, and includes comprehensive tracking for AI usage, payments, and subscriptions.

---

## 1. Supabase Auth Integration

### Architecture Overview

This application uses **Supabase Auth** as the authentication provider. The database schema is architected to seamlessly integrate with Supabase's managed `auth.users` table, which handles all authentication operations (signup, login, password reset, OAuth, etc.).

### Key Integration Points

#### 1.1 User Identity Management

Supabase Auth manages the `auth.users` table (not directly accessible in migrations), which stores:
- User credentials (email, hashed password)
- OAuth provider information
- Email confirmation status
- User metadata (e.g., `raw_user_meta_data`)

Our `profiles` table extends this with application-specific data:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- application-specific fields
);
```

**Key Points:**
- `profiles.id` === `auth.users.id` (one-to-one relationship)
- `ON DELETE CASCADE` ensures profile is removed when Supabase Auth deletes a user
- No password storage in our tables—handled entirely by Supabase Auth

#### 1.2 Automatic Profile Creation

When a user signs up via Supabase Auth, a database trigger automatically creates their profile:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();
```

**Flow:**
1. User submits signup form (email, password, full name)
2. Next.js calls `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`
3. Supabase Auth creates record in `auth.users`
4. Trigger fires → creates record in `profiles` with matching UUID
5. User is logged in and has profile ready

#### 1.3 Row-Level Security (RLS) with Auth Context

All RLS policies use Supabase's built-in `auth.uid()` function, which returns the authenticated user's UUID:

```sql
-- Example: Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```

**Auth Context Flow:**
1. User logs in via Supabase Auth
2. Supabase issues JWT token containing `sub` (user UUID)
3. JWT sent with every request (httpOnly cookie or Authorization header)
4. PostgreSQL RLS evaluates `auth.uid()` from JWT
5. Policies enforce data access based on user identity

#### 1.4 Role-Based Access Control

Supabase provides three built-in PostgreSQL roles:

| Role | Description | Usage |
|------|-------------|-------|
| `anon` | Unauthenticated users | Public itinerary viewing, anonymous creation |
| `authenticated` | Logged-in users | Full CRUD on own data |
| `service_role` | Backend/admin operations | Bypasses RLS, used for system operations |

Our policies target these roles:

```sql
-- Anyone (including anonymous) can view public itineraries
CREATE POLICY "Anyone can view public itineraries"
  ON itineraries FOR SELECT
  USING (is_private = false);

-- Only authenticated users can create their own itineraries
CREATE POLICY "Users can create own itineraries"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert usage logs (from server actions)
CREATE POLICY "service_role_insert_usage_logs"
  ON ai_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
```

#### 1.5 Auth in Application Code

**Client-side (React components):**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

// Sign up
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: { full_name: 'John Doe' }
  }
});

// Sign in
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

**Server-side (Server Actions, API Routes):**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getProfile() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
      },
    }
  );

  // Auth context automatically included in RLS evaluation
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .single(); // RLS ensures only own profile is returned

  return profile;
}
```

#### 1.6 Anonymous User Support

The schema supports anonymous users (not logged in) for core features:

**Itineraries Table:**
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE -- Can be NULL
session_id TEXT -- For anonymous session tracking
```

**Anonymous Policy:**
```sql
CREATE POLICY "Anonymous users can create public itineraries"
  ON itineraries FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND is_private = false);
```

**Flow:**
1. Anonymous user generates itinerary
2. `user_id` = NULL, `session_id` = browser session ID
3. Itinerary is public by default
4. When user signs up, can claim draft via `session_id`

#### 1.7 Security Features

**Implemented by Supabase Auth:**
- ✅ Password hashing (bcrypt)
- ✅ JWT token management
- ✅ Email verification
- ✅ Password reset flow
- ✅ OAuth providers (Google, GitHub, etc.)
- ✅ Multi-factor authentication (MFA)
- ✅ Session management
- ✅ Token refresh

**Implemented in Database:**
- ✅ RLS on all tables
- ✅ Cascade deletes (user deletion removes all data)
- ✅ Service role isolation (sensitive operations)
- ✅ Audit trails (`ai_usage_logs`, `stripe_transactions`)

#### 1.8 Auth-Related Tables

| Table | Relationship | Purpose |
|-------|--------------|---------|
| `auth.users` | **Managed by Supabase** | Core user identity |
| `profiles` | 1:1 with `auth.users` | Application profile data |
| `itineraries` | N:1 with `auth.users` (SET NULL on delete) | User's travel plans (preserved when user deleted) |
| `bucket_list` | N:1 with `auth.users` | User's saved itineraries |
| `deleted_users` | Archived from `auth.users` | Audit trail of deleted accounts (GDPR compliance) |
| `subscription_history` | N:1 with `profiles` | Subscription changes |
| `stripe_transactions` | N:1 with `profiles` | Payment history |
| `ai_usage_logs` | N:1 with `profiles` | AI usage tracking |
| `rate_limits` | 1:1 with `profiles` | Rate limiting data |

#### 1.9 Auth Configuration

**Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Server-only
```

**Supabase Dashboard Settings:**
- Email Auth: Enabled
- Email Confirmations: Enabled (production) / Disabled (development)
- OAuth Providers: Google (optional)
- JWT Expiry: 1 hour
- Refresh Token Rotation: Enabled
- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/**`

#### 1.10 Migration Considerations

**DO:**
- ✅ Reference `auth.users(id)` for user relationships
- ✅ Use `auth.uid()` in RLS policies
- ✅ Create triggers on `auth.users` events (INSERT, UPDATE, DELETE)
- ✅ Use `SECURITY DEFINER` for functions that need elevated access

**DON'T:**
- ❌ Directly modify `auth.users` table (use Supabase Auth API)
- ❌ Store passwords or sensitive auth data in custom tables
- ❌ Bypass RLS without `service_role` (security risk)
- ❌ Reference `auth.users` columns other than `id`, `email` (unstable schema)

---

## 2. Tables

### 2.1 `profiles`

User profile table linked to Supabase Auth. Stores user preferences, subscription information, and usage tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User ID from Supabase Auth |
| `email` | TEXT | | User email address |
| `full_name` | TEXT | | User's display name |
| `role` | TEXT | NOT NULL, DEFAULT 'user', CHECK (role IN ('user', 'admin')) | User role for access control |
| `is_admin` | BOOLEAN | | Additional admin flag (legacy/compatibility) |
| `interests` | TEXT[] | DEFAULT '{}' | General travel interests |
| `travel_style` | TEXT | | Preferred travel style |
| `pace` | TEXT | | Travel pace preference |
| `budget_band` | TEXT | | Budget preference |
| `dietary_needs` | TEXT[] | DEFAULT '{}' | Dietary restrictions/preferences |
| `accessibility_needs` | TEXT[] | DEFAULT '{}' | Accessibility requirements |
| `generation_credits` | INTEGER | NOT NULL, DEFAULT 20 | Legacy credits (deprecated) |
| **Subscription Fields** |
| `subscription_tier` | TEXT | DEFAULT 'free', CHECK (subscription_tier IN ('free', 'payg', 'pro')) | Subscription tier |
| `subscription_status` | TEXT | DEFAULT 'active', CHECK (subscription_status IN ('active', 'canceled', 'expired', 'trial')) | Subscription status |
| `stripe_customer_id` | TEXT | UNIQUE | Stripe customer ID |
| `stripe_subscription_id` | TEXT | | Active Stripe subscription ID |
| `subscription_end_date` | TIMESTAMPTZ | | Subscription expiry date |
| **Usage Tracking** |
| `credits_balance` | DECIMAL(10,2) | DEFAULT 0, CHECK (credits_balance >= 0) | PAYG credits balance in EUR |
| `monthly_economy_used` | INTEGER | DEFAULT 0, CHECK (monthly_economy_used >= 0) | Economy model uses this cycle (Pro) |
| `monthly_premium_used` | INTEGER | DEFAULT 0, CHECK (monthly_premium_used >= 0) | Premium model uses this cycle (Pro) |
| `premium_rollover` | INTEGER | DEFAULT 0, CHECK (premium_rollover >= 0 AND premium_rollover <= 40) | Unused premium plans rolled over |
| `billing_cycle_start` | TIMESTAMPTZ | | Start of current billing cycle |
| `plans_created_count` | INTEGER | DEFAULT 0, CHECK (plans_created_count >= 0) | Total lifetime plans (Free tier limit) |
| `last_generation_at` | TIMESTAMPTZ | | Last plan generation timestamp |
| **Travel Profile Fields** |
| `travel_personality` | TEXT | | AI-generated travel archetype |
| `profile_summary` | TEXT | | 1-paragraph personality summary |
| `accommodation_preferences` | TEXT[] | DEFAULT '{}' | Accommodation preferences |
| `activity_preferences` | TEXT[] | DEFAULT '{}' | Preferred activities |
| `dining_preferences` | TEXT[] | DEFAULT '{}' | Dining style preferences |
| `social_preferences` | TEXT[] | DEFAULT '{}' | Social interaction preferences |
| `quiz_responses` | JSONB | | Raw quiz answers for regeneration |
| `quiz_completed_at` | TIMESTAMPTZ | | Quiz completion timestamp |
| `profile_version` | INTEGER | DEFAULT 1 | Profile generation algorithm version |
| `profile_confidence_score` | DECIMAL(3,2) | CHECK (profile_confidence_score >= 0 AND profile_confidence_score <= 1) | AI confidence score (0-1) |
| **Timestamps** |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `profiles_email_idx` ON (email)
- `profiles_role_idx` ON (role)
- `idx_profiles_subscription_tier` ON (subscription_tier)
- `idx_profiles_subscription_status` ON (subscription_status)
- `idx_profiles_subscription_tier_status` ON (subscription_tier, subscription_status)
- `idx_profiles_billing_cycle` ON (billing_cycle_start) WHERE subscription_tier = 'pro'
- `idx_profiles_stripe_customer_id` ON (stripe_customer_id)
- `idx_profiles_stripe_subscription_id` ON (stripe_subscription_id)
- `idx_profiles_quiz_completed` ON (quiz_completed_at) WHERE quiz_completed_at IS NOT NULL
- `idx_profiles_travel_personality` ON (travel_personality) WHERE travel_personality IS NOT NULL

---

### 2.2 `itineraries`

Stores AI-generated travel itineraries. Supports both anonymous and authenticated users, public/private visibility.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Itinerary ID |
| `user_id` | UUID | REFERENCES auth.users(id) ON DELETE SET NULL | Owner (NULL for anonymous or deleted user) |
| `session_id` | TEXT | | Temporary session ID for anonymous drafts |
| `creator_name` | TEXT | | Creator display name (set to "Anonymous User" when user deleted) |
| **Trip Details** |
| `destination` | TEXT | NOT NULL | Destination name |
| `days` | INTEGER | NOT NULL, CHECK (days > 0 AND days <= 30) | Trip duration in days |
| `travelers` | INTEGER | NOT NULL, CHECK (travelers > 0 AND travelers <= 20) | Number of adult travelers |
| `children` | INTEGER | DEFAULT 0 | Number of children (0-17) |
| `child_ages` | INTEGER[] | DEFAULT '{}' | Array of children ages |
| `start_date` | DATE | | Optional trip start date |
| `end_date` | DATE | | Optional trip end date |
| `has_accessibility_needs` | BOOLEAN | DEFAULT false | Accessibility requirements flag |
| `notes` | TEXT | | User notes/preferences |
| **AI Content** |
| `ai_plan` | JSONB | NOT NULL | AI-generated itinerary (structured JSON) |
| `ai_model_used` | TEXT | | AI model used for generation |
| `generation_cost` | DECIMAL(10,4) | DEFAULT 0 | Cost in EUR for generation |
| `edit_count` | INTEGER | DEFAULT 0, CHECK (edit_count >= 0) | Number of edits/regenerations |
| `tags` | TEXT[] | DEFAULT '{}' | Searchable tags |
| **Metadata** |
| `status` | TEXT | DEFAULT 'published', CHECK (status IN ('draft', 'published', 'active', 'completed', 'archived')) | Itinerary status |
| `is_private` | BOOLEAN | NOT NULL, DEFAULT false | Privacy setting |
| `likes` | INTEGER | NOT NULL, DEFAULT 0 | Number of likes/thumbs-up |
| **Images** |
| `image_url` | TEXT | | Unsplash/Pexels photo URL |
| `image_photographer` | TEXT | | Photographer name |
| `image_photographer_url` | TEXT | | Photographer profile URL |
| **Timestamps** |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `itineraries_user_id_idx` ON (user_id)
- `itineraries_created_at_idx` ON (created_at DESC)
- `itineraries_tags_idx` ON (tags) USING GIN
- `itineraries_is_private_idx` ON (is_private)
- `itineraries_status_idx` ON (status)
- `idx_itineraries_status` ON (status)
- `idx_itineraries_session_id` ON (session_id)
- `itineraries_likes_idx` ON (likes DESC)
- `itineraries_start_date_idx` ON (start_date)
- `itineraries_image_url_idx` ON (image_url) WHERE image_url IS NOT NULL
- `idx_itineraries_ai_model` ON (ai_model_used) WHERE ai_model_used IS NOT NULL

---

### 2.3 `bucket_list`

Stores users' saved/favorited itineraries (like a wishlist).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Bucket list entry ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User who saved |
| `itinerary_id` | UUID | NOT NULL, REFERENCES itineraries(id) ON DELETE CASCADE | Saved itinerary |
| `added_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When added to bucket list |
| | | UNIQUE(user_id, itinerary_id) | Prevent duplicate saves |

**Indexes:**
- `bucket_list_user_id_idx` ON (user_id)
- `bucket_list_itinerary_id_idx` ON (itinerary_id)
- `bucket_list_added_at_idx` ON (added_at DESC)

---

### 2.4 `subscription_history`

Tracks changes to user subscription tiers over time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | History record ID |
| `user_id` | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | User whose subscription changed |
| `tier` | TEXT | NOT NULL | New tier |
| `status` | TEXT | NOT NULL | New status |
| `changed_from` | TEXT | | Previous tier |
| `stripe_subscription_id` | TEXT | | Associated Stripe subscription |
| `change_reason` | TEXT | | Reason for change |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Change timestamp |

---

### 2.5 `deleted_users`

Audit trail of deleted user accounts for compliance, analytics, and support. Admin access only.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | User ID from deleted auth.users record |
| `email` | TEXT | | User's email at time of deletion |
| `full_name` | TEXT | | User's name at time of deletion |
| `subscription_tier` | TEXT | | Subscription tier at deletion |
| `deleted_at` | TIMESTAMPTZ | DEFAULT NOW() | Deletion timestamp |
| `deleted_reason` | TEXT | | Reason for deletion (if provided) |
| `itineraries_count` | INTEGER | | Number of itineraries owned at deletion |
| `plans_created_count` | INTEGER | | Total lifetime plans created |

**Indexes:**
- `deleted_users_deleted_at_idx` ON (deleted_at DESC)
- `deleted_users_subscription_tier_idx` ON (subscription_tier)

**Purpose:** GDPR compliance, analytics, user support. When a user deletes their account, their data is archived here while their itineraries are preserved (anonymized).

---

### 2.6 `stripe_transactions`

Audit log for all Stripe payment transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Transaction ID |
| `user_id` | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | User who made payment |
| `stripe_payment_intent_id` | TEXT | | Stripe payment intent ID |
| `stripe_session_id` | TEXT | | Stripe checkout session ID |
| `amount` | DECIMAL(10,2) | NOT NULL | Amount in EUR |
| `currency` | TEXT | DEFAULT 'eur' | Currency code |
| `transaction_type` | TEXT | NOT NULL, CHECK (transaction_type IN ('subscription', 'credit_purchase', 'refund')) | Type of transaction |
| `status` | TEXT | NOT NULL, CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')) | Transaction status |
| `metadata` | JSONB | | Additional transaction data |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Transaction creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_stripe_transactions_user_id` ON (user_id)
- `idx_stripe_transactions_payment_intent` ON (stripe_payment_intent_id)
- `idx_stripe_transactions_created_at` ON (created_at DESC)

---

### 2.7 `ai_usage_logs`

Tracks all AI model usage for cost monitoring and analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Log entry ID |
| `user_id` | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | User who generated |
| `plan_id` | UUID | REFERENCES itineraries(id) ON DELETE SET NULL | Generated/edited itinerary |
| `ai_model` | TEXT | NOT NULL | Model used (e.g., 'gemini-flash') |
| `operation` | TEXT | NOT NULL, CHECK (operation IN ('create', 'edit', 'regenerate')) | Type of operation |
| `estimated_cost` | DECIMAL(10,4) | NOT NULL | Estimated cost in EUR |
| `actual_cost` | DECIMAL(10,4) | | Actual cost if available |
| `tokens_used` | INTEGER | | Token count |
| `subscription_tier` | TEXT | NOT NULL | User's tier at time of use |
| `credits_deducted` | DECIMAL(10,2) | | Credits deducted (PAYG) |
| `success` | BOOLEAN | DEFAULT true | Whether operation succeeded |
| `error_message` | TEXT | | Error details if failed |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Log timestamp |

**Indexes:**
- `idx_ai_usage_logs_user_id` ON (user_id)
- `idx_ai_usage_logs_created_at` ON (created_at DESC)
- `idx_ai_usage_logs_ai_model` ON (ai_model)
- `idx_ai_usage_logs_subscription_tier` ON (subscription_tier)

---

### 2.8 `rate_limits`

Tracks user generation rate for abuse prevention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PRIMARY KEY, REFERENCES profiles(id) ON DELETE CASCADE | User being rate limited |
| `generations_last_hour` | INTEGER | DEFAULT 0, CHECK (generations_last_hour >= 0) | Count in last hour |
| `generations_today` | INTEGER | DEFAULT 0, CHECK (generations_today >= 0) | Count today |
| `window_start` | TIMESTAMPTZ | DEFAULT NOW() | Hourly window start |
| `day_start` | TIMESTAMPTZ | DEFAULT NOW() | Daily window start |
| `last_generation_at` | TIMESTAMPTZ | | Last generation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

## 3. Relationships

### One-to-Many Relationships

1. **auth.users (1) → profiles (1)**
   - One user has one profile
   - Cascade delete on user deletion

2. **profiles (1) → itineraries (N)**
   - One user can own many itineraries
   - SET NULL when user deleted (itineraries preserved, anonymized)

3. **profiles (1) → bucket_list (N)**
   - One user can save many itineraries
   - Cascade delete when user deleted

4. **itineraries (1) → bucket_list (N)**
   - One itinerary can be saved by many users
   - Cascade delete when itinerary deleted

5. **profiles (1) → subscription_history (N)**
   - Tracks all subscription changes for a user
   - Cascade delete when user deleted

6. **profiles (1) → stripe_transactions (N)**
   - One user can have many transactions
   - Cascade delete when user deleted

7. **profiles (1) → ai_usage_logs (N)**
   - One user can have many AI usage logs
   - Cascade delete when user deleted

8. **itineraries (1) → ai_usage_logs (N)**
   - One itinerary can have multiple logs (creation + edits)
   - Set NULL when itinerary deleted

9. **profiles (1) → rate_limits (1)**
   - One-to-one relationship for rate limiting data
   - Cascade delete when user deleted

10. **auth.users (1) → deleted_users (1)**
   - Archived via trigger before user deletion
   - No FK constraint (historical record)

### Many-to-Many Relationships

1. **profiles (N) ↔ itineraries (N)** via `bucket_list`
   - Users can save multiple itineraries
   - Itineraries can be saved by multiple users
   - Junction table: `bucket_list`

---

## 4. PostgreSQL Policies (Row-Level Security)

### 4.1 `profiles` Policies

```sql
-- Anyone can view basic profile info (needed for public itinerary attribution)
"Anyone can view basic profile info"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true)

-- Users can update their own profile
"Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id)

-- Users can insert their own profile
"Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id)

-- Admins can update all profiles (for user management)
"Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles AS admin_profile
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles AS admin_profile
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role = 'admin'
  ))
```

### 4.2 `itineraries` Policies

```sql
-- Anyone can view public itineraries (including anonymous)
"Anyone can view public itineraries"
  ON itineraries FOR SELECT
  USING (is_private = false)

-- Authenticated users can view their own itineraries
"Users can view own itineraries"
  ON itineraries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id)

-- Anonymous users can create public itineraries
"Anonymous users can create public itineraries"
  ON itineraries FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND is_private = false)

-- Authenticated users can create their own itineraries
"Users can create own itineraries"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id)

-- Users can update their own itineraries and claim drafts
"Users can update own itineraries and claim drafts"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id  -- User owns the itinerary
    OR 
    (user_id IS NULL AND status = 'draft')  -- It's an unclaimed draft
  )
  WITH CHECK (auth.uid() = user_id)  -- After update, must belong to the user

-- Users can delete only their own itineraries
"Users can delete own itineraries"
  ON itineraries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id)

-- Admins can view all itineraries (including private)
"Admins can view all itineraries"
  ON itineraries FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ))

-- Admins can update all itineraries
"Admins can update all itineraries"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ))

-- Admins can delete all itineraries
"Admins can delete all itineraries"
  ON itineraries FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ))
```

### 4.3 `bucket_list` Policies

```sql
-- Users can view their own bucket list
"Users can view their own bucket list"
  ON bucket_list FOR SELECT
  USING (auth.uid() = user_id)

-- Users can add to their own bucket list
"Users can add to their own bucket list"
  ON bucket_list FOR INSERT
  WITH CHECK (auth.uid() = user_id)

-- Users can delete from their own bucket list
"Users can delete from their own bucket list"
  ON bucket_list FOR DELETE
  USING (auth.uid() = user_id)
```

### 4.4 `deleted_users` Policies

```sql
-- Only admins can view deleted users (audit trail)
"Admins can view deleted users"
  ON deleted_users FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ))

-- Only admins can delete old records (data retention cleanup)
"Admins can delete old deleted user records"
  ON deleted_users FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ))

-- Note: INSERT handled by SECURITY DEFINER trigger (bypasses RLS)
-- Service role also bypasses RLS for automated operations
```

### 4.5 `subscription_history` Policies

```sql
-- Users can read their own subscription history
"users_read_own_subscription_history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id)

-- Only service role can manage subscription history
"service_role_manage_subscription_history"
  ON subscription_history FOR ALL
  TO service_role
  USING (true)
```

### 4.6 `stripe_transactions` Policies

```sql
-- Users can read their own transactions
"users_read_own_transactions"
  ON stripe_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id)

-- Only service role can manage transactions
"service_role_manage_transactions"
  ON stripe_transactions FOR ALL
  TO service_role
  USING (true)
```

### 4.7 `ai_usage_logs` Policies

```sql
-- Users can read their own usage logs
"users_read_own_usage_logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id)

-- Only service role can insert usage logs
"service_role_insert_usage_logs"
  ON ai_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true)
```

### 4.8 `rate_limits` Policies

```sql
-- Users can read their own rate limits
"users_read_own_rate_limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id)

-- Service role can manage rate limits
"service_role_manage_rate_limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
```

---

## 5. PostgreSQL Functions

### 5.1 `handle_new_user()`

Automatically creates a profile when a new user signs up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Trigger:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 5.2 `handle_profiles_updated_at()`

Automatically updates the `updated_at` timestamp on profile changes.

```sql
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;
```

**Trigger:**
```sql
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_profiles_updated_at();
```

### 5.3 `reset_monthly_usage()`

Resets monthly usage counters and handles premium plan rollover for Pro users.

```sql
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    monthly_economy_used = 0,
    premium_rollover = LEAST(
      GREATEST(0, 20 - monthly_premium_used) + premium_rollover,
      40
    ),
    monthly_premium_used = 0,
    billing_cycle_start = NOW()
  WHERE 
    subscription_tier = 'pro'
    AND subscription_status = 'active'
    AND (
      billing_cycle_start IS NULL 
      OR billing_cycle_start + INTERVAL '1 month' <= NOW()
    );
END;
$$;
```

### 5.4 `can_generate_plan(p_user_id UUID, p_model TEXT)`

Checks if a user is allowed to generate a plan with the specified AI model based on their subscription tier and usage.

**Returns:** JSONB with structure:
```json
{
  "allowed": true/false,
  "reason": "...",
  "cost": 0.15,
  "needs_upgrade": true/false,
  "needs_topup": true/false,
  "unlimited_mode": true/false
}
```

**Logic:**
- **Free Tier:** Max 2 plans, economy models only
- **PAYG Tier:** Check credit balance sufficient for model cost
- **Pro Tier:** 
  - Economy: 100/month, then unlimited
  - Premium: 20/month + rollover (max 40), fallback to PAYG credits if available

### 5.5 `archive_deleted_user()`

Archives user profile data to `deleted_users` table before account deletion (GDPR compliance, analytics).

```sql
CREATE OR REPLACE FUNCTION archive_deleted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_itinerary_count INTEGER;
BEGIN
  -- Count user's itineraries
  SELECT COUNT(*) INTO v_itinerary_count
  FROM itineraries
  WHERE user_id = OLD.id;
  
  -- Archive profile data to deleted_users
  INSERT INTO deleted_users (
    id, 
    email, 
    full_name, 
    subscription_tier,
    itineraries_count,
    plans_created_count
  )
  SELECT 
    OLD.id,
    OLD.email,
    p.full_name,
    p.subscription_tier,
    v_itinerary_count,
    COALESCE(p.plans_created_count, 0)
  FROM profiles p
  WHERE p.id = OLD.id;
  
  RETURN OLD;
END;
$$;
```

**Trigger:**
```sql
CREATE TRIGGER archive_user_before_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION archive_deleted_user();
```

### 5.6 `anonymize_orphaned_itinerary()`

Sets `creator_name` to "Anonymous User" when an itinerary loses its owner (user deletion).

```sql
CREATE OR REPLACE FUNCTION anonymize_orphaned_itinerary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user_id changed from something to NULL (user deleted)
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.creator_name = 'Anonymous User';
  END IF;
  
  RETURN NEW;
END;
$$;
```

**Trigger:**
```sql
CREATE TRIGGER anonymize_itinerary_on_user_delete
  BEFORE UPDATE OF user_id ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION anonymize_orphaned_itinerary();
```

---

## 6. Design Decisions & Rationale

### 6.1 Anonymous User Support

**Decision:** Allow NULL `user_id` in `itineraries` table with `session_id` for anonymous drafts.

**Rationale:**
- Reduces friction - users can try service without signup (FR-001)
- Enables public itinerary discovery feed
- Drafts can be claimed when user signs up

### 6.2 JSONB for AI Plans

**Decision:** Store complete itinerary in `ai_plan` JSONB column.

**Rationale:**
- Flexible schema - AI output evolves without migrations
- Fast full-document retrieval
- GIN indexing available if needed for JSON queries
- Preserves complete AI context

### 6.3 Subscription Tier Architecture

**Decision:** Three-tier system (free, payg, pro) with separate usage tracking fields.

**Rationale:**
- Clear separation of concerns
- Free: Simple lifetime limit (2 plans)
- PAYG: Credit-based, flexible usage
- Pro: Monthly allowances with rollover for premium models
- Supports complex business logic in `can_generate_plan()` function

### 6.4 Usage Tracking Tables

**Decision:** Separate tables for `ai_usage_logs`, `rate_limits`, and `stripe_transactions`.

**Rationale:**
- **ai_usage_logs:** Analytics, cost monitoring, audit trail
- **rate_limits:** Abuse prevention, separate concern from profiles
- **stripe_transactions:** Financial audit, compliance, debugging payments
- Prevents bloating profiles table
- Better query performance for analytics

### 6.5 Row-Level Security

**Decision:** Enable RLS on all user-data tables with granular policies.

**Rationale:**
- Defense in depth - even if application logic fails, database enforces privacy
- Supabase best practice
- Separates security from application code
- Admin role implemented at database level

### 6.6 Soft Status vs Hard Delete

**Decision:** Status field ('active', 'archived', 'completed') instead of deletion for itineraries.

**Rationale:**
- Preserves user data and history
- Enables "restore" functionality
- Better analytics (completed trip insights)
- Actual deletion still available via DELETE operation

### 6.7 Denormalization for Likes

**Decision:** Store `likes` count directly on `itineraries` table rather than junction table.

**Rationale:**
- Read-heavy operation (sorting by popularity)
- Avoids COUNT(*) on every query
- Simple increment/decrement operations
- Trade-off: Slight complexity in maintaining count, but massive performance gain

### 6.8 Travel Profile in Main Table

**Decision:** Add travel profile fields directly to `profiles` table rather than separate table.

**Rationale:**
- One-to-one relationship
- Always loaded together with profile
- Simplifies queries
- JSONB for `quiz_responses` maintains flexibility

---

## 7. Indexes Summary

### High-Priority Indexes (Query Performance)

1. **Itinerary Discovery Feed:**
   - `itineraries_created_at_idx` - Sort by newest
   - `itineraries_is_private_idx` - Filter public only
   - `itineraries_likes_idx` - Sort by popularity

2. **User's Itineraries:**
   - `itineraries_user_id_idx` - User's plans

3. **Tag Search:**
   - `itineraries_tags_idx` (GIN) - Tag filtering

4. **Subscription Management:**
   - `idx_profiles_subscription_tier_status` - Tier + status combo queries
   - `idx_profiles_billing_cycle` - Monthly reset job

5. **Analytics:**
   - `idx_ai_usage_logs_created_at` - Time-series queries
   - `idx_stripe_transactions_created_at` - Payment reports

### Medium-Priority Indexes

- `bucket_list_user_id_idx` - User's saved itineraries
- `idx_profiles_stripe_customer_id` - Stripe lookups
- `itineraries_start_date_idx` - Upcoming trips
- `idx_ai_usage_logs_ai_model` - Model usage analytics

---

## 8. Migration Strategy

### Current State
All migrations applied in order (001-022). Schema is production-ready.

### Future Migrations
When adding new features:

1. **Create migration file:** `supabase/migrations/023_feature_name.sql`
2. **Use idempotent SQL:**
   - `CREATE TABLE IF NOT EXISTS`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
3. **Update this document** with new schema elements
4. **Test migration** on staging before production
5. **Backwards compatibility:** Never drop columns in use; deprecate and remove later

---

## 9. Security Considerations

### Implemented

✅ Row-Level Security enabled on all tables
✅ Separate policies for authenticated, anonymous, admin roles
✅ Service role required for sensitive operations (payment, usage logs)
✅ Cascade deletes properly configured
✅ CHECK constraints on all enum-like fields
✅ Unique constraints prevent duplicate saves/transactions
✅ SECURITY DEFINER functions with explicit search_path

### Additional Recommendations

1. **API Rate Limiting:** Implement at application/edge level (Vercel/Cloudflare)
2. **CSRF Protection:** Next.js CSRF tokens for mutations
3. **Input Validation:** Zod schemas before database operations
4. **Audit Logging:** Leverage `ai_usage_logs` and `stripe_transactions` for forensics
5. **Backup Strategy:** Supabase automated backups + periodic exports
6. **Monitoring:** Alert on unusual usage patterns (spike in generations, failed payments)

---

## 10. Performance Optimization

### Implemented

✅ Comprehensive indexes on frequently queried columns
✅ GIN indexes for array columns (tags)
✅ Partial indexes (e.g., WHERE is_private = false)
✅ Composite indexes for common query patterns
✅ JSONB for flexible schema without JOIN overhead

### Future Optimizations

1. **Connection Pooling:** Use Supabase pooler (already configured)
2. **Query Caching:** TanStack Query on frontend, pg_bouncer on backend
3. **Materialized Views:** For complex analytics if needed
4. **Partitioning:** If `ai_usage_logs` grows large, partition by month
5. **VACUUM Strategy:** Monitor table bloat, configure autovacuum

---

## 11. Tech Stack Integration

### Supabase PostgreSQL
- **Version:** PostgreSQL 15+
- **Extensions:** uuid-ossp (UUID generation)
- **Features Used:** RLS, JSONB, Arrays, Functions, Triggers

### Next.js 15 Integration
- **Server Actions:** Direct Supabase calls from server components
- **API Routes:** Webhooks only (Stripe)
- **Middleware:** Session refresh, protected routes

### TypeScript
- **Type Generation:** `supabase gen types typescript`
- **Usage:** Import generated types for type-safe queries

---

## 12. Maintenance Checklist

### Daily
- [ ] Monitor `rate_limits` for abuse patterns

### Monthly
- [ ] Run `reset_monthly_usage()` function (automated via cron/edge function)
- [ ] Review `ai_usage_logs` for cost anomalies
- [ ] Check `stripe_transactions` reconciliation

### Quarterly
- [ ] Review indexes usage (`pg_stat_user_indexes`)
- [ ] Analyze slow queries (`pg_stat_statements`)
- [ ] Backup verification

### Annually
- [ ] Review RLS policies for security updates
- [ ] Evaluate denormalization trade-offs
- [ ] Consider archive strategy for old itineraries

---

## Appendix: Example Queries

### Fetch Public Itineraries for Home Feed
```sql
SELECT id, destination, days, travelers, tags, image_url, likes, created_at
FROM itineraries
WHERE is_private = false AND status = 'published'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

### Check User's Monthly Usage (Pro Tier)
```sql
SELECT 
  subscription_tier,
  monthly_economy_used,
  monthly_premium_used,
  premium_rollover,
  20 + premium_rollover - monthly_premium_used AS remaining_premium
FROM profiles
WHERE id = 'user-uuid';
```

### Get User's Bucket List with Itinerary Details
```sql
SELECT 
  bl.added_at,
  i.id, i.destination, i.days, i.travelers, i.image_url
FROM bucket_list bl
JOIN itineraries i ON bl.itinerary_id = i.id
WHERE bl.user_id = 'user-uuid'
ORDER BY bl.added_at DESC;
```

### Analytics: Model Usage by Tier
```sql
SELECT 
  subscription_tier,
  ai_model,
  COUNT(*) AS usage_count,
  SUM(estimated_cost) AS total_cost
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY subscription_tier, ai_model
ORDER BY total_cost DESC;
```

---

## Document Metadata

- **Created:** Based on migrations 001-022
- **Last Updated:** 2025-11-02 (Verified against actual database via `database.types.ts`)
- **Schema Version:** 1.1 (Corrected)
- **Maintainer:** Development Team
- **Review Cycle:** Update with each new migration
- **Verification:** Validated against generated TypeScript types from production Supabase instance

### Changelog

**v1.1 (2025-11-02)**
- ✅ Added missing `deleted_users` table (audit trail for GDPR compliance)
- ✅ Added `creator_name` column to `itineraries` (for anonymized attribution)
- ✅ Added `is_admin` boolean to `profiles` (legacy admin flag)
- ✅ Corrected `itineraries.user_id` FK constraint to `ON DELETE SET NULL` (was CASCADE)
- ✅ Updated `profiles` RLS policies (public read access for basic info)
- ✅ Updated `itineraries` UPDATE policy (includes draft claiming)
- ✅ Added `deleted_users` RLS policies (admin-only access)
- ✅ Added `archive_deleted_user()` trigger function
- ✅ Added `anonymize_orphaned_itinerary()` trigger function
- ✅ Verified all 8 tables match actual database schema

**v1.0 (2025-11-02)**
- Initial documentation based on migrations 001-022

