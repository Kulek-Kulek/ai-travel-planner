# 🚀 AI Travel Planner - Implementation Guide

Complete step-by-step guide to building your AI Travel Planner application.

---

## 📋 Table of Contents

1. [Environment Setup](#phase-1-environment-setup)
2. [Supabase Client Setup](#phase-2-supabase-client-setup)
3. [Database Schema](#phase-3-database-schema)
4. [Authentication](#phase-4-authentication)
5. [Profile Management](#phase-5-profile-management)
6. [AI Integration](#phase-6-ai-integration)
7. [Itinerary Creation](#phase-7-itinerary-creation)
8. [Itinerary CRUD](#phase-8-itinerary-crud)
9. [Testing & Deployment](#phase-9-testing--deployment)

---

## Phase 1: Environment Setup (Day 1 - Morning)

### ✅ Current Status
- [x] Next.js 15.5.4 installed
- [x] React 19 installed
- [x] TypeScript 5 installed
- [x] Tailwind CSS 4 installed
- [x] @supabase/ssr installed
- [x] @supabase/supabase-js installed
- [x] TanStack Query installed
- [x] OpenAI SDK installed
- [x] Zod installed
- [x] React Hook Form installed
- [x] @hookform/resolvers installed

### Step 1.1: Install shadcn/ui Components

```bash
cd travel-planner
npx shadcn@latest add sonner button input label form
```

### Step 1.2: Set Up Supabase Project

**Action Items:**
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - Name: `ai-travel-planner`
   - Database Password: (generate strong password)
   - Region: (choose closest to you)
4. Wait for database provisioning (~2 minutes)
5. Go to Project Settings → API
6. Copy your credentials

### Step 1.3: Create Environment Variables

Create `.env.local` in `travel-planner/`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# OpenRouter AI
OPENROUTER_API_KEY=your-openrouter-key-here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Verify `.env.local` is in your `.gitignore`

---

## Phase 2: Supabase Client Setup (Day 1 - Afternoon)

### Step 2.1: Create Supabase Server Client

✅ **Already created:** `src/lib/supabase/server.ts`

Verify it contains:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return null;
  return user;
}
```

### Step 2.2: Create Supabase Client for Client Components

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Step 2.3: Update Middleware for Auth

✅ **Already created:** `src/middleware.ts`

Verify protected routes configuration is correct.

---

## Phase 3: Database Schema (Day 1 - Late Afternoon)

### Step 3.1: Set Up Supabase CLI (Optional)

```bash
npm install supabase --save-dev
npx supabase login
npx supabase link --project-ref your-project-ref
```

Or use Supabase Dashboard SQL Editor.

### Step 3.2: Create Profiles Table

Go to **Supabase Dashboard → SQL Editor → New Query**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  
  -- Travel preferences
  interests text[] default '{}',
  travel_style text,
  pace text,
  budget_band text,
  dietary_needs text[] default '{}',
  accessibility_needs text[] default '{}',
  
  -- Credit system (FR-010)
  generation_credits integer default 10 not null,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;

-- RLS Policies
create policy "Users can read own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on profiles
  for each row execute procedure public.handle_updated_at();
```

Click **Run** to execute.

### Step 3.3: Create Itineraries Table

```sql
-- Create itineraries table
create table itineraries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Trip details
  destination text not null,
  days integer not null check (days > 0 and days <= 30),
  travelers integer not null check (travelers > 0),
  preferences text[] default '{}',
  notes text,
  
  -- AI-generated plan (JSONB for flexibility)
  ai_plan jsonb not null,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index itineraries_user_id_idx on itineraries(user_id);
create index itineraries_created_at_idx on itineraries(created_at desc);

-- Enable RLS
alter table itineraries enable row level security;

-- RLS Policies
create policy "Users can read own itineraries"
  on itineraries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own itineraries"
  on itineraries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own itineraries"
  on itineraries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own itineraries"
  on itineraries for delete
  to authenticated
  using (auth.uid() = user_id);

-- Updated_at trigger
create trigger handle_itineraries_updated_at
  before update on itineraries
  for each row execute procedure public.handle_updated_at();
```

Click **Run** to execute.

### Step 3.4: Generate TypeScript Types

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

Or from Dashboard: Settings → API Docs → Generate Types (TypeScript)

---

## Phase 4: Authentication (Day 2)

### Step 4.1: Create Auth Server Actions

Create `src/lib/actions/auth-actions.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type ActionResult<T = void> = 
  | { success: true; data?: T }
  | { success: false; error: string };

export async function signUp(
  formData: z.infer<typeof signUpSchema>
): Promise<ActionResult> {
  try {
    const validated = signUpSchema.parse(formData);
    
    const supabase = await createClient();
    
    const { error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          full_name: validated.fullName,
        },
      },
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/', 'layout');
    return { success: true };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signIn(
  formData: z.infer<typeof signInSchema>
): Promise<ActionResult> {
  try {
    const validated = signInSchema.parse(formData);
    
    const supabase = await createClient();
    
    const { error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });
    
    if (error) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    revalidatePath('/', 'layout');
    return { success: true };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/', 'layout');
    return { success: true };
    
  } catch (error) {
    return { success: false, error: 'Failed to sign out' };
  }
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

### Step 4.2: Create Auth Layout

Create directory structure:
```bash
mkdir -p src/app/\(auth\)/sign-in
mkdir -p src/app/\(auth\)/sign-up
```

Create `src/app/(auth)/layout.tsx`:

```typescript
import { getUser } from '@/lib/actions/auth-actions';
import { redirect } from 'next/navigation';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (user) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {children}
      </div>
    </div>
  );
}
```

### Step 4.3: Create Sign In Page

Create `src/app/(auth)/sign-in/page.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { signIn } from '@/lib/actions/auth-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SignInPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await signIn({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      });

      if (result.success) {
        toast.success('Welcome back!');
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-6">Sign In</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            className="mt-2"
          />
        </div>
        
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="mt-2"
          />
        </div>
        
        <Button
          type="submit"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      
      <p className="text-center mt-4 text-sm">
        Don't have an account?{' '}
        <Link href="/sign-up" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
```

### Step 4.4: Create Sign Up Page

Create `src/app/(auth)/sign-up/page.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { signUp } from '@/lib/actions/auth-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SignUpPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        fullName: formData.get('fullName') as string,
      });

      if (result.success) {
        toast.success('Account created! Welcome!');
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-6">Sign Up</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="mt-2"
          />
        </div>
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            className="mt-2"
          />
        </div>
        
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="mt-2"
          />
        </div>
        
        <Button
          type="submit"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>
      
      <p className="text-center mt-4 text-sm">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

### Step 4.5: Create Protected Layout

Create directory:
```bash
mkdir -p src/app/\(protected\)/dashboard
```

Create `src/app/(protected)/layout.tsx`:

```typescript
import { getUser } from '@/lib/actions/auth-actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOut } from '@/lib/actions/auth-actions';
import { Button } from '@/components/ui/button';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-blue-600"
              >
                Dashboard
              </Link>
              <Link 
                href="/create" 
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-blue-600"
              >
                Create Itinerary
              </Link>
              <Link 
                href="/profile" 
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-blue-600"
              >
                Profile
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action={async () => {
                'use server';
                await signOut();
                redirect('/sign-in');
              }}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
```

Create `src/app/(protected)/dashboard/page.tsx`:

```typescript
import { getUser } from '@/lib/actions/auth-actions';

export default async function DashboardPage() {
  const user = await getUser();
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p className="text-lg">Welcome back, {user?.email}!</p>
      <p className="mt-4 text-gray-600">
        Your AI Travel Planner is ready. Start creating amazing itineraries!
      </p>
    </div>
  );
}
```

### Step 4.6: Test Authentication

```bash
npm run dev
```

**Test Checklist:**
- [ ] Visit http://localhost:3000/sign-up
- [ ] Create an account
- [ ] Should redirect to /dashboard
- [ ] Sign out
- [ ] Sign in with credentials
- [ ] Verify user in Supabase Dashboard → Auth → Users
- [ ] Verify profile auto-created in Table Editor → profiles

---

## Phase 5: Profile Management (Day 3)

### Step 5.1: Create Profile Server Actions

Create `src/lib/actions/profile-actions.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  interests: z.array(z.string()).optional(),
  travelStyle: z.string().optional(),
  pace: z.string().optional(),
  budgetBand: z.string().optional(),
  dietaryNeeds: z.array(z.string()).optional(),
  accessibilityNeeds: z.array(z.string()).optional(),
});

type ActionResult<T = void> = 
  | { success: true; data?: T }
  | { success: false; error: string };

export async function getProfile(): Promise<ActionResult<any>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Profile fetch error:', error);
      return { success: false, error: 'Failed to load profile' };
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateProfile(
  input: z.infer<typeof updateProfileSchema>
): Promise<ActionResult> {
  try {
    const validated = updateProfileSchema.parse(input);
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const updateData: any = {};
    if (validated.fullName) updateData.full_name = validated.fullName;
    if (validated.interests) updateData.interests = validated.interests;
    if (validated.travelStyle) updateData.travel_style = validated.travelStyle;
    if (validated.pace) updateData.pace = validated.pace;
    if (validated.budgetBand) updateData.budget_band = validated.budgetBand;
    if (validated.dietaryNeeds) updateData.dietary_needs = validated.dietaryNeeds;
    if (validated.accessibilityNeeds) updateData.accessibility_needs = validated.accessibilityNeeds;
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);
    
    if (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
    
    revalidatePath('/profile');
    return { success: true };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Update profile error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

### Step 5.2: Create Profile Page

Create `src/app/(protected)/profile/page.tsx`:

```typescript
'use client';

import { useEffect, useState, useTransition } from 'react';
import { getProfile, updateProfile } from '@/lib/actions/profile-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const result = await getProfile();
    if (result.success) {
      setProfile(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile({
        fullName: formData.get('fullName') as string,
        travelStyle: formData.get('travelStyle') as string,
        pace: formData.get('pace') as string,
        budgetBand: formData.get('budgetBand') as string,
      });

      if (result.success) {
        toast.success('Profile updated successfully!');
        loadProfile();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (loading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Generation Credits</h2>
          <p className="text-3xl font-bold text-blue-600">
            {profile?.generation_credits || 0}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Credits remaining for AI itinerary generation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={profile?.full_name || ''}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="travelStyle">Travel Style</Label>
            <select
              id="travelStyle"
              name="travelStyle"
              defaultValue={profile?.travel_style || ''}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select style...</option>
              <option value="budget">Budget</option>
              <option value="moderate">Moderate</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          <div>
            <Label htmlFor="pace">Travel Pace</Label>
            <select
              id="pace"
              name="pace"
              defaultValue={profile?.pace || ''}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select pace...</option>
              <option value="relaxed">Relaxed</option>
              <option value="moderate">Moderate</option>
              <option value="fast">Fast-paced</option>
            </select>
          </div>

          <div>
            <Label htmlFor="budgetBand">Daily Budget</Label>
            <select
              id="budgetBand"
              name="budgetBand"
              defaultValue={profile?.budget_band || ''}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select budget...</option>
              <option value="low">$0-50/day</option>
              <option value="medium">$50-150/day</option>
              <option value="high">$150+/day</option>
            </select>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

---

## Phase 6: AI Integration (Day 4)

### Step 6.1: Set Up OpenRouter Client

Create `src/lib/openrouter/client.ts`:

```typescript
import OpenAI from 'openai';

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Travel Planner',
  },
});
```

### Step 6.2: Create AI Generation Server Action

Create `src/lib/actions/ai-actions.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { openrouter } from '@/lib/openrouter/client';
import { z } from 'zod';

// Input schema
const generatePlanSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  days: z.number().int().positive().max(30),
  travelers: z.number().int().positive(),
  notes: z.string().optional(),
});

// AI response schema (FR-006)
const aiResponseSchema = z.object({
  city: z.string(),
  days: z.array(z.object({
    title: z.string(),
    places: z.array(z.object({
      name: z.string(),
      desc: z.string(),
      time: z.string(),
    })),
  })),
});

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export async function generateItinerary(
  input: z.infer<typeof generatePlanSchema>
): Promise<ActionResult<z.infer<typeof aiResponseSchema>>> {
  try {
    // 1. Validate input
    const validated = generatePlanSchema.parse(input);
    
    // 2. Authenticate
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // 3. Check credits (FR-010)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('generation_credits')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return { success: false, error: 'Unable to verify credits' };
    }
    
    if (profile.generation_credits < 1) {
      return { success: false, error: 'Insufficient generation credits' };
    }
    
    // 4. Build prompt
    const prompt = buildPrompt(validated);
    
    // 5. Call AI (server-side only)
    const completion = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error('No AI response received');
      return { success: false, error: 'Failed to generate plan' };
    }
    
    // 6. Parse and validate AI response (FR-006)
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('AI response parse error:', content);
      return { success: false, error: 'Invalid AI response format' };
    }
    
    const validatedResponse = aiResponseSchema.parse(parsedResponse);
    
    // 7. Decrement credits (FR-010)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        generation_credits: profile.generation_credits - 1 
      })
      .eq('id', user.id);
      
    if (updateError) {
      console.error('Credit update error:', updateError);
    }
    
    return { success: true, data: validatedResponse };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return { success: false, error: 'Invalid data provided' };
    }
    
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        return { success: false, error: 'Rate limit exceeded. Try again later.' };
      }
      if (error.message.includes('insufficient_quota')) {
        console.error('OpenRouter quota exceeded');
        return { success: false, error: 'Service temporarily unavailable' };
      }
    }
    
    console.error('AI generation error:', error);
    return { success: false, error: 'Failed to generate travel plan' };
  }
}

function buildPrompt(params: z.infer<typeof generatePlanSchema>): string {
  return `Generate a ${params.days}-day travel itinerary for ${params.destination}.

Number of travelers: ${params.travelers}
${params.notes ? `Additional notes: ${params.notes}` : ''}

Create a day-by-day travel plan including attractions, food suggestions, and estimated visit times. Each day should include:
- title: day name (Day 1, Day 2 ...)
- places: list of objects:
  - name: place name
  - desc: brief description
  - time: estimated visit time

Return clean JSON matching this exact structure:
{
  "city": "${params.destination}",
  "days": [
    {
      "title": "Day 1",
      "places": [
        {
          "name": "Place name",
          "desc": "Brief description",
          "time": "2 hours"
        }
      ]
    }
  ]
}`;
}
```

---

## Phase 7: Itinerary Creation (Day 5-6)

### Step 7.1: Create Itinerary Form

Create `src/app/(protected)/create/page.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { generateItinerary } from '@/lib/actions/ai-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function CreatePage() {
  const [isPending, startTransition] = useTransition();
  const [itinerary, setItinerary] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await generateItinerary({
        destination: formData.get('destination') as string,
        days: parseInt(formData.get('days') as string),
        travelers: parseInt(formData.get('travelers') as string),
        notes: formData.get('notes') as string,
      });

      if (result.success) {
        setItinerary(result.data);
        toast.success('Itinerary generated successfully!');
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create Itinerary</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Trip Details</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                name="destination"
                type="text"
                placeholder="e.g., Paris, France"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="days">Number of Days</Label>
              <Input
                id="days"
                name="days"
                type="number"
                min="1"
                max="30"
                defaultValue="3"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="travelers">Number of Travelers</Label>
              <Input
                id="travelers"
                name="travelers"
                type="number"
                min="1"
                defaultValue="1"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Preferences, interests, special requirements..."
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Generating...' : 'Generate Itinerary'}
            </Button>
          </form>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          
          {!itinerary && (
            <p className="text-gray-500">
              Fill in the form and click Generate to see your itinerary here.
            </p>
          )}

          {itinerary && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">{itinerary.city}</h3>
              
              {itinerary.days.map((day: any, dayIndex: number) => (
                <div key={dayIndex} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="text-lg font-semibold mb-2">{day.title}</h4>
                  
                  <div className="space-y-3">
                    {day.places.map((place: any, placeIndex: number) => (
                      <div key={placeIndex} className="bg-gray-50 p-3 rounded">
                        <p className="font-medium">{place.name}</p>
                        <p className="text-sm text-gray-600">{place.desc}</p>
                        <p className="text-xs text-gray-500 mt-1">⏱️ {place.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 8: Itinerary CRUD (Day 7-8)

### Step 8.1: Create Itinerary Server Actions

Create `src/lib/actions/itinerary-actions.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const saveItinerarySchema = z.object({
  destination: z.string(),
  days: z.number(),
  travelers: z.number(),
  notes: z.string().optional(),
  aiPlan: z.any(),
});

type ActionResult<T = void> = 
  | { success: true; data?: T }
  | { success: false; error: string };

export async function saveItinerary(
  input: z.infer<typeof saveItinerarySchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const validated = saveItinerarySchema.parse(input);
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { data, error } = await supabase
      .from('itineraries')
      .insert({
        user_id: user.id,
        destination: validated.destination,
        days: validated.days,
        travelers: validated.travelers,
        notes: validated.notes || null,
        ai_plan: validated.aiPlan,
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Save error:', error);
      return { success: false, error: 'Failed to save itinerary' };
    }
    
    revalidatePath('/dashboard');
    return { success: true, data: { id: data.id } };
    
  } catch (error) {
    console.error('Save itinerary error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getItineraries(): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Fetch error:', error);
      return { success: false, error: 'Failed to load itineraries' };
    }
    
    return { success: true, data: data || [] };
    
  } catch (error) {
    console.error('Get itineraries error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getItineraryById(id: string): Promise<ActionResult<any>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Fetch error:', error);
      return { success: false, error: 'Itinerary not found' };
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('Get itinerary error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteItinerary(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: 'Failed to delete itinerary' };
    }
    
    revalidatePath('/dashboard');
    return { success: true };
    
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

### Step 8.2: Update Dashboard to Show Itineraries

Update `src/app/(protected)/dashboard/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getItineraries, deleteItinerary } from '@/lib/actions/itinerary-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItineraries();
  }, []);

  const loadItineraries = async () => {
    const result = await getItineraries();
    if (result.success) {
      setItineraries(result.data || []);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this itinerary?')) return;

    const result = await deleteItinerary(id);
    if (result.success) {
      toast.success('Itinerary deleted');
      loadItineraries();
    } else {
      toast.error(result.error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Itineraries</h1>
        <Link href="/create">
          <Button>Create New</Button>
        </Link>
      </div>

      {itineraries.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">No itineraries yet</p>
          <Link href="/create">
            <Button>Create Your First Itinerary</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {itineraries.map((itinerary) => (
            <div key={itinerary.id} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">{itinerary.destination}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {itinerary.days} days • {itinerary.travelers} travelers
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Created {new Date(itinerary.created_at).toLocaleDateString()}
              </p>
              <div className="flex space-x-2">
                <Link href={`/itinerary/${itinerary.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">View</Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(itinerary.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 8.3: Create Itinerary Detail Page

Create `src/app/(protected)/itinerary/[id]/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getItineraryById } from '@/lib/actions/itinerary-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function ItineraryDetailPage() {
  const params = useParams();
  const [itinerary, setItinerary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItinerary();
  }, [params.id]);

  const loadItinerary = async () => {
    const result = await getItineraryById(params.id as string);
    if (result.success) {
      setItinerary(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!itinerary) {
    return <div>Itinerary not found</div>;
  }

  const plan = itinerary.ai_plan;

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost">← Back to Dashboard</Button>
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">{itinerary.destination}</h1>
        <p className="text-gray-600 mb-6">
          {itinerary.days} days • {itinerary.travelers} travelers
        </p>

        {itinerary.notes && (
          <div className="bg-blue-50 p-4 rounded mb-6">
            <p className="text-sm"><strong>Notes:</strong> {itinerary.notes}</p>
          </div>
        )}

        <div className="space-y-6">
          {plan.days?.map((day: any, dayIndex: number) => (
            <div key={dayIndex} className="border-l-4 border-blue-500 pl-4">
              <h2 className="text-xl font-semibold mb-3">{day.title}</h2>
              
              <div className="space-y-3">
                {day.places?.map((place: any, placeIndex: number) => (
                  <div key={placeIndex} className="bg-gray-50 p-4 rounded">
                    <p className="font-medium text-lg">{place.name}</p>
                    <p className="text-gray-600 mt-1">{place.desc}</p>
                    <p className="text-sm text-gray-500 mt-2">⏱️ {place.time}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 9: Testing & Deployment (Day 9-14)

### Step 9.1: Add Save Functionality to Create Page

Update `src/app/(protected)/create/page.tsx` to add save button:

```typescript
// Add this import at the top
import { saveItinerary } from '@/lib/actions/itinerary-actions';
import { useRouter } from 'next/navigation';

// Add this to the component
const router = useRouter();
const [formData, setFormData] = useState<any>(null);

// Update handleSubmit to save formData
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  
  const requestData = {
    destination: data.get('destination') as string,
    days: parseInt(data.get('days') as string),
    travelers: parseInt(data.get('travelers') as string),
    notes: data.get('notes') as string,
  };
  
  setFormData(requestData); // Save for later

  startTransition(async () => {
    const result = await generateItinerary(requestData);
    // ... rest of code
  });
};

// Add save handler
const handleSave = async () => {
  if (!itinerary || !formData) return;
  
  const result = await saveItinerary({
    ...formData,
    aiPlan: itinerary,
  });

  if (result.success) {
    toast.success('Itinerary saved!');
    router.push(`/itinerary/${result.data?.id}`);
  } else {
    toast.error(result.error);
  }
};

// Add save button in the preview section (after itinerary display)
{itinerary && (
  <>
    {/* ... existing preview code ... */}
    <Button onClick={handleSave} className="w-full mt-4">
      Save Itinerary
    </Button>
  </>
)}
```

### Step 9.2: Update Root Layout with Toaster

Update `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "AI Travel Planner",
  description: "Generate personalized travel itineraries with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
```

### Step 9.3: Create E2E Test with Playwright

Create `tests/e2e/auth-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('complete user flow: signup → create → save → view', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  // 1. Sign up
  await page.goto('http://localhost:3000/sign-up');
  await page.fill('input[name="fullName"]', 'Test User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // 2. Create itinerary
  await page.click('text=Create Itinerary');
  await expect(page).toHaveURL(/\/create/);
  
  await page.fill('input[name="destination"]', 'Tokyo, Japan');
  await page.fill('input[name="days"]', '3');
  await page.fill('input[name="travelers"]', '2');
  await page.fill('textarea[name="notes"]', 'Interested in food and culture');
  
  // 3. Generate (this will use real AI - consider mocking in CI)
  await page.click('text=Generate Itinerary');
  
  // Wait for generation (max 30 seconds)
  await page.waitForSelector('text=Tokyo', { timeout: 30000 });
  
  // 4. Save
  await page.click('text=Save Itinerary');
  
  // Should redirect to itinerary detail
  await expect(page).toHaveURL(/\/itinerary\//);
  await expect(page.locator('text=Tokyo, Japan')).toBeVisible();

  // 5. Go back to dashboard and verify
  await page.click('text=Back to Dashboard');
  await expect(page.locator('text=Tokyo, Japan')).toBeVisible();
});
```

Run test:
```bash
npx playwright test
```

### Step 9.4: Set Up Vercel Deployment

**From your terminal:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

**Or use Vercel Dashboard:**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - Framework: Next.js
   - Root Directory: `travel-planner`
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENROUTER_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your vercel URL)
5. Deploy

### Step 9.5: Set Up GitHub Actions CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd travel-planner
          npm ci
          
      - name: Lint
        run: |
          cd travel-planner
          npm run lint
          
      - name: Build
        run: |
          cd travel-planner
          npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          
      - name: Run E2E Tests
        run: |
          cd travel-planner
          npx playwright install
          npx playwright test
```

---

## 📝 Daily Checklist

### Day 1: Setup
- [ ] Install shadcn/ui components
- [ ] Create Supabase project
- [ ] Set up .env.local
- [ ] Create Supabase clients (server & client)
- [ ] Set up middleware

### Day 2: Database & Auth
- [ ] Create profiles table
- [ ] Create itineraries table
- [ ] Generate TypeScript types
- [ ] Create auth Server Actions
- [ ] Build sign-in/sign-up pages
- [ ] Test authentication flow

### Day 3: Profile
- [ ] Create profile Server Actions
- [ ] Build profile page
- [ ] Test profile updates
- [ ] Verify credits display

### Day 4: AI Integration
- [ ] Set up OpenRouter client
- [ ] Create AI generation Server Action
- [ ] Test with OpenRouter API key
- [ ] Verify credit deduction

### Day 5-6: Itinerary Creation
- [ ] Build create page
- [ ] Implement form
- [ ] Add preview section
- [ ] Test generation flow

### Day 7-8: CRUD
- [ ] Create itinerary Server Actions
- [ ] Update dashboard with list
- [ ] Create detail page
- [ ] Add save functionality
- [ ] Test delete

### Day 9-10: Polish
- [ ] Add loading states
- [ ] Improve error messages
- [ ] Test all user flows
- [ ] Add Playwright test

### Day 11-14: Deploy
- [ ] Set up Vercel project
- [ ] Configure environment variables
- [ ] Deploy to production
- [ ] Test production deployment
- [ ] Set up CI/CD

---

## 🆘 Troubleshooting

### Common Issues

**1. Auth not working:**
- Check .env.local has correct Supabase credentials
- Verify middleware is running
- Check Supabase Auth settings (email confirmation, etc.)

**2. RLS errors:**
- Verify policies are created correctly
- Check user is authenticated
- Ensure user_id matches in queries

**3. AI generation fails:**
- Verify OPENROUTER_API_KEY is set
- Check OpenRouter dashboard for credits
- Verify model name is correct

**4. TypeScript errors:**
- Regenerate types: `npx supabase gen types typescript ...`
- Check imports use `@/` alias
- Verify tsconfig.json paths

---

## 🎯 Success Criteria

Before considering MVP complete, verify:

- [ ] User can sign up and sign in
- [ ] Profile auto-creates with 10 credits
- [ ] User can update profile preferences
- [ ] User can generate itinerary (decrements credits)
- [ ] AI response is validated and rendered
- [ ] User can save generated itinerary
- [ ] User can view list of saved itineraries
- [ ] User can view itinerary details
- [ ] User can delete itinerary
- [ ] App is deployed and accessible online
- [ ] At least one E2E test passes

---

## 📚 Reference Links

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Zod Validation](https://zod.dev)
- [React Hook Form](https://react-hook-form.com)
- [TanStack Query](https://tanstack.com/query)
- [Playwright Testing](https://playwright.dev)

---

## 📞 Need Help?

If stuck on any step:
1. Check the error message carefully
2. Verify environment variables are set
3. Check Supabase dashboard for data
4. Review cursor rules in `.cursor/rules/`
5. Test in incognito/private browser window

---

**Last Updated:** Generated for your project  
**Version:** 1.0  
**Estimated Completion:** 2-3 weeks

