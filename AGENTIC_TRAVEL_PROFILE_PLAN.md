# Agentic Travel Profile & Itinerary System - Implementation Plan

## 🎯 Vision

Transform the AI Travel Planner from functional to exceptional by implementing:
1. **AI-powered travel profile quiz** using agentic reasoning
2. **Profile-aware itinerary generation** with agentic approach
3. **Personalized travel experiences** that truly understand users

---

## 📊 Project Overview

### Success Metrics
- ✅ 80%+ users complete the quiz
- ✅ 90%+ users report profile "feels accurate"
- ✅ 50%+ improvement in itinerary satisfaction scores
- ✅ Increased user retention (return for more itineraries)

### Timeline
- **Phase 1 (Profile System)**: 2-3 weeks
- **Phase 2 (Testing & Refinement)**: 1 week
- **Phase 3 (Agentic Itinerary)**: 2 weeks
- **Total**: 5-6 weeks

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER JOURNEY                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Sign Up → Quiz (2 min) → Profile Generated             │
│     ↓                          ↓                         │
│  Stored in                 Displayed to                  │
│  Database                  User                          │
│                              ↓                           │
│                    Generate Itinerary                    │
│                              ↓                           │
│              Profile Auto-Included in Prompt             │
│                              ↓                           │
│                  Personalized Itinerary                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  TECH ARCHITECTURE                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Quiz Component (Client)                                 │
│         ↓                                                │
│  Server Action → OpenRouter (Agentic Prompt)            │
│         ↓                                                │
│  Validated Profile → Supabase                            │
│         ↓                                                │
│  Itinerary Generation → Includes Profile                 │
│         ↓                                                │
│  Enhanced Results                                        │
└─────────────────────────────────────────────────────────┘
```

---

# PHASE 1: Travel Profile Quiz & AI Generation

**Duration**: 2-3 weeks
**Goal**: Build and deploy agentic profile generation system

## Week 1: Foundation & Database

### Step 1.1: Database Migration (Day 1)

**File**: `supabase/migrations/018_add_travel_profile_fields.sql`

```sql
-- Add new profile fields for AI-generated travel profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS travel_personality TEXT,
ADD COLUMN IF NOT EXISTS profile_summary TEXT,
ADD COLUMN IF NOT EXISTS accommodation_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS activity_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dining_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quiz_responses JSONB,
ADD COLUMN IF NOT EXISTS quiz_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS profile_confidence_score DECIMAL(3,2) CHECK (profile_confidence_score >= 0 AND profile_confidence_score <= 1);

-- Add index for quiz completions
CREATE INDEX IF NOT EXISTS idx_profiles_quiz_completed 
ON profiles(quiz_completed_at) 
WHERE quiz_completed_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.quiz_responses IS 'Raw quiz answers for profile regeneration';
COMMENT ON COLUMN profiles.profile_confidence_score IS 'AI confidence in profile accuracy (0-1)';
```

**Apply migration**:
```bash
# Connect to Supabase and run migration
```

### Step 1.2: TypeScript Types (Day 1)

**File**: `src/types/travel-profile.ts`

```typescript
export type TravelFrequency = 'rarely' | 'occasionally' | 'frequently' | 'constantly';
export type TravelPace = 'very-relaxed' | 'relaxed' | 'moderate' | 'fast-paced' | 'packed';
export type BudgetStyle = 'budget' | 'mid-range' | 'comfort' | 'luxury' | 'ultra-luxury';
export type DiningPreference = 'street-food' | 'local-spots' | 'casual-dining' | 'fine-dining' | 'mix-everything';
export type AccommodationType = 'hostel' | 'budget-hotel' | 'mid-range-hotel' | 'boutique' | 'luxury-hotel' | 'vacation-rental' | 'unique-stays';
export type TravelPersonality = 'cultural-curator' | 'adventure-seeker' | 'luxury-connoisseur' | 'budget-nomad' | 'balanced-explorer' | 'relaxation-focused' | 'foodie-traveler';

export interface QuizResponse {
  // Demographics & Travel Habits
  travelFrequency: TravelFrequency;
  typicalTripLength: '2-3' | '4-7' | '8-14' | '15+';
  
  // Pace & Style
  preferredPace: TravelPace;
  planningStyle: 'highly-planned' | 'loose-structure' | 'spontaneous' | 'mix';
  
  // Budget & Comfort
  budgetStyle: BudgetStyle;
  accommodationType: AccommodationType[];
  willingToSplurgeOn: string[];
  
  // Activities & Interests
  topInterests: string[]; // Max 5
  activityLevel: 'low' | 'moderate' | 'high' | 'very-high';
  culturalImmersion: 'observer' | 'participant' | 'deep-dive';
  
  // Food & Dining
  diningStyle: DiningPreference;
  dietaryRestrictions: string[];
  adventurousEater: boolean;
  
  // Social & Practical
  travelCompanions: 'solo' | 'partner' | 'friends' | 'family' | 'varies';
  morningPerson: boolean;
  
  // Open-ended
  dreamDestination: string;
  travelDeal Breakers: string[];
  bestTravelMemory: string;
}

export interface TravelProfile {
  travel_personality: TravelPersonality;
  personality_description: string; // 2-3 engaging sentences
  
  interests: string[]; // 5-10 specific interests
  travel_style: string;
  pace: string;
  budget_band: string;
  
  dietary_needs: string[];
  accommodation_preferences: string[];
  activity_preferences: string[];
  dining_preferences: string[];
  
  profile_summary: string; // 1 engaging paragraph
  strengths: string[]; // What they're great at as a traveler
  tips: string[]; // Personalized travel tips
  
  confidence_score: number; // 0-1
  archetype_match: string; // Primary archetype
}

export interface ProfileGenerationResult {
  success: boolean;
  data?: TravelProfile;
  error?: string;
}
```

### Step 1.3: Quiz Component - Part 1 (Day 2-3)

**File**: `src/components/travel-profile-quiz.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Plane, 
  MapPin, 
  Utensils, 
  Clock, 
  Sparkles,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import type { QuizResponse } from "@/types/travel-profile";

interface QuizStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: keyof QuizResponse;
  question: string;
  type: 'single-choice' | 'multi-choice' | 'text' | 'slider';
  options?: Array<{ value: string; label: string; emoji?: string }>;
  max?: number; // For multi-choice
  placeholder?: string; // For text inputs
}

export function TravelProfileQuiz({ onComplete }: { 
  onComplete: (responses: QuizResponse) => void 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Partial<QuizResponse>>({});
  
  const steps: QuizStep[] = [
    {
      id: 'welcome',
      title: 'Welcome! ✈️',
      description: 'Let\'s discover your travel personality',
      icon: <Sparkles className="w-8 h-8" />,
      questions: []
    },
    {
      id: 'travel-habits',
      title: 'Your Travel Habits',
      description: 'Tell us about your travel experience',
      icon: <Plane className="w-8 h-8" />,
      questions: [
        {
          id: 'travelFrequency',
          question: 'How often do you travel?',
          type: 'single-choice',
          options: [
            { value: 'rarely', label: 'Once a year or less', emoji: '🏠' },
            { value: 'occasionally', label: '2-3 times a year', emoji: '✈️' },
            { value: 'frequently', label: '4-6 times a year', emoji: '🌍' },
            { value: 'constantly', label: '7+ times a year', emoji: '🚀' }
          ]
        },
        {
          id: 'typicalTripLength',
          question: 'Your typical trip length?',
          type: 'single-choice',
          options: [
            { value: '2-3', label: 'Weekend getaway (2-3 days)', emoji: '🎒' },
            { value: '4-7', label: 'Week-long trip (4-7 days)', emoji: '🧳' },
            { value: '8-14', label: 'Extended stay (8-14 days)', emoji: '📅' },
            { value: '15+', label: 'Long adventure (15+ days)', emoji: '🌏' }
          ]
        }
      ]
    },
    {
      id: 'pace-style',
      title: 'Your Pace & Style',
      description: 'How do you like to travel?',
      icon: <Clock className="w-8 h-8" />,
      questions: [
        {
          id: 'preferredPace',
          question: 'What\'s your ideal travel pace?',
          type: 'single-choice',
          options: [
            { value: 'very-relaxed', label: 'Very relaxed - One activity per day max', emoji: '🧘' },
            { value: 'relaxed', label: 'Relaxed - Plenty of downtime', emoji: '☕' },
            { value: 'moderate', label: 'Moderate - Balanced days', emoji: '⚖️' },
            { value: 'fast-paced', label: 'Fast-paced - See it all!', emoji: '🏃' },
            { value: 'packed', label: 'Packed - Every moment counts', emoji: '⚡' }
          ]
        },
        {
          id: 'planningStyle',
          question: 'How do you plan your trips?',
          type: 'single-choice',
          options: [
            { value: 'highly-planned', label: 'Every detail planned in advance', emoji: '📋' },
            { value: 'loose-structure', label: 'Rough outline, stay flexible', emoji: '🗺️' },
            { value: 'spontaneous', label: 'Wing it as I go', emoji: '🎲' },
            { value: 'mix', label: 'Mix of both approaches', emoji: '🔀' }
          ]
        },
        {
          id: 'morningPerson',
          question: 'Are you a morning person?',
          type: 'single-choice',
          options: [
            { value: 'true', label: 'Yes! Early starts energize me', emoji: '🌅' },
            { value: 'false', label: 'No, I prefer late starts', emoji: '🌙' }
          ]
        }
      ]
    },
    {
      id: 'budget-comfort',
      title: 'Budget & Comfort',
      description: 'How do you prefer to spend?',
      icon: <MapPin className="w-8 h-8" />,
      questions: [
        {
          id: 'budgetStyle',
          question: 'What\'s your typical travel budget style?',
          type: 'single-choice',
          options: [
            { value: 'budget', label: 'Budget-conscious ($-$$)', emoji: '💰' },
            { value: 'mid-range', label: 'Mid-range ($$-$$$)', emoji: '💳' },
            { value: 'comfort', label: 'Comfort ($$$)', emoji: '🏨' },
            { value: 'luxury', label: 'Luxury ($$$$)', emoji: '💎' },
            { value: 'ultra-luxury', label: 'Ultra-luxury ($$$$$)', emoji: '👑' }
          ]
        },
        {
          id: 'accommodationType',
          question: 'Where do you prefer to stay? (Select all that apply)',
          type: 'multi-choice',
          max: 3,
          options: [
            { value: 'hostel', label: 'Hostels', emoji: '🏕️' },
            { value: 'budget-hotel', label: 'Budget hotels', emoji: '🏨' },
            { value: 'mid-range-hotel', label: 'Mid-range hotels', emoji: '🏢' },
            { value: 'boutique', label: 'Boutique hotels', emoji: '🎨' },
            { value: 'luxury-hotel', label: 'Luxury hotels', emoji: '⭐' },
            { value: 'vacation-rental', label: 'Vacation rentals (Airbnb)', emoji: '🏡' },
            { value: 'unique-stays', label: 'Unique stays (treehouses, etc)', emoji: '🌳' }
          ]
        },
        {
          id: 'willingToSplurgeOn',
          question: 'What are you willing to splurge on? (Select up to 3)',
          type: 'multi-choice',
          max: 3,
          options: [
            { value: 'accommodation', label: 'Nice accommodation', emoji: '🛏️' },
            { value: 'food', label: 'Amazing food', emoji: '🍽️' },
            { value: 'experiences', label: 'Unique experiences', emoji: '🎭' },
            { value: 'transportation', label: 'Comfortable transport', emoji: '🚗' },
            { value: 'skip-lines', label: 'Skip-the-line tickets', emoji: '🎫' },
            { value: 'guides', label: 'Private guides', emoji: '👨‍🏫' }
          ]
        }
      ]
    },
    {
      id: 'interests',
      title: 'Your Interests',
      description: 'What excites you when traveling?',
      icon: <Sparkles className="w-8 h-8" />,
      questions: [
        {
          id: 'topInterests',
          question: 'Select your top travel interests (up to 5)',
          type: 'multi-choice',
          max: 5,
          options: [
            { value: 'history-culture', label: 'History & Culture', emoji: '🏛️' },
            { value: 'food-wine', label: 'Food & Wine', emoji: '🍷' },
            { value: 'nature-outdoors', label: 'Nature & Outdoors', emoji: '🏔️' },
            { value: 'adventure-sports', label: 'Adventure & Sports', emoji: '🏄' },
            { value: 'art-museums', label: 'Art & Museums', emoji: '🎨' },
            { value: 'nightlife', label: 'Nightlife & Entertainment', emoji: '🎉' },
            { value: 'photography', label: 'Photography', emoji: '📸' },
            { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
            { value: 'beaches', label: 'Beaches & Relaxation', emoji: '🏖️' },
            { value: 'wellness', label: 'Wellness & Spa', emoji: '🧘' },
            { value: 'local-life', label: 'Local Life & People', emoji: '👥' },
            { value: 'architecture', label: 'Architecture', emoji: '🏗️' }
          ]
        },
        {
          id: 'activityLevel',
          question: 'What\'s your physical activity level?',
          type: 'single-choice',
          options: [
            { value: 'low', label: 'Low - Prefer minimal walking', emoji: '🚶' },
            { value: 'moderate', label: 'Moderate - Average activity', emoji: '🚶‍♂️' },
            { value: 'high', label: 'High - Love being active', emoji: '🏃' },
            { value: 'very-high', label: 'Very high - Adventure athlete', emoji: '🧗' }
          ]
        },
        {
          id: 'culturalImmersion',
          question: 'How do you engage with local culture?',
          type: 'single-choice',
          options: [
            { value: 'observer', label: 'Observer - Watch from outside', emoji: '👀' },
            { value: 'participant', label: 'Participant - Join in activities', emoji: '🙋' },
            { value: 'deep-dive', label: 'Deep dive - Full immersion', emoji: '🌊' }
          ]
        }
      ]
    },
    {
      id: 'food',
      title: 'Food & Dining',
      description: 'How do you like to eat?',
      icon: <Utensils className="w-8 h-8" />,
      questions: [
        {
          id: 'diningStyle',
          question: 'What\'s your dining preference?',
          type: 'single-choice',
          options: [
            { value: 'street-food', label: 'Street food all the way', emoji: '🌮' },
            { value: 'local-spots', label: 'Local restaurants', emoji: '🍜' },
            { value: 'casual-dining', label: 'Casual dining', emoji: '🍔' },
            { value: 'fine-dining', label: 'Fine dining experiences', emoji: '🍽️' },
            { value: 'mix-everything', label: 'Mix of everything', emoji: '🍱' }
          ]
        },
        {
          id: 'adventurousEater',
          question: 'Are you an adventurous eater?',
          type: 'single-choice',
          options: [
            { value: 'true', label: 'Yes! I\'ll try anything once', emoji: '😋' },
            { value: 'false', label: 'I prefer familiar foods', emoji: '🍕' }
          ]
        },
        {
          id: 'dietaryRestrictions',
          question: 'Any dietary restrictions? (Select all)',
          type: 'multi-choice',
          options: [
            { value: 'none', label: 'None', emoji: '✅' },
            { value: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
            { value: 'vegan', label: 'Vegan', emoji: '🌱' },
            { value: 'gluten-free', label: 'Gluten-free', emoji: '🌾' },
            { value: 'halal', label: 'Halal', emoji: '☪️' },
            { value: 'kosher', label: 'Kosher', emoji: '✡️' },
            { value: 'allergies', label: 'Food allergies', emoji: '⚠️' }
          ]
        }
      ]
    },
    {
      id: 'final',
      title: 'Final Touches',
      description: 'Just a few more questions!',
      icon: <Sparkles className="w-8 h-8" />,
      questions: [
        {
          id: 'travelCompanions',
          question: 'Who do you usually travel with?',
          type: 'single-choice',
          options: [
            { value: 'solo', label: 'Solo', emoji: '🧍' },
            { value: 'partner', label: 'Partner/Spouse', emoji: '💑' },
            { value: 'friends', label: 'Friends', emoji: '👯' },
            { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
            { value: 'varies', label: 'It varies', emoji: '🔀' }
          ]
        },
        {
          id: 'dreamDestination',
          question: 'What\'s your dream destination?',
          type: 'text',
          placeholder: 'e.g., Japan, Iceland, Peru...'
        },
        {
          id: 'travelDealBreakers',
          question: 'What ruins a trip for you? (Select up to 3)',
          type: 'multi-choice',
          max: 3,
          options: [
            { value: 'crowds', label: 'Too many crowds', emoji: '👥' },
            { value: 'poor-planning', label: 'Poor planning/chaos', emoji: '😰' },
            { value: 'over-scheduling', label: 'Over-scheduling', emoji: '📅' },
            { value: 'bad-food', label: 'Bad food', emoji: '🤢' },
            { value: 'uncomfortable-stays', label: 'Uncomfortable accommodation', emoji: '🛏️' },
            { value: 'language-barriers', label: 'Language barriers', emoji: '🗣️' },
            { value: 'tourist-traps', label: 'Tourist traps', emoji: '🎭' }
          ]
        },
        {
          id: 'bestTravelMemory',
          question: 'Describe your best travel memory (optional)',
          type: 'text',
          placeholder: 'Share a moment that made you fall in love with travel...'
        }
      ]
    }
  ];

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Quiz complete
      onComplete(responses as QuizResponse);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const isWelcome = currentStepData.id === 'welcome';
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress Bar */}
      {!isWelcome && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <Card className="p-8">
        {/* Step Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            {currentStepData.icon}
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {currentStepData.title}
          </h2>
          <p className="text-slate-600">
            {currentStepData.description}
          </p>
        </div>

        {/* Welcome Screen */}
        {isWelcome && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Why take this quiz?
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Get personalized travel recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Itineraries tailored to YOUR style</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Takes only 2-3 minutes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Can retake anytime to update</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Questions */}
        {!isWelcome && (
          <div className="space-y-8">
            {currentStepData.questions.map((question) => (
              <QuizQuestionComponent
                key={question.id}
                question={question}
                value={responses[question.id]}
                onChange={(value) => 
                  setResponses(prev => ({ ...prev, [question.id]: value }))
                }
              />
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button onClick={handleNext}>
            {isLastStep ? 'Generate My Profile' : 'Next'}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Helper component for rendering questions
function QuizQuestionComponent({ 
  question, 
  value, 
  onChange 
}: {
  question: QuizQuestion;
  value: any;
  onChange: (value: any) => void;
}) {
  // Implementation for different question types
  // This is a placeholder - full implementation needed
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">
        {question.question}
      </h3>
      {/* Render appropriate input based on question.type */}
      {/* Single-choice, multi-choice, text, etc. */}
    </div>
  );
}
```

**Note**: This is Part 1 of the quiz component. Full implementation with all question types will be completed in the actual build.

### Step 1.4: Server Action - Agentic Profile Generation (Day 4-5)

**File**: `src/lib/actions/profile-ai-actions.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { openrouter } from "@/lib/openrouter/client";
import { z } from "zod";
import type { QuizResponse, TravelProfile } from "@/types/travel-profile";

// Validation schemas
const quizResponseSchema = z.object({
  travelFrequency: z.enum(['rarely', 'occasionally', 'frequently', 'constantly']),
  typicalTripLength: z.enum(['2-3', '4-7', '8-14', '15+']),
  preferredPace: z.enum(['very-relaxed', 'relaxed', 'moderate', 'fast-paced', 'packed']),
  planningStyle: z.enum(['highly-planned', 'loose-structure', 'spontaneous', 'mix']),
  budgetStyle: z.enum(['budget', 'mid-range', 'comfort', 'luxury', 'ultra-luxury']),
  accommodationType: z.array(z.string()),
  willingToSplurgeOn: z.array(z.string()),
  topInterests: z.array(z.string()),
  activityLevel: z.enum(['low', 'moderate', 'high', 'very-high']),
  culturalImmersion: z.enum(['observer', 'participant', 'deep-dive']),
  diningStyle: z.enum(['street-food', 'local-spots', 'casual-dining', 'fine-dining', 'mix-everything']),
  dietaryRestrictions: z.array(z.string()),
  adventurousEater: z.boolean(),
  travelCompanions: z.enum(['solo', 'partner', 'friends', 'family', 'varies']),
  morningPerson: z.boolean(),
  dreamDestination: z.string(),
  travelDealBreakers: z.array(z.string()),
  bestTravelMemory: z.string().optional(),
});

const aiProfileSchema = z.object({
  travel_personality: z.string(),
  personality_description: z.string(),
  interests: z.array(z.string()),
  travel_style: z.string(),
  pace: z.string(),
  budget_band: z.string(),
  dietary_needs: z.array(z.string()),
  accommodation_preferences: z.array(z.string()),
  activity_preferences: z.array(z.string()),
  dining_preferences: z.array(z.string()),
  profile_summary: z.string(),
  strengths: z.array(z.string()),
  tips: z.array(z.string()),
  confidence_score: z.number().min(0).max(1),
  archetype_match: z.string(),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * AGENTIC PROFILE GENERATION
 * Uses chain-of-thought reasoning and few-shot learning
 */
export async function generateTravelProfile(
  quizAnswers: QuizResponse
): Promise<ActionResult<TravelProfile>> {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Validate quiz responses
    const validated = quizResponseSchema.parse(quizAnswers);

    // 3. Build agentic prompt
    const prompt = buildAgenticProfilePrompt(validated);

    // 4. Call OpenRouter with agentic reasoning
    const completion = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3-haiku', // Fast and cost-effective for this task
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Slightly creative for engaging descriptions
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Failed to generate profile' };
    }

    // 5. Parse and validate AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('AI response parse error:', content);
      return { success: false, error: 'Invalid AI response format' };
    }

    const aiProfile = aiProfileSchema.parse(parsedResponse);

    // 6. Save to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        interests: aiProfile.interests,
        travel_style: aiProfile.travel_style,
        pace: aiProfile.pace,
        budget_band: aiProfile.budget_band,
        dietary_needs: aiProfile.dietary_needs,
        accommodation_preferences: aiProfile.accommodation_preferences,
        activity_preferences: aiProfile.activity_preferences,
        dining_preferences: aiProfile.dining_preferences,
        travel_personality: aiProfile.archetype_match,
        profile_summary: aiProfile.profile_summary,
        quiz_responses: validated,
        quiz_completed_at: new Date().toISOString(),
        profile_version: 2, // Agentic version
        profile_confidence_score: aiProfile.confidence_score,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile save error:', updateError);
      return { success: false, error: 'Failed to save profile' };
    }

    return { success: true, data: aiProfile };

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return { success: false, error: 'Invalid quiz data' };
    }
    
    console.error('Profile generation error:', error);
    return { success: false, error: 'Failed to generate profile' };
  }
}

/**
 * Build agentic prompt with chain-of-thought reasoning
 */
function buildAgenticProfilePrompt(quiz: QuizResponse): string {
  return `You are TravelPersona AI, a world-class travel psychologist with 20 years of experience analyzing traveler behaviors and preferences.

## YOUR MISSION
Create a deeply personalized travel profile that makes the user feel SEEN and UNDERSTOOD. This profile will power all future travel recommendations.

## YOUR PROCESS (follow these steps in order):

### STEP 1: PATTERN RECOGNITION
Analyze the quiz responses for patterns:
- Travel experience level (${quiz.travelFrequency}, ${quiz.typicalTripLength})
- Energy & pace preferences (${quiz.preferredPace}, ${quiz.activityLevel})
- Budget philosophy (${quiz.budgetStyle}, splurge on: ${quiz.willingToSplurgeOn.join(', ')})
- Social dynamics (${quiz.travelCompanions})
- Cultural approach (${quiz.culturalImmersion})
- Food philosophy (${quiz.diningStyle}, adventurous: ${quiz.adventurousEater})
- Planning style (${quiz.planningStyle})
- Time preferences (morning person: ${quiz.morningPerson})

What patterns emerge? What's the core travel motivation?

### STEP 2: ARCHETYPE IDENTIFICATION
Match this traveler to ONE primary archetype:

1. **The Cultural Curator**: Museums, history, deep dives, slow pace, intellectual curiosity
2. **The Adventure Seeker**: Adrenaline, challenges, outdoor activities, high energy
3. **The Luxury Connoisseur**: Comfort-first, premium experiences, fine dining, high budget
4. **The Budget Nomad**: Value-driven, authentic local experiences, street food, flexibility
5. **The Balanced Explorer**: Mix of everything, moderate pace, diverse interests
6. **The Relaxation Specialist**: Beach, spa, slow pace, minimal planning, unwinding
7. **The Foodie Traveler**: Food-centric, culinary experiences, markets, cooking classes
8. **The Social Connector**: People-focused, group activities, local interactions, nightlife
9. **The Nature Enthusiast**: Outdoors, hiking, wildlife, natural beauty, eco-conscious
10. **The Urban Explorer**: Cities, architecture, neighborhoods, street photography, walking

Which archetype best fits? Consider their:
- Top interests: ${quiz.topInterests.join(', ')}
- Dream destination: ${quiz.dreamDestination}
- Deal breakers: ${quiz.travelDealBreakers.join(', ')}
${quiz.bestTravelMemory ? `- Best memory: "${quiz.bestTravelMemory}"` : ''}

### STEP 3: DEEP PERSONALIZATION
Create SPECIFIC preferences (not generic):

❌ BAD: "enjoys museums"
✅ GOOD: "prefers small, specialized museums (art deco, industrial history) over large crowded institutions like the Louvre"

❌ BAD: "likes food"
✅ GOOD: "seeks out authentic street food markets, especially enjoys breakfast foods and local coffee culture, willing to try unusual ingredients"

Consider:
- Their specific interests, not categories
- HOW they engage (observer vs participant vs deep-dive)
- WHEN they're most energetic (${quiz.morningPerson ? 'early mornings' : 'later starts'})
- WHAT they avoid (${quiz.travelDealBreakers.join(', ')})

### STEP 4: CONSISTENCY VALIDATION
Check for logical consistency:

- Does pace match activity level?
- Does budget align with accommodation preferences?
- Do dining preferences match budget and adventurousness?
- Are deal-breakers considered in all recommendations?
- Does planning style align with pace?

Fix any contradictions before generating output.

### STEP 5: WRITE ENGAGING PERSONALITY
Create a profile summary that:
- Captures their essence in 1 paragraph
- Uses second-person ("You're the traveler who...")
- Feels personal and accurate
- Includes a specific detail that shows understanding
- Makes them excited to travel

### STEP 6: GENERATE ACTIONABLE INSIGHTS
Provide:
- 3-5 specific strengths as a traveler
- 3-5 personalized travel tips
- Confidence score (0-1) based on quiz completeness and clarity

## FEW-SHOT EXAMPLES

### EXAMPLE 1: The Foodie Cultural Explorer

**Quiz Input:**
{
  "travelFrequency": "frequently",
  "typicalTripLength": "8-14",
  "preferredPace": "relaxed",
  "budgetStyle": "mid-range",
  "topInterests": ["food-wine", "history-culture", "photography", "local-life", "art-museums"],
  "diningStyle": "mix-everything",
  "adventurousEater": true,
  "culturalImmersion": "deep-dive",
  "activityLevel": "moderate",
  "morningPerson": true,
  "dreamDestination": "Japan",
  "travelDealBreakers": ["tourist-traps", "over-scheduling"]
}

**Your Analysis:**
- Pattern: Experienced traveler who values depth over breadth, combines food with cultural learning
- Archetype: Foodie Traveler with Cultural Curator tendencies
- Energy: Early riser who prefers quality over quantity
- Philosophy: Authentic experiences, local immersion, strategic planning with flexibility

**Generated Profile:**
{
  "travel_personality": "cultural-foodie",
  "personality_description": "The Culinary Cultural Explorer - You're the traveler who believes the best way to understand a culture is through its food and history, taking time to truly absorb each experience.",
  "interests": [
    "street food tours",
    "cooking classes with locals",
    "food photography", 
    "historic markets and neighborhoods",
    "small specialized museums",
    "local coffee culture",
    "artisan food producers",
    "food history",
    "neighborhood walking tours"
  ],
  "travel_style": "cultural-immersion",
  "pace": "relaxed-moderate",
  "budget_band": "mid-range",
  "dietary_needs": [],
  "accommodation_preferences": [
    "local neighborhoods over tourist areas",
    "vacation rentals with kitchens",
    "boutique hotels with local character",
    "places near morning markets"
  ],
  "activity_preferences": [
    "morning market visits",
    "cooking classes",
    "food tours",
    "small group cultural experiences",
    "self-guided neighborhood exploration",
    "photography walks"
  ],
  "dining_preferences": [
    "authentic local spots",
    "street food",
    "breakfast and brunch culture",
    "market vendors",
    "occasional fine dining for special meals",
    "coffee shop hopping"
  ],
  "profile_summary": "You're the traveler who wakes up early to catch the morning market in full swing, camera in hand, ready to chat with vendors and discover breakfast foods locals actually eat. You prefer spending three hours in a neighborhood food market over racing through ten tourist attractions. Your ideal trip has a loose structure that allows for spontaneous detours when you smell something delicious or stumble upon a local festival. You're not afraid to point at a menu item you can't pronounce, and you believe every meal tells a story about the place you're visiting. Your travel photos are 70% food, 20% street scenes, 10% the actual tourist sights.",
  "strengths": [
    "You excel at finding authentic experiences away from tourist crowds",
    "Your early-riser advantage means you see cities before they get busy",
    "You're open to trying new things while maintaining good judgment",
    "You balance planning with spontaneity perfectly",
    "You engage deeply with culture rather than just checking boxes"
  ],
  "tips": [
    "Book cooking classes in advance - they fill up fast and provide insider local knowledge",
    "Ask your accommodation host for their favorite breakfast spot (not the tourist one)",
    "Leave at least one full day completely unplanned for wandering",
    "Join free walking tours on day 1 to get neighborhood recommendations",
    "Download Google Translate for menu adventures in non-English countries"
  ],
  "confidence_score": 0.92,
  "archetype_match": "The Culinary Cultural Explorer"
}

### EXAMPLE 2: The Efficient Maximizer

**Quiz Input:**
{
  "travelFrequency": "occasionally",
  "typicalTripLength": "4-7",
  "preferredPace": "fast-paced",
  "budgetStyle": "comfort",
  "topInterests": ["architecture", "photography", "art-museums", "shopping"],
  "diningStyle": "casual-dining",
  "adventurousEater": false,
  "culturalImmersion": "observer",
  "activityLevel": "high",
  "morningPerson": true,
  "planningStyle": "highly-planned",
  "dreamDestination": "Paris",
  "travelDealBreakers": ["crowds", "poor-planning", "uncomfortable-stays"],
  "willingToSplurgeOn": ["skip-lines", "accommodation", "transportation"]
}

**Your Analysis:**
- Pattern: Strategic planner who wants maximum experiences with minimum friction
- Archetype: Balanced Explorer with Urban Explorer tendencies
- Energy: High-energy, early starter, values efficiency
- Philosophy: Comfort and convenience enable more experiences

**Generated Profile:**
{
  "travel_personality": "efficient-maximizer",
  "personality_description": "The Strategic Experiencer - You're the planner who treats travel like a well-designed project: maximize experiences while maintaining comfort and avoiding chaos.",
  "interests": [
    "iconic landmarks",
    "architectural tours",
    "major museums",
    "photography hotspots",
    "efficient sightseeing routes",
    "curated shopping districts",
    "skip-the-line experiences",
    "guided tours",
    "rooftop viewpoints"
  ],
  "travel_style": "sightseeing-focused",
  "pace": "fast-efficient",
  "budget_band": "comfort",
  "dietary_needs": [],
  "accommodation_preferences": [
    "central location to minimize travel time",
    "comfortable mid-range to upscale hotels",
    "good reviews for service quality",
    "quiet rooms for good sleep",
    "near metro/transport hubs"
  ],
  "activity_preferences": [
    "early morning starts to avoid crowds",
    "pre-booked skip-the-line tickets",
    "structured guided tours",
    "hop-on-hop-off bus tours",
    "photography walking routes",
    "scheduled museum visits",
    "evening rooftop experiences"
  ],
  "dining_preferences": [
    "reliable casual restaurants",
    "hotel breakfast included",
    "familiar international chains when needed",
    "pre-researched restaurant picks",
    "cafes near major sights for quick meals"
  ],
  "profile_summary": "You're the strategic traveler who has a color-coded spreadsheet and backup plans for your backup plans. Your ideal trip has a well-structured daily schedule that maximizes experiences while maintaining comfort - you'd rather pay for skip-the-line access than waste 90 minutes in a queue. You believe efficient planning creates more freedom, not less. Early starts, comfortable shoes, fully charged phone with offline maps, and pre-booked tickets are your travel essentials. You want to hit all the highlights without feeling rushed or dealing with chaos, and you've learned that spending a bit more on location and convenience pays dividends in experiences gained.",
  "strengths": [
    "Your planning skills mean you rarely miss key experiences",
    "Early-riser advantage helps you beat crowds at popular spots",
    "Willingness to invest in convenience maximizes your limited vacation time",
    "High energy lets you pack in more than average travelers",
    "Strong organizational skills reduce travel stress"
  ],
  "tips": [
    "Book major museum tickets 1-2 weeks before travel (they often sell out)",
    "Stay in central neighborhoods even if pricier - time saved is worth it",
    "Use Google Maps 'Your Timeline' to track daily walking distance",
    "Schedule one 'buffer' afternoon for rest or unplanned discoveries",
    "Join early morning photography tours - best light + smallest crowds"
  ],
  "confidence_score": 0.88,
  "archetype_match": "The Strategic Experiencer"
}

---

## NOW ANALYZE THIS TRAVELER

**Complete Quiz Responses:**
${JSON.stringify(quiz, null, 2)}

**Your Task:**
1. Work through all 6 steps systematically
2. Generate a profile that feels personally crafted for this individual
3. Be specific, not generic
4. Make them excited about their travel personality
5. Ensure all fields are consistent and accurate

Return ONLY valid JSON matching this exact structure (no additional text):
{
  "travel_personality": "archetype-slug",
  "personality_description": "One engaging sentence",
  "interests": ["specific", "interest", "list"],
  "travel_style": "style-name",
  "pace": "pace-level",
  "budget_band": "budget-level",
  "dietary_needs": ["restrictions"],
  "accommodation_preferences": ["specific", "preferences"],
  "activity_preferences": ["specific", "activities"],
  "dining_preferences": ["specific", "dining", "styles"],
  "profile_summary": "One engaging paragraph using second-person",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "tips": ["tip 1", "tip 2", "tip 3"],
  "confidence_score": 0.85,
  "archetype_match": "The Archetype Name"
}`;
}

/**
 * Get user's travel profile
 */
export async function getUserTravelProfile(): Promise<ActionResult<TravelProfile | null>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return { success: false, error: 'Failed to fetch profile' };
    }

    if (!profile.quiz_completed_at) {
      return { success: true, data: null };
    }

    // Transform database format to TravelProfile type
    const travelProfile: TravelProfile = {
      travel_personality: profile.travel_personality || 'balanced-explorer',
      personality_description: '',
      interests: profile.interests || [],
      travel_style: profile.travel_style || '',
      pace: profile.pace || '',
      budget_band: profile.budget_band || '',
      dietary_needs: profile.dietary_needs || [],
      accommodation_preferences: profile.accommodation_preferences || [],
      activity_preferences: profile.activity_preferences || [],
      dining_preferences: profile.dining_preferences || [],
      profile_summary: profile.profile_summary || '',
      strengths: [],
      tips: [],
      confidence_score: profile.profile_confidence_score || 0.8,
      archetype_match: profile.travel_personality || '',
    };

    return { success: true, data: travelProfile };

  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: 'Failed to retrieve profile' };
  }
}
```

## Week 2: UI Integration & Testing

### Step 2.1: Profile Display Page (Day 6-7)

**File**: `src/app/(protected)/profile/travel-personality/page.tsx`

Create a beautiful profile display page showing:
- Archetype badge and description
- Visual representation of preferences
- Editable sections
- "Retake Quiz" option
- How profile affects itineraries

### Step 2.2: Integration Points (Day 8-9)

1. **After signup flow**: Redirect new users to quiz
2. **Profile page**: Add "Travel Personality" tab
3. **Itinerary form**: Show profile badge if available
4. **Navigation**: Add "My Travel Profile" link

### Step 2.3: Testing Phase 1 (Day 10-12)

**Create test cases:**
- Different quiz combinations
- Profile accuracy validation
- Database persistence
- Error handling
- UI responsiveness

**Testing checklist:**
```markdown
## Profile Generation Testing

### Functional Tests
- [ ] Quiz completes successfully
- [ ] Profile saves to database
- [ ] Profile displays correctly
- [ ] Retake quiz updates profile
- [ ] All fields populated correctly

### Quality Tests
- [ ] Profile feels personalized
- [ ] Descriptions are engaging
- [ ] Recommendations are consistent
- [ ] No contradictions in profile
- [ ] Confidence scores are reasonable

### Edge Cases
- [ ] Incomplete quiz responses
- [ ] Unusual preference combinations
- [ ] Very short text responses
- [ ] API failures
- [ ] Database errors
```

---

# PHASE 2: Profile Testing & Refinement

**Duration**: 1 week
**Goal**: Validate profile quality and gather feedback

## Week 3: Beta Testing

### Step 3.1: Internal Testing (Day 13-15)

1. Test with 5-10 different personality types
2. Validate profile accuracy
3. Refine prompt based on results
4. Adjust confidence scoring

### Step 3.2: Prompt Optimization (Day 16-17)

Based on testing, optimize:
- Few-shot examples
- Step-by-step instructions
- Consistency checks
- Output format

### Step 3.3: User Acceptance Testing (Day 18-19)

1. Deploy to beta users
2. Collect feedback on profile accuracy
3. Track completion rates
4. Monitor AI costs
5. Identify edge cases

**Success Criteria:**
- 85%+ completion rate
- 4.5/5 average satisfaction
- <$0.10 cost per profile
- <10 second generation time

---

# PHASE 3: Agentic Itinerary Integration

**Duration**: 2 weeks
**Goal**: Upgrade itinerary generation to use agentic approach + profile

## Week 4: Agentic Itinerary Development

### Step 4.1: Update Itinerary Prompt (Day 20-22)

**File**: `src/lib/actions/ai-actions.ts` (modify existing)

Transform current `buildPrompt` function to agentic approach:

```typescript
function buildAgenticItineraryPrompt(
  params: ItineraryParams,
  userProfile?: TravelProfile
): string {
  return `You are an expert travel planner with 20 years of experience creating personalized itineraries.

## YOUR MISSION
Create a ${params.days}-day itinerary for ${params.destination} that is perfectly tailored to this specific traveler.

${userProfile ? `
## TRAVELER PROFILE (CRITICAL - USE THIS)
${formatProfileForPrompt(userProfile)}

**IMPORTANT**: Every single recommendation MUST align with this profile. This is not generic - it's deeply personalized.
` : '## NO PROFILE AVAILABLE - Create balanced itinerary'}

## YOUR PROCESS (follow these 7 steps):

### STEP 1: DESTINATION ANALYSIS
Consider for ${params.destination}:
- Current season and weather patterns
- Local events or festivals
- Geographic layout (compact city vs sprawling)
- Transportation options
- Cultural norms and rhythms
- Peak vs off-peak times for attractions

### STEP 2: TRAVELER NEEDS ASSESSMENT
Analyze traveler specifics:
- ${params.travelers} adults${params.children ? ` + ${params.children} children` : ''}
- Trip duration: ${params.days} days
${params.notes ? `- Special requests: "${params.notes}"` : ''}
${params.hasAccessibilityNeeds ? '- Accessibility needs: YES (prioritize accessible venues)' : ''}

### STEP 3: DAY-BY-DAY STRATEGY
Plan daily arc:
- Day 1: Arrival day (lighter schedule, orientation)
- Days 2-${params.days - 1}: Peak experiences
- Day ${params.days}: Departure buffer (flexible morning)

Energy distribution:
${userProfile?.pace === 'fast' 
  ? '- Pack days full, energetic traveler can handle it'
  : userProfile?.pace === 'relaxed'
  ? '- Maximum 2-3 major activities per day, built-in rest'
  : '- Balance of 3-4 activities with breaks'
}

### STEP 4: ACTIVITY CURATION
For each activity, verify:
- ✅ Matches traveler's interests${userProfile ? ` (${userProfile.interests.slice(0, 3).join(', ')})` : ''}
- ✅ Appropriate for pace preference
- ✅ Fits budget band${userProfile ? ` (${userProfile.budget_band})` : ''}
- ✅ Considers accessibility needs
- ✅ Realistic timing (includes travel time)
- ✅ Meal breaks every 4-5 hours
- ✅ Weather-appropriate

### STEP 5: PERSONALIZATION LAYER
Transform generic to specific:

❌ Generic: "Visit the Louvre"
✅ Personalized: "Louvre Museum - Enter via Porte des Lions (skip crowds). Focus on ${userProfile?.interests.includes('history-culture') ? 'Egyptian antiquities and ancient history galleries' : 'Italian Renaissance and French paintings'} based on your interests. Budget 2.5 hours - matches your ${userProfile?.pace || 'moderate'} pace."

Apply this level of personalization to EVERY activity.

### STEP 6: LOGICAL FLOW VALIDATION
Check every day:
- Geographic clustering (no zigzagging)
- Realistic travel times
- Energy arc (don't start with hardest activities)
- Meal placement (lunch 12-2pm, dinner 6-9pm)
- Morning person schedule${userProfile?.pace === 'fast' ? ' with early starts' : ' with relaxed mornings'}

### STEP 7: ENHANCEMENT LAYER
For each day, add:
- Pro tips based on local knowledge
- Time-saving hacks
- Weather backup options
- Budget alternatives where relevant
- Photography tips if interested

## FEW-SHOT EXAMPLES

[Include 2-3 examples of excellent itineraries here - showing the quality bar]

---

## NOW CREATE THE ITINERARY

Generate a ${params.days}-day itinerary that feels like it was created by a local friend who truly understands this traveler.

Return ONLY valid JSON with this structure:
{
  "city": "Normalized city name",
  "days": [
    {
      "title": "Day 1: Arrival & Orientation",
      "places": [
        {
          "name": "Activity name",
          "desc": "Personalized description with reasoning",
          "time": "9:00 AM",
          "reasoning": "Why this fits the traveler",
          "pro_tip": "Insider advice"
        }
      ],
      "daily_summary": "Overview of day's theme and energy"
    }
  ],
  "trip_summary": "Overall trip personality and highlights",
  "packing_tips": ["Specific items based on activities"],
  "local_insights": ["Cultural tips and etiquette"]
}`;
}

function formatProfileForPrompt(profile: TravelProfile): string {
  return `
**Travel Style**: ${profile.travel_style}
**Pace Preference**: ${profile.pace}
**Budget**: ${profile.budget_band}
**Top Interests**: ${profile.interests.slice(0, 5).join(', ')}
**Activity Level**: ${profile.activity_preferences.slice(0, 3).join(', ')}
**Dining Style**: ${profile.dining_preferences.slice(0, 3).join(', ')}
**Accommodation Preferences**: ${profile.accommodation_preferences.slice(0, 3).join(', ')}
${profile.dietary_needs.length > 0 ? `**Dietary Needs**: ${profile.dietary_needs.join(', ')}` : ''}

**Traveler Summary**: ${profile.profile_summary}

**Key Strengths**: ${profile.strengths.slice(0, 2).join('; ')}
`;
}
```

### Step 4.2: Fetch Profile in Generation (Day 22)

Modify `generateItinerary` function:

```typescript
export async function generateItinerary(input: ItineraryInput) {
  // ... existing auth checks ...

  // NEW: Fetch user's travel profile if available
  let userProfile: TravelProfile | null = null;
  if (user?.id) {
    const profileResult = await getUserTravelProfile();
    if (profileResult.success && profileResult.data) {
      userProfile = profileResult.data;
    }
  }

  // Build agentic prompt with profile
  const prompt = buildAgenticItineraryPrompt(validated, userProfile);

  // Use better model for agentic reasoning
  const completion = await openrouter.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet', // Upgraded for better reasoning
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 8000,
  });

  // ... rest of function ...
}
```

### Step 4.3: Update Response Schema (Day 23)

Enhance itinerary response to include new fields:

```typescript
const aiResponseSchema = z.object({
  city: z.string(),
  days: z.array(
    z.object({
      title: z.string(),
      places: z.array(
        z.object({
          name: z.string(),
          desc: z.string(),
          time: z.string(),
          reasoning: z.string().optional(), // NEW
          pro_tip: z.string().optional(), // NEW
        }),
      ),
      daily_summary: z.string().optional(), // NEW
    }),
  ),
  trip_summary: z.string().optional(), // NEW
  packing_tips: z.array(z.string()).optional(), // NEW
  local_insights: z.array(z.string()).optional(), // NEW
});
```

### Step 4.4: UI Enhancements (Day 24-25)

Update itinerary display to show:
- "Personalized for [Archetype Name]" badge
- "Reasoning" tooltips on activities
- "Pro Tips" expandable sections
- Trip summary at top
- Packing list section
- Local insights section

## Week 5: Testing & Optimization

### Step 5.1: A/B Testing (Day 26-28)

Compare quality:
- **Group A**: Current simple prompt (control)
- **Group B**: Agentic prompt without profile
- **Group C**: Agentic prompt with profile

**Metrics:**
- User satisfaction ratings
- Time spent reviewing itinerary
- Modification requests
- Sharing rate
- Regeneration rate

### Step 5.2: Cost Analysis (Day 28)

Monitor:
- Token usage per itinerary
- Cost per generation
- Model performance
- API reliability

**Target costs:**
- Profile generation: <$0.10
- Itinerary generation: <$0.50
- Total per user: <$0.60

### Step 5.3: Performance Optimization (Day 29-30)

1. **Prompt Optimization**:
   - Remove redundant instructions
   - Streamline examples
   - Optimize token usage

2. **Caching Strategy**:
   - Cache profile for session
   - Reuse validated data
   - Optimize database queries

3. **Error Handling**:
   - Graceful degradation if profile unavailable
   - Fallback to simple prompt if agentic fails
   - Retry logic for API failures

---

# Post-Launch: Continuous Improvement

## Monitoring & Analytics

Track these metrics:

```typescript
// Analytics events to implement
{
  quiz_started: { user_id, timestamp },
  quiz_completed: { user_id, duration, timestamp },
  profile_generated: { user_id, archetype, confidence, timestamp },
  profile_viewed: { user_id, timestamp },
  quiz_retaken: { user_id, timestamp },
  itinerary_generated_with_profile: { user_id, destination, timestamp },
  itinerary_generated_without_profile: { user_id, destination, timestamp },
  user_satisfaction: { user_id, rating, feedback }
}
```

## Future Enhancements

### Phase 4 (Optional - Future)
1. **Profile Evolution**: Update profile based on itinerary feedback
2. **Multi-Agent System**: Dedicated agents for different trip aspects
3. **Collaborative Filtering**: "Travelers like you also enjoyed..."
4. **Real-time Personalization**: Adjust suggestions based on user behavior
5. **External Data Integration**: Weather, events, pricing APIs

---

# Appendix: Resources & References

## Prompting Resources
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- Chain-of-Thought Prompting Papers

## Testing Tools
- Vitest for unit tests
- Playwright for E2E tests
- OpenRouter playground for prompt testing
- Supabase Studio for database inspection

## Cost Calculators
- OpenRouter pricing: https://openrouter.ai/models
- Token counters: https://platform.openai.com/tokenizer

---

# Success Criteria Summary

✅ **Profile System**:
- 80%+ quiz completion rate
- 90%+ users report accuracy
- <$0.10 per profile
- <10 second generation

✅ **Agentic Itinerary**:
- 50%+ satisfaction improvement
- Personalization visible in output
- <$0.50 per itinerary
- Stable performance

✅ **Overall**:
- Increased user retention
- Higher engagement metrics
- Positive user feedback
- Sustainable cost structure

---

**Ready to start Phase 1?** Let me know and we can begin implementation! 🚀

