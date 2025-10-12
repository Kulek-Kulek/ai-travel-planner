# Product Requirements Document (PRD) - AI Travel Planner
## 1. Product Overview
AI Travel Planner is a web application that generates personalized, day-by-day travel itineraries using AI. Users can generate itineraries **without signup** - all generated plans are **public by default** and displayed on the home page for inspiration. Authenticated users gain the ability to **save itineraries** and **mark them as private**, keeping their travel plans personal. The system combines user inputs with optional profile preferences to produce structured JSON itineraries rendered as clear daily plans. The MVP covers optional authentication, public itinerary discovery, AI generation with validation, and CRUD for saved private/public itineraries.

## 2. User Problem
Planning detailed trips is time-consuming and scattered across multiple sources. Results often don't match personal travel style, budget, or interests. Users need a tool that:
- Lets them quickly try AI generation without barriers (no signup required)
- Provides inspiration from community-generated itineraries
- Offers privacy controls for personal travel plans (requires account)
- Turns intent and notes into actionable plans that can be saved and reviewed

## 3. Functional Requirements

### FR-001 Anonymous Usage (NEW - Core Feature)
- **Anyone can generate itineraries without signup**
- Generated plans are **public by default** and automatically displayed on home page
- Anonymous users see generated itinerary but cannot save it
- Prompt to "Sign up to save and mark as private" after generation

### FR-002 Public Itinerary Discovery (NEW)
- **Home page displays all public itineraries** (feed/grid view)
- Show: destination, days, travelers, preview snippet, creation date
- Filter by destination, duration, or search
- Pagination or infinite scroll
- Click to view full itinerary details (public route)

### FR-003 Authentication (Optional)
- Sign up, sign in, sign out with Supabase Auth
- **Not required for generation** - only for saving and privacy
- Secure sessions for authenticated features
- Social auth options (Google, GitHub) for easier signup

### FR-004 User Profile and Preferences
- Available only to authenticated users
- Set preferences: interests, travel style, pace, budget, dietary needs
- Use preferences as defaults during itinerary creation
- Can still generate without profile (uses form inputs only)

### FR-005 Itinerary Creation Input
- Form fields: destination, trip length (days), number of travelers
- Free-form notes for custom requirements
- Multi-language support (AI responds in user's language)
- Required-field validation with inline errors
- **Available to all users (authenticated and anonymous)**

### FR-006 AI Plan Generation
- Build prompt from form inputs + profile (if authenticated) + notes
- AI returns JSON following agreed schema with language detection
- Validate schema and handle errors with user-friendly messages
- **No authentication required for generation**

### FR-007 Itinerary Rendering
- Render day-by-day view (daily sections with items)
- Show: destination, duration, travelers, creation date
- Display "Public" or "Private" badge (if authenticated)
- Beautiful responsive design

### FR-008 Save & Privacy Controls (Authenticated Only)
- After generation, show "Save Itinerary" button
- Anonymous users: prompt to sign up to save
- Authenticated users: save with privacy toggle
  - **Public** (default): appears on home page, anyone can view
  - **Private**: only owner can view, hidden from home page
- Change privacy setting anytime (edit saved itinerary)

### FR-009 Itinerary Management (CRUD - Authenticated)
- **My Itineraries** page: list user's saved itineraries (both public & private)
- View any itinerary (public ones via home page, private via my list)
- Delete saved itinerary with confirmation
- Update privacy setting (public ↔ private toggle)
- Minimal edit: remove items from saved itineraries

### FR-010 Access Control & Privacy
- **Public itineraries**: Anyone can view (no auth required)
- **Private itineraries**: Only owner can view (redirect to sign-in if accessed by others)
- Row Level Security (RLS) enforces privacy at database level
- Input validation and rate limiting on generation endpoint
- Anonymous generation quota: 5 per hour (IP-based)
- Authenticated generation quota: 20 per day per user

### FR-011 Observability and Metrics
- Track: anonymous generations, authenticated generations, save rate
- Monitor: public vs private ratio, sign-up conversion rate
- Profile completion rate for authenticated users
- Schema validation failures and error rates

### FR-012 Tests and CI/CD
- E2E test 1: Anonymous user → generate → see result → prompt to sign up
- E2E test 2: Sign up → generate → save as private → verify not on home page
- E2E test 3: Generate → save as public → verify appears on home page
- CI/CD pipeline runs build and tests; auto-deploy to Vercel

## 4. Product Boundaries

### In Scope (MVP)
- **Anonymous itinerary generation** (no signup required)
- **Public itinerary discovery** (home page feed)
- **Optional authentication** (Supabase Auth with email/password + social)
- **Privacy controls** (public/private toggle for saved itineraries)
- Single destination per itinerary
- AI prompt with multi-language support
- JSON validation and error handling
- CRUD for saved itineraries (authenticated users)
- Rate limiting (anonymous IP-based, authenticated user-based)
- Public hosting on Vercel with basic metrics

### Out of Scope (MVP)
- Comments or likes on public itineraries
- User profiles or social features
- Itinerary sharing via links (all public ones are already accessible)
- PDF export or printing
- Interactive maps, routing, GPS
- Bookings, payments, real-time inventory
- Offline mode
- Advanced budgeting with live prices
- Mobile app

### Technical Constraints
- Dependence on external AI API (token cost, rate limits, latency)
- Supabase PostgreSQL as primary data store; JSONB for itinerary payload
- RLS for privacy enforcement
- IP-based rate limiting for anonymous users (requires edge middleware)
- Web app (responsive, mobile-friendly); no native mobile app in MVP

## 5. User Stories

### US-001 (NEW)
Title: Anonymous Itinerary Generation
Description: As a visitor without an account, I want to generate travel itineraries immediately so I can evaluate the service before committing.
Acceptance Criteria:
- Given I am on the home page, when I click "Create Itinerary", then I can generate without signing up
- Given I generate an itinerary, when it completes, then I see the full plan with a "Save" button
- Given I click "Save" as anonymous user, when prompted, then I see "Sign up to save and keep private" message
- Given my generated itinerary is not saved, when I return to home page, then I see it listed publicly (unless I save it privately)

### US-001a (NEW)
Title: Public Itinerary Discovery
Description: As any visitor, I want to browse public itineraries for inspiration so I can see what trips others have planned.
Acceptance Criteria:
- Given I visit the home page, when it loads, then I see a feed/grid of public itineraries
- Given I see an itinerary card, when I click it, then I see the full day-by-day plan
- Given there are many itineraries, when I scroll, then I can filter by destination or search
- Given an itinerary is marked private, when anyone views home page, then it does not appear

### US-001b
Title: Authentication: Sign Up/Sign In/Sign Out
Description: As a visitor, I want to create an account so I can save itineraries and control privacy.
Acceptance Criteria:
- Given I want to save an itinerary, when I click "Save", then I'm prompted to sign up or sign in
- Given I am a visitor, when I submit valid registration details, then my account is created and I am signed in
- Given I have an account, when I submit valid credentials, then I am signed in and can access my saved itineraries
- Given I am signed in, when I click sign out, then my session ends and I am redirected to the home page

US-002
Title: Profile: Create and Update Preferences
Description: As a signed-in user, I want to set my travel preferences so itineraries match my style.
Acceptance Criteria:
- Given I am signed in, when I open Profile, then I can set interests, travel style, pace, budget, dietary and accessibility preferences
- Given I have saved preferences, when I open the creation form, then relevant fields are pre-filled from my profile
- Given I update my profile, when I save, then changes persist and are used in future generations

US-002 (UPDATED)
Title: Create Itinerary Input (Available to All)
Description: As any visitor (authenticated or not), I want to provide destination, basic parameters, and notes so AI can plan effectively.
Acceptance Criteria:
- Given I am on any page, when I access Create Itinerary, then I can enter destination, days, travelers, and notes
- Given required fields are empty, when I submit, then I see inline validation messages
- Given the form is valid, when I click Generate, then the AI generates an itinerary
- Given I write notes in Polish, when AI responds, then all content is in Polish

US-003 (UPDATED)
Title: AI Generation and Validation
Description: As any user, I want the system to generate a structured, day-by-day plan that matches my inputs.
Acceptance Criteria:
- Given a valid request, when AI returns schema-valid JSON, then the itinerary is rendered day by day
- Given AI returns malformed JSON, when validation fails, then I see an error message
- Given generation succeeds as anonymous user, when displayed, then I see "Sign up to save and keep private" prompt
- Given generation succeeds as authenticated user, when displayed, then I see "Save" button with privacy toggle

US-005
Title: Itinerary Rendering
Description: As a user, I want a clear day-by-day view so I can understand my trip at a glance.
Acceptance Criteria:
- Given I open an itinerary, when it loads, then I see sections per day with items containing name, description, and estimated time
- Given the itinerary has N days, when rendered, then the UI presents N distinct day sections with a summary

US-004 (NEW - Save with Privacy)
Title: Save Itinerary with Privacy Control
Description: As an authenticated user, I want to save a generated plan and control its privacy so I can manage my personal travel plans.
Acceptance Criteria:
- Given I generated an itinerary while authenticated, when I click Save, then I see privacy options (Public/Private)
- Given I save as Public, when anyone visits home page, then my itinerary appears in the feed
- Given I save as Private, when anyone visits home page, then my itinerary is hidden
- Given I save an itinerary, when I go to My Itineraries, then I see it in my list with privacy badge
- Given I save as Private, when I share the URL, then only I can view it (others redirected)

US-007
Title: Delete Itinerary
Description: As a user, I want to delete an itinerary I no longer need.
Acceptance Criteria:
- Given I view a saved itinerary, when I click Delete and confirm, then the itinerary is removed from my account
- Given the itinerary is deleted, when I open My Itineraries, then it no longer appears

US-008
Title: Minimal Edit of Itinerary Items
Description: As a user, I want to remove unwanted items from an itinerary to better fit my plan.
Acceptance Criteria:
- Given I view an itinerary, when I remove an item from a day and save, then the itinerary persists without that item
- Given I removed an item, when I refresh, then the change remains

US-005 (UPDATED - Access Control with Public/Private)
Title: Authorization and Privacy Enforcement
Description: As a user, I want appropriate access controls so public itineraries are discoverable while private ones stay secure.
Acceptance Criteria:
- Given an itinerary is Public, when anyone accesses its URL, then they can view the full plan
- Given an itinerary is Private, when a non-owner accesses its URL, then they're redirected to sign-in
- Given I am not authenticated, when I try to access My Itineraries, then I am redirected to sign-in
- Given I am authenticated, when I view My Itineraries, then I see only my saved itineraries (public + private)
- Given I am on home page, when it loads, then I see ALL public itineraries (from all users)

US-010
Title: Error Handling, Retry, and Fallback
Description: As a user, I want clear feedback when generation fails and a fallback so I can proceed.
Acceptance Criteria:
- Given AI times out or returns an error, when I view the result, then I see an error state with a retry button
- Given repeated failures, when fallback is available, then I can load a demo plan to continue exploring

US-006 (UPDATED - Browse Public + My Itineraries)
Title: Discover and Manage Itineraries
Description: As any visitor, I want to browse public itineraries for inspiration, and as an authenticated user, I want to manage my saved ones.
Acceptance Criteria:
- Given I visit home page, when it loads, then I see a grid/list of all public itineraries
- Given I see an itinerary card, when displayed, then it shows destination, days, travelers, preview, date
- Given I click an itinerary card, when opened, then I see the full day-by-day plan
- Given I am authenticated, when I go to My Itineraries, then I see my saved plans with Public/Private badges
- Given I view my itinerary, when I change privacy setting, then it updates immediately

US-012
Title: Accessibility and Input Validation
Description: As a user, I want accessible forms and validation so I can complete tasks reliably.
Acceptance Criteria:
- Given I use keyboard navigation, when interacting with forms, then all controls are reachable and labeled
- Given I submit invalid input, when errors occur, then I see inline messages explaining what to fix

US-013
Title: Metrics Collection
Description: As a product team, I want to measure generation quality and engagement.
Acceptance Criteria:
- Given a generation completes, when the user saves it, then we increment a save-after-generation metric
- Given a user edits profile, when saved, then we record profile completion status

US-014
Title: Generation Quotas and Rate Limiting
Description: As a user, I want clear limits and messages so I understand when I can generate plans and why requests might be throttled.
Acceptance Criteria:
- Given I exceed my daily generation quota, when I attempt to generate, then I see a clear message indicating the quota limit and the next reset time
- Given I send too many requests in a short time, when throttling is triggered, then I receive a non-fatal error (e.g., 429) and a UI notice to retry later
- Given I am within limits, when I generate, then the request proceeds normally

## 6. Success Metrics
Primary
- Save rate after generation: percentage of generated itineraries that users save (target: 80%+)
- Profile completion rate: percentage of active users with completed preferences (target: 70%+)

Secondary
- Generation success rate (schema-valid on first attempt): target 95%+
- Time to first saved itinerary from sign-up: target < 5 minutes
- Error rate per 100 generations: target < 3

Measurement Approach
- Instrument front-end and server endpoints to capture generation attempts, saves, and validation failures
- Store anonymized event counters in analytics; avoid sensitive content in logs

## Appendix A: Data Model (Supabase)

### Itineraries Table (Updated)
```sql
create table itineraries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null, -- Nullable: allows anonymous generation
  destination text not null,
  days integer not null check (days > 0 and days <= 30),
  travelers integer not null check (travelers > 0 and travelers <= 20),
  notes text,
  ai_plan jsonb not null,
  
  -- Privacy control (NEW)
  is_private boolean default false not null, -- false = public (shown on home), true = private (hidden)
  is_saved boolean default false not null, -- false = temporary/anonymous, true = saved by user
  
  -- Metadata
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index itineraries_user_id_idx on itineraries(user_id) where user_id is not null;
create index itineraries_public_idx on itineraries(created_at desc) where is_private = false and is_saved = true;
create index itineraries_created_at_idx on itineraries(created_at desc);

-- Enable RLS
alter table itineraries enable row level security;

-- PUBLIC ITINERARIES: Anyone can read public, saved itineraries
create policy "Anyone can view public itineraries"
  on itineraries for select
  using (is_private = false and is_saved = true);

-- PRIVATE ITINERARIES: Only owner can read private itineraries
create policy "Users can view own private itineraries"
  on itineraries for select
  to authenticated
  using (auth.uid() = user_id and is_private = true);

-- UNSAVED/TEMPORARY: Anyone can read their temporary (anonymous) generations
-- (Handled via UUID in session, not via RLS)

-- INSERT: Authenticated users can create (for saving), or allow insert without user_id (for anonymous temp)
create policy "Authenticated users can create itineraries"
  on itineraries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Anonymous users can create temporary itineraries"
  on itineraries for insert
  with check (user_id is null and is_saved = false);

-- UPDATE: Users can update their own itineraries (toggle privacy, edit)
create policy "Users can update own itineraries"
  on itineraries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: Users can delete their own itineraries
create policy "Users can delete own itineraries"
  on itineraries for delete
  to authenticated
  using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_itineraries_updated_at
  before update on itineraries
  for each row execute procedure public.handle_updated_at();
```

### Profiles Table (Unchanged)
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  interests text[] default '{}',
  travel_style text,
  pace text,
  budget_band text,
  dietary_needs text[] default '{}',
  accessibility_needs text[] default '{}',
  generation_credits integer default 20 not null, -- Increased for authenticated users
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Appendix B: AI Prompt and JSON Schema
Example prompt

The user provided:
- City: {city}
- Days: {days}
- People: {people}
- Preferences: {preferences}
- Notes: {notes}

Create a day-by-day travel plan including attractions, food suggestions, and estimated visit times. Each day should include:
- title: day name (Day 1, Day 2 ...)
- places: list of objects:
  - name: place name
  - desc: brief description
  - time: estimated visit time
Return clean JSON matching the schema below.

JSON schema
```json
{
  "city": "string",
  "days": [
    {
      "title": "string",
      "places": [
        {
          "name": "string",
          "desc": "string",
          "time": "string"
        }
      ]
    }
  ]
}
```

## Appendix C: Schedule (3 weeks)
- Week 1: Setup Next.js + Supabase + UI, auth, backend CRUD
- Week 2: Hybrid form, AI integration, itinerary rendering
- Week 3: e2e test, CI/CD, UX polish, deploy to Vercel

## Appendix D: Technology Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (fetch/cache)
- Supabase (PostgreSQL + Auth)
- OpenAI API / OpenRouter.ai
- Hosting: Vercel or Cloudflare Pages/Workers (Netlify optional)
- CI/CD: GitHub Actions
- E2E: Playwright