"use server";

import { createClient } from "@/lib/supabase/server";
import { openrouter } from "@/lib/openrouter/client";
import { z } from "zod";
import type { QuizResponse, TravelProfile } from "@/types/travel-profile";

// Validation schema for quiz responses
const quizResponseSchema = z.object({
  travelVibe: z.enum(['chill-explorer', 'balanced-adventurer', 'maximum-experience', 'luxury-relaxation']),
  morningType: z.enum(['night-owl', 'flexible', 'early-bird']),
  socialBattery: z.enum(['introvert-recharge', 'ambivert-balance', 'extrovert-energize']),
  travelFrequency: z.enum(['rarely', 'occasionally', 'frequently', 'constantly']),
  planningStyle: z.enum(['wing-it', 'rough-plan', 'detailed-itinerary', 'military-precision']),
  loveThese: z.array(z.string()).min(1).max(5),
  dealBreaker: z.array(z.string()).max(3),
  foodAdventure: z.enum(['play-safe', 'selective-adventurer', 'try-anything']),
  budgetStyle: z.enum(['backpacker', 'smart-saver', 'comfort-seeker', 'luxury-lover', 'sky-is-limit']),
  travelingWith: z.enum(['solo', 'partner', 'friends', 'family', 'varies']),
  dietaryNeeds: z.array(z.string()),
  perfectDay: z.enum(['slow-foodie', 'adventure-packed', 'culture-deep-dive', 'relaxed-explorer', 'luxury-leisure', 'balanced-mix']),
});

// AI response validation schema
const aiProfileSchema = z.object({
  archetype: z.string(),
  personality_description: z.string(),
  interests: z.array(z.string()),
  travel_style: z.string(),
  pace: z.string(),
  budget_band: z.string(),
  dietary_needs: z.array(z.string()),
  accommodation_preferences: z.array(z.string()),
  activity_preferences: z.array(z.string()),
  dining_preferences: z.array(z.string()),
  social_preferences: z.array(z.string()),
  profile_summary: z.string(),
  travel_strengths: z.array(z.string()),
  pro_tips: z.array(z.string()),
  confidence_score: z.number().min(0).max(1),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * AGENTIC PROFILE GENERATION
 * Uses chain-of-thought reasoning and few-shot learning to create personalized travel profiles
 */
export async function generateTravelProfile(
  quizAnswers: QuizResponse
): Promise<ActionResult<TravelProfile>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Validate quiz responses
    const validated = quizResponseSchema.parse(quizAnswers);

    // 3. Build agentic prompt with chain-of-thought reasoning
    const prompt = buildAgenticProfilePrompt(validated);

    // 4. Call OpenRouter with Claude Haiku (fast and cost-effective)
    const completion = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3-haiku',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Slightly creative for engaging descriptions
      max_tokens: 2500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error('No AI response received');
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

    // 6. Create complete profile with metadata
    const travelProfile: TravelProfile = {
      ...aiProfile,
      created_at: new Date().toISOString(),
    };

    // 7. Save to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        // Core fields
        interests: aiProfile.interests,
        travel_style: aiProfile.travel_style,
        pace: aiProfile.pace,
        budget_band: aiProfile.budget_band,
        dietary_needs: aiProfile.dietary_needs,
        
        // New profile fields
        accommodation_preferences: aiProfile.accommodation_preferences,
        activity_preferences: aiProfile.activity_preferences,
        dining_preferences: aiProfile.dining_preferences,
        social_preferences: aiProfile.social_preferences,
        travel_personality: aiProfile.archetype,
        profile_summary: aiProfile.profile_summary,
        
        // Metadata
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

    return { success: true, data: travelProfile };

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
 * Build agentic prompt with chain-of-thought reasoning and few-shot examples
 */
function buildAgenticProfilePrompt(quiz: z.infer<typeof quizResponseSchema>): string {
  return `You are TravelPersona AI, a world-class travel psychologist with 20 years of experience analyzing traveler behaviors and creating personalized travel profiles.

## YOUR MISSION
Create a deeply personalized travel profile that makes the user feel SEEN and UNDERSTOOD. This profile will power all future travel recommendations and itineraries.

## YOUR PROCESS (follow these steps systematically):

### STEP 1: PATTERN RECOGNITION & ANALYSIS
Analyze the quiz responses for patterns and insights:

**Travel Identity:**
- Overall vibe: ${quiz.travelVibe}
- Energy patterns: ${quiz.morningType}
- Social dynamics: ${quiz.socialBattery}
- Planning approach: ${quiz.planningStyle}

**Travel Habits:**
- Frequency: ${quiz.travelFrequency}
- Typical companions: ${quiz.travelingWith}
- Budget philosophy: ${quiz.budgetStyle}

**Activity Preferences:**
- Loves: ${quiz.loveThese.join(', ')}
- Deal-breakers: ${quiz.dealBreaker.join(', ')}
- Perfect day: ${quiz.perfectDay}
- Food adventure level: ${quiz.foodAdventure}

**Special Considerations:**
- Dietary needs: ${quiz.dietaryNeeds.length > 0 ? quiz.dietaryNeeds.join(', ') : 'None'}

**ANALYSIS QUESTIONS:**
- What's the core travel motivation? (relaxation, adventure, culture, luxury, etc.)
- What's the energy level? (high-octane, balanced, laid-back)
- What's the social preference? (solo explorer, social connector, intimate groups)
- What's the comfort vs. adventure balance?

### STEP 2: ARCHETYPE IDENTIFICATION
Based on the patterns, identify the PRIMARY travel archetype:

**Possible Archetypes:**
1. The Culinary Explorer - Food-centric, markets, cooking classes, local cuisine obsessed
2. The Adventure Seeker - Adrenaline, outdoor activities, challenges, high energy
3. The Culture Curator - Museums, history, art, deep cultural immersion
4. The Luxury Connoisseur - Premium experiences, comfort-first, high-end everything
5. The Budget Nomad - Value-driven, authentic local experiences, resourceful
6. The Balanced Explorer - Mix of everything, moderate pace, well-rounded
7. The Relaxation Specialist - Beaches, spas, slow pace, stress-free
8. The Urban Explorer - Cities, architecture, neighborhoods, street life
9. The Nature Enthusiast - Outdoors, hiking, wildlife, natural beauty
10. The Social Connector - People-focused, group activities, nightlife, making friends

**Your Task:** Choose ONE primary archetype and create a unique, creative name for this traveler.

### STEP 3: DEEP PERSONALIZATION
Create SPECIFIC, actionable preferences (not generic):

❌ BAD: "enjoys museums"
✅ GOOD: "prefers small, specialized museums (art deco, industrial history) over massive tourist institutions; loves morning visits before crowds"

❌ BAD: "likes food"  
✅ GOOD: "street food hunter who seeks authentic local breakfast spots; willing to try unusual ingredients; prefers casual dining over formal restaurants"

For this traveler, generate:
- 5-8 specific interests (based on their activities + perfect day)
- 3-5 accommodation preferences (aligned with budget + comfort level)
- 5-8 activity preferences (detailed, not generic)
- 3-5 dining preferences (specific to their food adventure level)
- 2-4 social preferences (based on social battery + companions)

### STEP 4: CONSISTENCY VALIDATION
Check for logical consistency across all fields:

**Validation Checklist:**
- Does pace match activity level and travel vibe?
- Do accommodation preferences align with budget?
- Are dining preferences consistent with food adventure level and budget?
- Do social preferences match social battery and typical companions?
- Are deal-breakers respected in all recommendations?
- Does morning type influence activity timing suggestions?

**Fix any contradictions before proceeding.**

### STEP 5: WRITE ENGAGING PERSONALITY
Create profile summary (1 paragraph) that:
- Uses second-person voice ("You're the traveler who...")
- Captures their essence authentically
- Includes specific details from their quiz responses
- Feels personal and accurate
- Makes them excited about travel
- Length: 4-6 sentences

### STEP 6: GENERATE ACTIONABLE INSIGHTS
Provide:
- 3-4 travel strengths (what they're naturally good at)
- 3-4 personalized pro tips (specific advice based on their style)
- Confidence score (0.8-0.95 based on quiz response clarity and consistency)

## FEW-SHOT EXAMPLES

### EXAMPLE 1: The Street Food Anthropologist

**Quiz Input:**
- travelVibe: balanced-adventurer
- morningType: early-bird
- socialBattery: ambivert-balance
- travelFrequency: frequently
- planningStyle: rough-plan
- loveThese: [street-food, local-markets, photography, hiking, local-culture]
- dealBreaker: [tourist-traps, over-planning, expensive]
- foodAdventure: try-anything
- budgetStyle: smart-saver
- travelingWith: solo
- dietaryNeeds: []
- perfectDay: slow-foodie

**AI Generated Profile:**
{
  "archetype": "The Street Food Anthropologist",
  "personality_description": "You're the early-rising solo traveler who believes the best way to understand a culture is through its breakfast foods and morning markets.",
  "interests": [
    "dawn market visits",
    "street food tours",
    "food photography",
    "cooking with locals",
    "neighborhood exploration",
    "breakfast culture",
    "casual hiking between meals",
    "authentic local experiences"
  ],
  "travel_style": "cultural-immersion",
  "pace": "relaxed-moderate",
  "budget_band": "mid-range",
  "dietary_needs": [],
  "accommodation_preferences": [
    "local neighborhoods over tourist zones",
    "vacation rentals with kitchens",
    "places near morning markets",
    "mid-range with character"
  ],
  "activity_preferences": [
    "early morning market visits",
    "street food vendor conversations",
    "food photography walks",
    "casual nature hikes",
    "cooking demonstrations",
    "neighborhood wandering",
    "local breakfast spots",
    "cultural immersion activities"
  ],
  "dining_preferences": [
    "street food stalls",
    "local breakfast institutions",
    "market vendors",
    "casual local restaurants",
    "food carts and hawker centers"
  ],
  "social_preferences": [
    "solo exploration with occasional social interaction",
    "chatting with food vendors",
    "small group food tours",
    "authentic local connections"
  ],
  "profile_summary": "You're the traveler who sets two alarms to catch the morning market at its peak, camera ready, empty stomach prepared for adventure. You've learned that the best conversations happen over street food at sunrise, when locals are grabbing breakfast before work. You don't need luxury hotels or Michelin stars - give you a homestay near a vibrant market, comfortable shoes for walking, and a day with no strict schedule, and you're in heaven. Your Instagram is 80% food, 15% sunrise shots, 5% actual tourist attractions, and that's exactly how you like it.",
  "travel_strengths": [
    "Natural ability to find authentic experiences away from tourist crowds",
    "Early-riser advantage means you experience places before they get busy",
    "Comfortable traveling solo which gives you flexibility and spontaneity",
    "Open to culinary adventures while maintaining good judgment"
  ],
  "pro_tips": [
    "Learn to say 'what do locals eat for breakfast?' in the local language",
    "Book accommodation based on proximity to morning markets, not attractions",
    "Bring a small notebook to collect vendor recommendations",
    "Leave at least 2 mornings completely unplanned for spontaneous market discoveries"
  ],
  "confidence_score": 0.92
}

### EXAMPLE 2: The Efficient Maximizer

**Quiz Input:**
- travelVibe: maximum-experience
- morningType: early-bird
- socialBattery: extrovert-energize
- travelFrequency: occasionally
- planningStyle: detailed-itinerary
- loveThese: [museums, historical-sites, architecture, photography, nightlife]
- dealBreaker: [crowds, no-plan, boring]
- foodAdventure: selective-adventurer
- budgetStyle: comfort-seeker
- travelingWith: friends
- dietaryNeeds: []
- perfectDay: culture-deep-dive

**AI Generated Profile:**
{
  "archetype": "The Strategic Experience Collector",
  "personality_description": "You're the hyper-organized planner who treats travel like a well-designed project: maximize cultural experiences while maintaining comfort and avoiding chaos.",
  "interests": [
    "major museums and galleries",
    "historic landmarks",
    "architectural tours",
    "efficient sightseeing routes",
    "photography hotspots",
    "evening social activities",
    "skip-the-line experiences",
    "curated cultural events"
  ],
  "travel_style": "cultural-sightseeing",
  "pace": "fast-efficient",
  "budget_band": "comfort",
  "dietary_needs": [],
  "accommodation_preferences": [
    "central location to minimize transit",
    "comfortable mid-to-upscale hotels",
    "good reviews for service",
    "near public transportation"
  ],
  "activity_preferences": [
    "early museum visits before crowds",
    "pre-booked skip-the-line tickets",
    "structured walking tours",
    "architectural highlights",
    "rooftop viewpoints for photos",
    "evening cultural shows",
    "social group activities",
    "efficient day planning"
  ],
  "dining_preferences": [
    "reliable mid-range restaurants",
    "hotel breakfast for convenience",
    "pre-researched dinner spots",
    "occasional upscale dining",
    "cafes near major sights"
  ],
  "social_preferences": [
    "group activities with friends",
    "social evening experiences",
    "guided group tours",
    "meeting fellow travelers"
  ],
  "profile_summary": "You're the friend with the color-coded spreadsheet and backup plans for your backup plans. When your group says 'let's just wing it,' you visibly cringe. Your ideal trip has structure, efficiency, and zero wasted time - you'd rather pay for skip-the-line access than stand in a queue for 90 minutes. You travel occasionally, so when you do, you want to hit ALL the highlights without feeling rushed or dealing with poor planning chaos. Early starts don't bother you (more time for experiences!), and your friends trust your itineraries because you somehow manage to see everything while still having fun.",
  "travel_strengths": [
    "Exceptional planning skills ensure you rarely miss key experiences",
    "High energy level lets you pack more into each day than average travelers",
    "Early-bird advantage helps you beat crowds at popular attractions",
    "Comfortable investing in convenience which maximizes your limited vacation time"
  ],
  "pro_tips": [
    "Book major museum tickets 1-2 weeks before travel (they often sell out)",
    "Stay in central neighborhoods even if pricier - time saved is worth every dollar",
    "Build in one 'buffer' afternoon for rest or spontaneous discoveries",
    "Use hotel concierge for last-minute restaurant reservations"
  ],
  "confidence_score": 0.89
}

---

## NOW ANALYZE THIS TRAVELER

**Quiz Responses:**
${JSON.stringify(quiz, null, 2)}

**Your Task:**
1. Work through all 6 steps systematically
2. Think deeply about what makes this traveler unique
3. Generate a profile that feels personally crafted (not template-based)
4. Be specific in every field - no generic descriptions
5. Make them excited about their travel personality
6. Ensure perfect consistency across all fields

**CRITICAL:** Return ONLY valid JSON matching this exact structure (no additional text):

{
  "archetype": "The [Creative Unique Name]",
  "personality_description": "One engaging sentence capturing their essence",
  "interests": ["specific", "interest", "list", "5-8 items"],
  "travel_style": "descriptive-style-name",
  "pace": "pace-level",
  "budget_band": "budget-tier",
  "dietary_needs": ["list or empty"],
  "accommodation_preferences": ["specific", "preferences", "3-5 items"],
  "activity_preferences": ["specific", "detailed", "activities", "5-8 items"],
  "dining_preferences": ["specific", "dining", "styles", "3-5 items"],
  "social_preferences": ["social", "interaction", "styles", "2-4 items"],
  "profile_summary": "Engaging 4-6 sentence paragraph in second-person that makes them feel understood",
  "travel_strengths": ["strength 1", "strength 2", "strength 3"],
  "pro_tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "confidence_score": 0.88
}`;
}

/**
 * Get user's travel profile from database
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

    // Check if profile quiz has been completed
    if (!profile.quiz_completed_at) {
      return { success: true, data: null };
    }

    // Transform database format to TravelProfile type
    const travelProfile: TravelProfile = {
      archetype: profile.travel_personality || '',
      personality_description: profile.travel_personality || '',
      interests: profile.interests || [],
      travel_style: profile.travel_style || '',
      pace: profile.pace || '',
      budget_band: profile.budget_band || '',
      dietary_needs: profile.dietary_needs || [],
      accommodation_preferences: profile.accommodation_preferences || [],
      activity_preferences: profile.activity_preferences || [],
      dining_preferences: profile.dining_preferences || [],
      social_preferences: profile.social_preferences || [],
      profile_summary: profile.profile_summary || '',
      travel_strengths: [],
      pro_tips: [],
      confidence_score: profile.profile_confidence_score || 0.85,
      created_at: profile.quiz_completed_at || new Date().toISOString(),
    };

    return { success: true, data: travelProfile };

  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: 'Failed to retrieve profile' };
  }
}

