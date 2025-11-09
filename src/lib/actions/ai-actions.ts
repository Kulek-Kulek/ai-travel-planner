"use server";

import { openrouter } from "@/lib/openrouter/client";
import { createClient } from "@/lib/supabase/server";
import { fetchDestinationPhoto } from "@/lib/pexels/client";
import {
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_MODEL_VALUES,
  OPENROUTER_BUDGET_FIRST_ORDER,
  type OpenRouterModel,
} from "@/lib/openrouter/models";
import { 
  canGeneratePlan, 
  getUserSubscription,
  checkRateLimit
} from "@/lib/actions/subscription-actions";
import { getUserTravelProfile } from "@/lib/actions/profile-ai-actions";
import { type ModelKey, AI_MODELS } from "@/lib/config/pricing-models";
import { type TravelProfile } from "@/types/travel-profile";
import { verifyTurnstileToken } from "@/lib/cloudflare/verify-turnstile";
import { 
  logSecurityIncident,
  getSecuritySystemInstructions 
} from "@/lib/security/prompt-injection-defense";
import { extractJSON } from "@/lib/utils/json-extraction";
import { z } from "zod";

// Input schema with enhanced validation (HIGH-3)
const generateItinerarySchema = z
  .object({
    destination: z
      .string()
      .min(1, "Destination is required")
      .max(100, "Destination must be less than 100 characters")
      .regex(
        /^[a-zA-Z0-9\s,.\-()''áéíóúñüÁÉÍÓÚÑÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ]+$/,
        "Destination contains invalid characters"
      )
      .trim(),
    days: z.number().int().positive().min(1).max(30),
    travelers: z.number().int().positive().min(1).max(20),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    children: z.number().int().min(0).max(10).optional(),
    childAges: z
      .array(z.number().int().min(0).max(17))
      .max(10)
      .optional(),
    hasAccessibilityNeeds: z.boolean().optional(),
    notes: z
      .string()
      .max(2000, "Notes must be less than 2000 characters")
      .optional()
      .transform(val => val?.trim()),
    keepExistingPhoto: z.boolean().optional(),
    existingPhotoData: z
      .object({
        image_url: z.string().url().nullable().optional(),
        image_photographer: z.string().max(100).nullable().optional(),
        image_photographer_url: z.string().url().nullable().optional(),
      })
      .optional(),
    model: z.enum(OPENROUTER_MODEL_VALUES).default(DEFAULT_OPENROUTER_MODEL),
    turnstileToken: z.string().optional(),
    existingItineraryId: z.string().uuid().optional(),
    operation: z.enum(['create', 'edit', 'regenerate']).default('create'),
  })
  // Cross-field validations
  .refine(
    (data) => {
      // Validate childAges matches children count
      if (data.children && data.childAges) {
        return data.childAges.length === data.children;
      }
      return true;
    },
    {
      message: "Number of child ages must match number of children",
      path: ["childAges"],
    }
  )
  .refine(
    (data) => {
      // Validate date order
      if (data.startDate && data.endDate) {
        return data.startDate < data.endDate;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      // Validate days matches date range (allow 1 day tolerance)
      if (data.startDate && data.endDate) {
        const daysDiff = Math.ceil(
          (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return Math.abs(daysDiff - data.days) <= 1;
      }
      return true;
    },
    {
      message: "Number of days must match the date range",
      path: ["days"],
    }
  );

// AI response schema matching your PRD
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
        }),
      ),
    }),
  ),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Saved itinerary response (includes database ID)
type SavedItinerary = z.infer<typeof aiResponseSchema> & {
  id: string;
  tags: string[];
};

// MED-2: Helper function to map OpenRouter model ID to ModelKey for pricing
// Now uses database configuration instead of hardcoded mapping
async function mapOpenRouterModelToKey(openRouterModel: string): Promise<ModelKey> {
  try {
    const supabase = await createClient();
    
    // Query database for model configuration
    const { data: modelConfig, error } = await supabase
      .rpc('get_model_config_by_openrouter_id', { 
        p_openrouter_id: openRouterModel 
      })
      .single();
    
    if (error || !modelConfig) {
      console.error(`Unknown or inactive AI model: ${openRouterModel}`, error);
      
      // Fallback to hardcoded mapping for backward compatibility
      const fallbackMapping: Record<string, ModelKey> = {
        'google/gemini-2.0-flash-lite-001': 'gemini-flash',
        'openai/gpt-4o-mini': 'gpt-4o-mini',
        'google/gemini-2.5-pro': 'gemini-flash',
        'anthropic/claude-3-haiku': 'claude-haiku',
        'google/gemini-2.5-flash': 'gemini-flash',
      };
      
      const fallbackKey = fallbackMapping[openRouterModel] || 'gemini-flash';
      console.warn(`Using fallback mapping for ${openRouterModel} -> ${fallbackKey}`);
      return fallbackKey;
    }
    
    return (modelConfig as { pricing_key: string }).pricing_key as ModelKey;
  } catch (err) {
    console.error('Error fetching model config from database:', err);
    // Ultimate fallback
    return 'gemini-flash';
  }
}

// Helper function to reverse map ModelKey back to OpenRouter model ID
// Used when editing itineraries to use the same model
// function mapModelKeyToOpenRouter(modelKey: string): OpenRouterModel {
//   // Reverse mapping from pricing keys to OpenRouter model IDs
//   const reverseMapping: Record<string, OpenRouterModel> = {
//     'gemini-flash': 'google/gemini-2.0-flash-lite-001',
//     'gemini-2.0-flash': 'google/gemini-2.0-flash-lite-001',
//     'gpt-4o-mini': 'openai/gpt-4o-mini',
//     'gemini-2.5-pro': 'google/gemini-2.5-pro',
//     'claude-haiku': 'anthropic/claude-3-haiku',
//     'gemini-2.5-flash': 'google/gemini-2.5-flash',
//   };
//   
//   // Return mapped OpenRouter model or default
//   return reverseMapping[modelKey] || DEFAULT_OPENROUTER_MODEL;
// }

export async function generateItinerary(
  input: z.infer<typeof generateItinerarySchema>,
): Promise<ActionResult<SavedItinerary>> {
  try {
    // 1. Validate input
    const validated = generateItinerarySchema.parse(input);

    // ========================================
    // NO REGEX-BASED VALIDATION
    // ========================================
    // Security is enforced through:
    // 1. AI security instructions in prompts (getSecuritySystemInstructions)
    // 2. AI destination validation in extract-travel-info.ts
    // 3. AI output validation (quality check detects score=0 for violations)
    // 
    // This approach is language-agnostic and understands context/intent

    // 2. Check if user is authenticated and can generate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1.5. Verify Turnstile token (bot protection) - only required for unauthenticated users
    // Authenticated users editing/regenerating their itineraries are already verified
    if (!user?.id && !validated.turnstileToken) {
      console.error('❌ Missing Turnstile token for unauthenticated user');
      return {
        success: false,
        error: 'Security verification required. Please refresh the page and try again.',
      };
    }
    
    if (!user?.id && validated.turnstileToken) {
      const isValidToken = await verifyTurnstileToken(validated.turnstileToken);
      if (!isValidToken) {
        console.error('❌ Invalid Turnstile token - possible bot activity');
        return {
          success: false,
          error: 'Security verification failed. Please refresh the page and try again.',
        };
      }
    }

    // Get the model key for usage tracking (MED-2: now fetched from database)
    const modelKey = await mapOpenRouterModelToKey(validated.model);

    // 2.5. Check rate limits for ALL users (authenticated and anonymous)
    // This prevents abuse even with valid Turnstile tokens
    const rateLimitCheck = await checkRateLimit();
    if (!rateLimitCheck.allowed) {
      console.warn('⚠️ Rate limit exceeded for user:', user?.id || 'anonymous');
      return {
        success: false,
        error: rateLimitCheck.reason || 'Rate limit exceeded. Please try again later.',
      };
    }

    // Only check tier limits for authenticated users
    if (user?.id) {
      const canGenerate = await canGeneratePlan(modelKey, {
        operation: validated.operation,
        existingItineraryId: validated.existingItineraryId,
      });
      if (!canGenerate.allowed) {
        return {
          success: false,
          error: canGenerate.reason || 'Cannot generate plan at this time',
        };
      }
    }

    // 3. Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      return {
        success: false,
        error:
          "AI service is not configured. Please add your OpenRouter API key.",
      };
    }

    // 3.5. Fetch user's travel profile (if authenticated)
    let travelProfile: TravelProfile | null = null;
    if (user?.id) {
      const profileResult = await getUserTravelProfile();
      if (profileResult.success && profileResult.data) {
        travelProfile = profileResult.data;
      }
    }

    // 3.6. Check user's subscription tier for quality level
    const subscriptionInfo = user?.id ? await getUserSubscription() : null;
    const isPaidUser = subscriptionInfo && subscriptionInfo.tier !== 'free';

    // 4. TIERED AGENTIC ITINERARY GENERATION
    let validatedResponse: z.infer<typeof aiResponseSchema>;

    if (isPaidUser) {
      // PAID PLANS: Full 3-pass agentic system with validation & refinement
      
      // Pass 1: Generate itinerary with chain-of-thought reasoning
      const initialItinerary = await generateItineraryWithModel(
        validated.model,
        validated,
        travelProfile
      );
      
      if (!initialItinerary) {
        // Check if this might be an AI refusal (content policy violation)
        return {
          success: false,
          error: "❌ Unable to generate itinerary. This request may violate our content policy. Our platform is for legitimate travel planning only.",
        };
      }

      // Pass 2: Validate quality (using same model)
      const qualityCheck = await validateItineraryQuality(
        initialItinerary,
        validated,
        travelProfile,
        validated.model
      );

      // SECURITY: If score = 0, this indicates a security issue - reject immediately
      if (qualityCheck.score === 0) {
        return {
          success: false,
          error: `Security validation failed: The generated content does not appear to be a valid travel itinerary. Issues detected: ${qualityCheck.issues.join(', ')}. Please ensure your request is for a legitimate travel destination.`,
        };
      }

      validatedResponse = initialItinerary;

      // Pass 3: Refine if needed (using same model) - only if not a security issue
      if (qualityCheck.score < 85 && qualityCheck.needsRefinement) {
        const refinedItinerary = await refineItineraryWithModel(
          validated.model,
          initialItinerary,
          validated,
          travelProfile,
          qualityCheck
        );
        
        if (refinedItinerary) {
          validatedResponse = refinedItinerary;
        }
      }
    } else {
      // FREE PLAN: Single-pass with profile personalization (no validation)
      
      const itinerary = await generateItineraryWithModel(
        validated.model,
        validated,
        travelProfile
      );
      
      if (!itinerary) {
        // Check if this might be an AI refusal (content policy violation)
        return {
          success: false,
          error: "❌ Unable to generate itinerary. This request may violate our content policy. Our platform is for legitimate travel planning only.",
        };
      }

      validatedResponse = itinerary;
    }

    // 6. Fetch destination photo and generate tags in parallel
    // Now we pass the AI plan to the photo fetcher so it can search for specific places mentioned
    // Skip photo fetch if editing and keeping existing photo
    const photoPromise =
      validated.keepExistingPhoto && validated.existingPhotoData
        ? Promise.resolve({
            url: validated.existingPhotoData.image_url || null,
            photographer:
              validated.existingPhotoData.image_photographer || null,
            photographerUrl:
              validated.existingPhotoData.image_photographer_url || null,
          })
        : fetchDestinationPhoto(
            validated.destination,
            validated.notes,
            validatedResponse,
          );

    // Fetch existing tags from database for consistency
    const supabaseForTags = await createClient();
    const { data: existingTagsData } = await supabaseForTags
      .from('itineraries')
      .select('tags')
      .eq('is_private', false);
    
    const allExistingTags = existingTagsData
      ? Array.from(new Set(existingTagsData.flatMap(item => item.tags || [])))
          .filter(tag => tag && tag.length > 0)
          .sort()
      : [];

    const [photo, tags] = await Promise.all([
      photoPromise,
      generateTags({
        destination: validated.destination,
        days: validated.days,
        travelers: validated.travelers,
        children: validated.children,
        notes: validated.notes,
        aiPlan: validatedResponse,
        model: validated.model,
        existingTags: allExistingTags,
      }),
    ]);

    // 7. Save to database
    // Note: supabase and user are already fetched at the beginning
    // For edit/regenerate operations, update the existing itinerary
    // For create operations, insert a new one
    const isEditOperation = (validated.operation === 'edit' || validated.operation === 'regenerate') && validated.existingItineraryId;

    // HIGH-1: Use atomic transaction functions for ALL users (authenticated & anonymous)
    // Ensures atomicity: database writes + logging happen together or not at all
    let savedItinerary: { id: string };
    
    if (user?.id) {
      // ✅ AUTHENTICATED USER: Use atomic transaction function
      // This ensures atomicity: create/update itinerary + deduct credits + log usage
      // If any step fails, everything rolls back automatically
      
      const modelInfo = AI_MODELS[modelKey];
      const modelCost = modelInfo.cost;
      
      if (isEditOperation) {
        // Update existing itinerary with transaction
        const { data, error } = await supabase.rpc(
          'update_itinerary_with_transaction',
          {
            p_user_id: user.id,
            p_itinerary_id: validated.existingItineraryId!,
            p_destination: validated.destination,
            p_days: validated.days,
            p_travelers: validated.travelers,
            p_start_date: validated.startDate?.toISOString().split("T")[0] || null,
            p_end_date: validated.endDate?.toISOString().split("T")[0] || null,
            p_children: validated.children || 0,
            p_child_ages: validated.childAges || [],
            p_has_accessibility_needs: validated.hasAccessibilityNeeds || false,
            p_notes: validated.notes || null,
            p_ai_plan: validatedResponse,
            p_tags: tags,
            p_image_url: photo?.url || null,
            p_image_photographer: photo?.photographer || null,
            p_image_photographer_url: photo?.photographerUrl || null,
            p_model_key: modelKey,
            p_model_cost: modelCost,
            p_operation: validated.operation,
          }
        );
        
        if (error || !data?.success) {
          console.error("Transaction failed:", error || data?.error);
          return {
            success: false,
            error: data?.error || error?.message || "Failed to update itinerary",
          };
        }
        
        savedItinerary = { id: validated.existingItineraryId! };
        
      } else {
        // Create new itinerary with transaction
        const { data, error } = await supabase.rpc(
          'create_itinerary_with_transaction',
          {
            p_user_id: user.id,
            p_destination: validated.destination,
            p_days: validated.days,
            p_travelers: validated.travelers,
            p_start_date: validated.startDate?.toISOString().split("T")[0] || null,
            p_end_date: validated.endDate?.toISOString().split("T")[0] || null,
            p_children: validated.children || 0,
            p_child_ages: validated.childAges || [],
            p_has_accessibility_needs: validated.hasAccessibilityNeeds || false,
            p_notes: validated.notes || null,
            p_ai_plan: validatedResponse,
            p_tags: tags,
            p_is_private: false, // Default to public for new itineraries
            p_image_url: photo?.url || null,
            p_image_photographer: photo?.photographer || null,
            p_image_photographer_url: photo?.photographerUrl || null,
            p_status: "published",
            p_model_key: modelKey,
            p_model_cost: modelCost,
            p_operation: validated.operation,
          }
        );
        
        if (error || !data?.success) {
          console.error("Transaction failed:", error || data?.error);
          
          // Provide user-friendly error messages
          const errorMsg = data?.error || error?.message || "Failed to create itinerary";
          if (errorMsg.includes("Insufficient credits")) {
            return {
              success: false,
              error: "Insufficient credits. Please purchase more credits to continue.",
            };
          }
          
          return {
            success: false,
            error: errorMsg,
          };
        }
        
        savedItinerary = { id: data.itinerary_id };
      }
      
    } else {
      // ✅ ANONYMOUS USER: Use atomic transaction function (HIGH-1)
      // This ensures consistency and proper usage logging even for anonymous users
      const { data, error } = await supabase.rpc(
        'create_anonymous_itinerary_with_transaction',
        {
          p_destination: validated.destination,
          p_days: validated.days,
          p_travelers: validated.travelers,
          p_start_date: validated.startDate?.toISOString().split("T")[0] || null,
          p_end_date: validated.endDate?.toISOString().split("T")[0] || null,
          p_children: validated.children || 0,
          p_child_ages: validated.childAges || [],
          p_has_accessibility_needs: validated.hasAccessibilityNeeds || false,
          p_notes: validated.notes || null,
          p_ai_plan: validatedResponse,
          p_tags: tags,
          p_image_url: photo?.url || null,
          p_image_photographer: photo?.photographer || null,
          p_image_photographer_url: photo?.photographerUrl || null,
          p_model_key: modelKey,
        }
      );
      
      if (error || !data?.success) {
        console.error("Transaction failed:", error || data?.error);
        return {
          success: false,
          error: data?.error || error?.message || "Failed to save itinerary. Please try again or sign in.",
        };
      }
      
      savedItinerary = { id: data.itinerary_id };
    }

    return {
      success: true,
      data: {
        ...validatedResponse,
        id: savedItinerary.id,
        tags,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return { success: false, error: "Invalid data provided" };
    }

    if (error instanceof Error) {
      // Handle specific AI errors
      if (error.message.includes("rate_limit")) {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again in a moment.",
        };
      }
      if (error.message.includes("insufficient_quota")) {
        console.error("OpenRouter quota exceeded");
        return {
          success: false,
          error: "AI service temporarily unavailable. Please try again later.",
        };
      }
      if (error.message.includes("Invalid API key")) {
        console.error("Invalid OpenRouter API key");
        return {
          success: false,
          error: "AI service configuration error. Please contact support.",
        };
      }
    }

    console.error("AI generation error:", error);
    return {
      success: false,
      error: "Failed to generate travel plan. Please try again.",
    };
  }
}

function buildPrompt(
  params: z.infer<typeof generateItinerarySchema>,
  profile: TravelProfile | null = null
): string {
  // Add security instructions at the top of every prompt
  const securityInstructions = getSecuritySystemInstructions();
  
  // Build traveler description
  let travelersDesc = `${params.travelers} adult${params.travelers > 1 ? "s" : ""}`;
  if (params.children && params.children > 0) {
    travelersDesc += ` and ${params.children} child${params.children > 1 ? "ren" : ""}`;
    if (params.childAges && params.childAges.length > 0) {
      travelersDesc += ` (ages: ${params.childAges.join(", ")})`;
    }
  }

  // Build profile personalization section
  let profileSection = "";
  if (profile) {
    profileSection = `\n## 🎯 PERSONALIZATION - Travel Profile
This traveler has completed a detailed travel personality quiz. Use this profile to personalize recommendations:

**Travel Archetype:** ${profile.archetype}
${profile.profile_summary}

**Key Preferences to Honor:**
${profile.activity_preferences && profile.activity_preferences.length > 0 ? `
Activities they love:
${profile.activity_preferences.map(pref => `  • ${pref}`).join('\n')}
` : ''}
${profile.dining_preferences && profile.dining_preferences.length > 0 ? `
Dining style:
${profile.dining_preferences.map(pref => `  • ${pref}`).join('\n')}
` : ''}
${profile.accommodation_preferences && profile.accommodation_preferences.length > 0 ? `
Accommodation preferences:
${profile.accommodation_preferences.map(pref => `  • ${pref}`).join('\n')}
` : ''}
${profile.social_preferences && profile.social_preferences.length > 0 ? `
Social style:
${profile.social_preferences.map(pref => `  • ${pref}`).join('\n')}
` : ''}
**Travel pace:** ${profile.pace}
**Budget band:** ${profile.budget_band}
${profile.dietary_needs && profile.dietary_needs.length > 0 ? `**Dietary needs:** ${profile.dietary_needs.join(', ')}` : ''}

**CRITICAL PERSONALIZATION INSTRUCTIONS:**
- Match activity recommendations to their specific preferences (not generic)
- Respect their dining style and food adventure level
- Align daily pace with their preference (${profile.pace})
- Choose venues that fit their budget band (${profile.budget_band})
- Include their preferred activity types throughout the itinerary
- Add brief "Why we picked this" notes for 2-3 key activities that match their profile
${profile.travel_strengths && profile.travel_strengths.length > 0 ? `- Leverage their travel strengths: ${profile.travel_strengths.join(', ')}` : ''}

`;
  }

  // Build date-specific instructions
  let dateInstructions = "";
  let dayTitleExample = '"Day 1"';

  if (params.startDate && params.endDate) {
    const startDateStr = params.startDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const endDateStr = params.endDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    dateInstructions = `\nTravel dates: ${startDateStr} to ${endDateStr}`;
    dayTitleExample = `"Day 1 - ${startDateStr}"`;

    // Generate all day titles with actual dates
    const dayTitles: string[] = [];
    const currentDate = new Date(params.startDate);
    for (let i = 0; i < params.days; i++) {
      const dayStr = currentDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      dayTitles.push(`Day ${i + 1} - ${dayStr}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    dateInstructions += `\n\nIMPORTANT: Use these EXACT day titles in order:\n${dayTitles.map((t, i) => `${i + 1}. "${t}"`).join("\n")}`;
  }

  return `${securityInstructions}

## TRAVEL ITINERARY GENERATION TASK

⚠️ CRITICAL SECURITY CHECK FIRST:
Before generating the itinerary, review the ENTIRE request (destination + notes) for policy violations.
${params.notes ? `Check these user notes carefully: "${params.notes}"` : ''}
If you detect inappropriate content, sexual references, drugs, violence, hate speech, or policy violations in ANY language, return the error format specified above. DO NOT generate an itinerary.

If the request is appropriate, proceed:

Generate a ${params.days}-day travel itinerary for ${params.destination}.

Number of travelers: ${travelersDesc}${dateInstructions}
${params.notes ? `Additional notes: ${params.notes}` : ""}
${profileSection}

IMPORTANT: Detect the language used in the user's notes and respond in that SAME language. If no notes provided or notes are in English, respond in English. Match the user's language for all text content (place names, descriptions, etc.).
${params.children && params.children > 0 ? `\nIMPORTANT: This trip includes children (ages ${params.childAges?.join(", ") || "unspecified"}). Include child-friendly activities, appropriate timing, and family-suitable venues. Schedule breaks and avoid overpacking the day.` : ""}
${params.hasAccessibilityNeeds ? `\nIMPORTANT: This trip requires accessibility accommodations. ONLY include venues with wheelchair access, elevators, accessible restrooms, and mobility-friendly facilities. Avoid places with many stairs, narrow passages, or difficult terrain. Prioritize accessible transportation options.` : ""}

Create a detailed day-by-day travel plan with SPECIFIC SCHEDULED TIMES for each activity. 
Build a realistic daily schedule that:
- Starts around 8:00-9:00 AM
- Includes specific time slots for each attraction/activity (e.g., "9:00 AM - 11:00 AM")
- Accounts for meal times (breakfast, lunch, dinner)
- Includes realistic travel time between locations
- Ends around 8:00-10:00 PM
- Leaves breathing room between activities (don't over-schedule)
${params.children && params.children > 0 ? "- With children: include afternoon breaks, shorter activities, and ends earlier" : ""}

Return ONLY a JSON object (no markdown, no extra text) with this EXACT structure:
{
  "city": "${params.destination}",
  "days": [
    {
      "title": ${dayTitleExample} ${params.startDate ? "(use the EXACT titles provided above)" : '(or "Dzień 1" for Polish, etc. - match user\'s language)'},
      "places": [
        {
          "name": "Place name",
          "desc": "Brief description of what to do here (in user's language)",
          "time": "Scheduled time slot (e.g., '9:00 AM - 11:00 AM' or '9:00 - 11:00' - match user's language and locale)"
        }
      ]
    }
  ]
}

CRITICAL - Time Format Requirements:
- Use SPECIFIC TIME RANGES for each place (e.g., "9:00 AM - 11:00 AM", "12:00 PM - 1:30 PM")
- Create a sequential schedule throughout the day
- Each place should follow logically after the previous one (no time overlaps!)
- Include meals as places (e.g., "Lunch at Local Bistro: 1:00 PM - 2:00 PM")
- Times should be realistic for the activity (museums: 1-2 hours, meals: 1-1.5 hours, landmarks: 30min-2 hours)
- Match the time format to user's language (24-hour for most European languages, AM/PM for English)

Important:
- Include ${params.days} days in the "days" array
- Each day should have 4-6 places/activities (including meals)
- Create a LOGICAL FLOW through the day - nearby places grouped together
- Mix different types of activities (sightseeing, dining, culture, relaxation)
- Be specific with place names and descriptions
- Make it realistic and practical for ${params.travelers} traveler(s)
- ALL descriptions, times, and text must be in the SAME language as the user's notes
${params.notes ? `- Take into account: ${params.notes}` : ""}`;
}

/**
 * Helper function to determine duration tag based on number of days
 * Returns standardized duration tags for consistent filtering
 */
function getDurationTag(days: number): string {
  if (days === 1) return "1 day";
  if (days >= 2 && days <= 3) return "2-3 days";
  if (days >= 4 && days <= 6) return "4-6 days";
  if (days === 7) return "7 days";
  if (days >= 8 && days <= 10) return "8-10 days";
  if (days >= 11 && days <= 13) return "11-13 days";
  if (days === 14) return "14 days";
  return "14+ days"; // 15+ days
}

/**
 * Helper function to determine group size tag based on travelers and children
 * Returns standardized group size tags for consistent filtering
 */
function getGroupSizeTag(travelers: number, children?: number): string {
  const totalPeople = travelers + (children || 0);
  
  // Family takes precedence if there are children
  if (children && children > 0) {
    return "family";
  }
  
  // Otherwise, determine by total count
  if (totalPeople === 1) return "solo";
  if (totalPeople === 2) return "2 people";
  return "group"; // 3 or more people
}

/**
 * Generate relevant tags for filtering and categorization
 * Uses AI to intelligently tag itineraries based on content
 * 
 * Returns tags in 3 categories:
 * 1. Duration tag (automatic based on days)
 * 2. Group size tag (automatic based on travelers + children)
 * 3. Nature/interest tags (AI-generated based on activities)
 */
async function generateTags(params: {
  destination: string;
  days: number;
  travelers: number;
  children?: number;
  notes?: string;
  aiPlan: z.infer<typeof aiResponseSchema>;
  model: OpenRouterModel;
  existingTags?: string[];
}): Promise<string[]> {
  try {
    const existingTagsList = params.existingTags && params.existingTags.length > 0
      ? `\n\nEXISTING TAGS IN DATABASE:\n${params.existingTags.slice(0, 100).join(", ")}\n\nIMPORTANT: PRIORITIZE using tags from the existing tags list above when they match the itinerary. Only create NEW tags if none of the existing tags fit well.`
      : '';

    const prompt = `You are a travel categorization expert. Analyze this travel itinerary and generate NATURE/INTEREST tags that describe the type and characteristics of this trip.

IMPORTANT: DO NOT generate tags for:
❌ Duration (like "weekend", "3-5 days", "week-long") - this is handled automatically
❌ Group size (like "solo", "couple", "family", "group") - this is handled automatically
❌ Destination names (like cities, countries, regions) - destination is searchable separately

ONLY generate tags for the NATURE and INTERESTS of the trip based on:
- Activities and places visited
- Type of experience (romantic, adventure, cultural, relaxation, etc.)
- Main interests (food, history, art, nature, museums, architecture, etc.)
- Budget level if clear (budget, mid-range, luxury)
- Special characteristics (family-friendly, accessible, off-the-beaten-path, etc.)

Duration: ${params.days} days
Travelers: ${params.travelers}${params.children ? ` (including ${params.children} children)` : ""}
${params.notes ? `Notes: ${params.notes}` : ""}

Itinerary places: ${params.aiPlan.days.map((d) => d.places.map((p) => p.name).join(", ")).join("; ")}
${existingTagsList}

Generate 6-10 tags describing the NATURE of this trip. Categories to consider:

1. TRIP TYPE (pick 1-3):
   romantic, adventure, cultural, relaxation, beach, city-break, road-trip, backpacking, luxury, budget-friendly, wellness, spiritual, educational, eco-tourism

2. INTERESTS & ACTIVITIES (pick 3-6):
   food, cuisine, restaurants, cooking, wine, coffee
   history, historical-sites, archaeology, ancient-ruins
   art, museums, galleries, modern-art, street-art
   nature, hiking, mountains, wildlife, national-parks, outdoors
   architecture, churches, castles, palaces, monuments
   photography, scenic-views, landscapes
   shopping, markets, local-crafts, fashion
   nightlife, bars, clubs, entertainment
   music, concerts, festivals, local-culture
   sports, skiing, surfing, diving, cycling
   wellness, spa, yoga, meditation
   technology, innovation, science

3. SPECIAL CHARACTERISTICS (pick 0-2):
   family-friendly, kid-activities, accessible, pet-friendly, sustainable, eco-conscious, off-the-beaten-path, hidden-gems, local-experience, authentic, budget, mid-range, luxury

TAG SELECTION STRATEGY:
✅ PRIORITIZE reusing existing tags from the database when they match
✅ Use exact same spelling as existing tags (if "city-break" exists, use "city-break" not "city break")
✅ Only create new tags when existing ones don't accurately describe this trip
✅ Focus on tags that describe the EXPERIENCE, not logistics

FORMAT RULES:
- All lowercase
- Use hyphens for multi-word tags (e.g., "city-break", "family-friendly")
- Keep tags concise (1-3 words)
- NO destination names
- NO duration indicators (no "weekend", "5-day", etc.)
- NO group size indicators (no "solo", "couple", "family")

Return ONLY a JSON array of strings:
["tag1", "tag2", "tag3", ...]

✅ GOOD: ["romantic", "city-break", "art", "museums", "food", "architecture", "mid-range"]
❌ BAD: ["paris", "5-days", "couple", "france", "weekend-trip"]`;

    const tagModels = [
      params.model,
      ...OPENROUTER_BUDGET_FIRST_ORDER.filter((m) => m !== params.model),
    ];
    let completion;
    for (const modelId of tagModels) {
      try {
        completion = await openrouter.chat.completions.create({
          model: modelId,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 500,
        });
        if (completion) {
          break;
        }
      } catch {
        continue;
      }
    }
    if (!completion) {
      return generateFallbackTags(params);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return generateFallbackTags(params);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return generateFallbackTags(params);
    }

    // Handle both array response and object with tags array
    const tags = Array.isArray(parsed) ? parsed : parsed.tags || [];

    if (!Array.isArray(tags) || tags.length === 0) {
      return generateFallbackTags(params);
    }

    // Clean and validate AI-generated nature tags
    const cleanedTags = tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.toLowerCase().trim())
      .filter((tag) => tag.length > 0 && tag.length < 50);
    
    // Remove destination-related tags and deduplicate
    const natureTags = deduplicateAndFilterTags(cleanedTags, params.destination);
    
    // Automatically add duration and group size tags
    const durationTag = getDurationTag(params.days);
    const groupSizeTag = getGroupSizeTag(params.travelers, params.children);
    
    // Combine all tags: [duration, groupSize, ...natureTags]
    return [durationTag, groupSizeTag, ...natureTags];
  } catch (error) {
    console.error("Tag generation error:", error);
    return generateFallbackTags(params);
  }
}

/**
 * Fallback tag generation when AI fails
 * Returns automatic duration/group tags plus rule-based nature tags
 */
function generateFallbackTags(params: {
  destination: string;
  days: number;
  travelers: number;
  children?: number;
  notes?: string;
  model?: OpenRouterModel;
}): string[] {
  const tags: string[] = [];

  // Add automatic duration and group size tags
  tags.push(getDurationTag(params.days));
  tags.push(getGroupSizeTag(params.travelers, params.children));

  // Extract nature/interest tags from notes
  if (params.notes) {
    const lowerNotes = params.notes.toLowerCase();
    
    // Family-related
    if (lowerNotes.includes("family") || lowerNotes.includes("kids") || lowerNotes.includes("children")) {
      tags.push("family-friendly");
    }
    
    // Trip type
    if (lowerNotes.includes("adventure")) tags.push("adventure");
    if (lowerNotes.includes("romantic") || lowerNotes.includes("honeymoon")) tags.push("romantic");
    if (lowerNotes.includes("beach") || lowerNotes.includes("coast")) tags.push("beach");
    if (lowerNotes.includes("culture") || lowerNotes.includes("cultural")) tags.push("cultural");
    if (lowerNotes.includes("city")) tags.push("city-break");
    
    // Interests
    if (lowerNotes.includes("food") || lowerNotes.includes("restaurant") || lowerNotes.includes("culinary")) tags.push("food");
    if (lowerNotes.includes("history") || lowerNotes.includes("historical")) tags.push("history");
    if (lowerNotes.includes("art") || lowerNotes.includes("museum")) tags.push("art");
    if (lowerNotes.includes("nature") || lowerNotes.includes("hiking") || lowerNotes.includes("outdoor")) tags.push("nature");
    if (lowerNotes.includes("photography") || lowerNotes.includes("photo")) tags.push("photography");
    if (lowerNotes.includes("shopping")) tags.push("shopping");
    if (lowerNotes.includes("nightlife") || lowerNotes.includes("party")) tags.push("nightlife");
    
    // Budget
    if (lowerNotes.includes("luxury") || lowerNotes.includes("upscale")) tags.push("luxury");
    else if (lowerNotes.includes("budget") || lowerNotes.includes("cheap") || lowerNotes.includes("affordable")) tags.push("budget");
    else tags.push("mid-range");
  }

  // Default trip type if nothing detected (skip if already has duration and group tags)
  const natureTags = tags.slice(2); // Skip duration and group tags
  if (natureTags.length === 0) {
    tags.push("cultural");
  }

  return tags.slice(0, 12); // Max 12 tags (2 fixed + up to 10 nature)
}

/**
 * Deduplicate tags and remove destination-related tags
 */
function deduplicateAndFilterTags(tags: string[], destination: string): string[] {
  const destinationLower = destination.toLowerCase();
  const destinationWords = destinationLower.split(/[\s,]+/);
  
  // List of common location-related words to filter out
  const locationWords = new Set([
    'city', 'town', 'village', 'island', 'country', 'region', 
    'district', 'province', 'state', 'county', 'area'
  ]);
  
  // Remove destination-related tags
  const filtered = tags.filter(tag => {
    const tagLower = tag.toLowerCase();
    
    // Skip if tag matches destination or contains destination words
    if (tagLower === destinationLower) return false;
    if (destinationWords.some(word => word.length > 2 && tagLower.includes(word))) return false;
    if (tagLower.includes(destinationLower)) return false;
    
    // Skip pure location indicators without context
    if (locationWords.has(tagLower)) return false;
    
    return true;
  });
  
  // Deduplicate similar tags (e.g., "10 days" and "10-day-trip")
  const normalized = new Map<string, string>();
  
  for (const tag of filtered) {
    // Normalize for comparison: remove hyphens, spaces, common suffixes
    const normalizedKey = tag
      .replace(/[-\s]/g, '')
      .replace(/trip|travel|vacation|holiday/g, '')
      .toLowerCase();
    
    // Keep the shorter/cleaner version
    if (!normalized.has(normalizedKey) || tag.length < normalized.get(normalizedKey)!.length) {
      normalized.set(normalizedKey, tag);
    }
  }
  
  return Array.from(normalized.values()).slice(0, 12); // Max 12 unique tags
}

/**
 * AGENTIC ITINERARY GENERATION HELPERS
 * These functions implement the 3-pass agentic approach:
 * 1. Generate with chain-of-thought reasoning
 * 2. Validate quality with self-reflection
 * 3. Refine if needed
 */

/**
 * Generate itinerary using specified model with profile personalization
 */
async function generateItineraryWithModel(
  model: string,
  params: z.infer<typeof generateItinerarySchema>,
  profile: TravelProfile | null
): Promise<z.infer<typeof aiResponseSchema> | null> {
  try {
    const prompt = buildAgenticItineraryPrompt(params, profile);
    
    const primaryAndFallbacks = [
      model,
      ...OPENROUTER_BUDGET_FIRST_ORDER.filter((m) => m !== model),
    ];

    for (const modelId of primaryAndFallbacks) {
      try {
        const completion = await openrouter.chat.completions.create({
          model: modelId,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 8000,
        });

        if (completion?.choices?.[0]?.message?.content) {
          const rawContent = completion.choices[0].message.content;
          try {
            const parsed = JSON.parse(rawContent);
            
            // Check if AI refused the request (security violation)
            if (parsed.error) {
              // Return null to trigger error handling in parent function
              return null;
            }
            
            return aiResponseSchema.parse(parsed);
          } catch (parseError) {
            console.error(`Parse error with ${modelId}:`, parseError);
            continue;
          }
        }
      } catch (err) {
        console.error(`Model ${modelId} failed:`, err);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Itinerary generation error:', error);
    return null;
  }
}

/**
 * Build agentic prompt with chain-of-thought reasoning
 */
function buildAgenticItineraryPrompt(
  params: z.infer<typeof generateItinerarySchema>,
  profile: TravelProfile | null
): string {
  const basePrompt = buildPrompt(params, profile);
  
  // Enhanced with chain-of-thought reasoning
  // Note: basePrompt already includes security instructions from getSecuritySystemInstructions()
  const agenticPrefix = `## YOUR ROLE (AGENTIC MODE)
You are an expert travel planner with 15+ years of experience creating personalized itineraries. Your strength is balancing traveler preferences with practical logistics.

## YOUR SYSTEMATIC APPROACH:

### STEP 1: ANALYZE THE REQUEST
- Destination: ${params.destination}
- Duration: ${params.days} days
- Travelers: ${params.travelers} adults${params.children ? ` + ${params.children} children` : ''}
- Special needs: ${params.hasAccessibilityNeeds ? 'Yes - accessibility required' : 'None'}
${profile ? `- Travel style: ${profile.archetype} (${profile.pace} pace, ${profile.budget_band} budget)` : '- Travel style: Not specified'}

### STEP 2: IDENTIFY KEY PRIORITIES
${profile ? `Based on their travel profile (${profile.archetype}), prioritize:
${profile.activity_preferences ? profile.activity_preferences.slice(0, 3).map(p => `  • ${p}`).join('\n') : '  • Balanced mix of activities'}
` : '  • Create a well-rounded experience\n  • Balance different activity types'}

### STEP 3: DESIGN DAILY FLOW
- Morning activities (8-12): Higher energy, popular attractions
- Afternoon (12-6): Mix of activities, meals, exploration
- Evening (6-10): Dining, relaxation, or nightlife
- Ensure realistic timing and geographic clustering

### STEP 4: VALIDATE & REFINE
- Check: Are all times realistic?
- Check: Is the daily pace appropriate?
- Check: Does it match their profile preferences?
- Check: Are meal times and travel time accounted for?

`;

  return agenticPrefix + basePrompt;
}

/**
 * Validate itinerary quality with self-reflection
 */
async function validateItineraryQuality(
  itinerary: z.infer<typeof aiResponseSchema>,
  params: z.infer<typeof generateItinerarySchema>,
  profile: TravelProfile | null,
  model: string
): Promise<{ score: number; needsRefinement: boolean; issues: string[] }> {
  try {
    const validationPrompt = `You are a quality assurance expert reviewing a travel itinerary.

## 🔒 SECURITY CHECK
First, verify this is a LEGITIMATE TRAVEL ITINERARY:
- Is the destination a real geographic location?
- Do the activities involve actual travel and tourism?
- Is the content appropriate for a travel planning service?

If this fails security checks, return score: 0 immediately.

## ITINERARY TO REVIEW:
${JSON.stringify(itinerary, null, 2)}

## ORIGINAL REQUEST:
- Destination: ${params.destination}
- Days: ${params.days}
- Travelers: ${params.travelers} adults${params.children ? ` + ${params.children} children` : ''}
${params.notes ? `- User Notes: "${params.notes}"` : ''}
${profile ? `- Travel Profile: ${profile.archetype} (prefers: ${profile.activity_preferences?.slice(0, 2).join(', ')})` : ''}

## EVALUATION CRITERIA (0-100 scale):

0. **Security (CRITICAL)**: Is this a legitimate travel itinerary for an appropriate request?
   - Score = 0 if: 
     * Destination is not a real geographic location (household items, fictional places, etc.)
     * Activities are not travel-related (recipes, homework, etc.)
     * Original request contains inappropriate content (check User Notes for sexual references, drugs, violence, hate speech, etc.)
     * Request violates content policy in ANY language
   - ⚠️ CHECK THE USER NOTES CAREFULLY for inappropriate content, slang, or policy violations
   - Otherwise proceed with quality evaluation

1. **Feasibility (30 points)**: Are times realistic and routes logical?
   - Check timing for each activity (not too rushed, not too loose)
   - Check geographic flow (nearby places grouped, no excessive backtracking)
   - Check daily start/end times (reasonable for travelers)
   - Check meal timing and inclusion

2. **Personalization (25 points)**: ${profile ? `Does it match the ${profile.archetype} profile?` : 'Is it well-tailored to the request?'}
   ${profile ? `- Check alignment with: ${profile.activity_preferences?.slice(0, 2).join(', ')}
   - Check pace matches: ${profile.pace}
   - Check budget alignment: ${profile.budget_band}` : '- Check variety and balance of activities'}

3. **Balance (25 points)**: Good mix and pacing?
   - Variety of activity types (culture, food, nature, relaxation)
   - Appropriate daily pace (not exhausting, not boring)
   - Breaks and breathing room between activities
   ${params.children ? '- Child-friendly timing and activities' : ''}

4. **Detail Quality (20 points)**: Clear and helpful descriptions?
   - Specific place names (not generic)
   - Helpful descriptions (what to do, why it's special)
   - Complete time slots for all activities
   - Practical and actionable information

## CRITICAL ISSUES TO FLAG:
- 🚨 SECURITY: Non-travel content (recipes, homework, etc.) - SCORE = 0
- 🚨 SECURITY: Invalid destination (kitchen, bedroom, etc.) - SCORE = 0
- Impossible timing (too much in too little time)
- Geographic chaos (jumping across city repeatedly)
- Missing meals or unrealistic meal times
- Generic or vague place names
- Poor profile alignment (if profile provided)
- Overpacked or underpacked days

Return JSON:
{
  "score": 85,
  "needsRefinement": false,
  "issues": ["list specific issues, or empty array"],
  "strengths": ["what works well"],
  "reasoning": "Brief explanation"
}`;

    const completion = await openrouter.chat.completions.create({
      model: model, // Use same model for consistency
      messages: [{ role: "user", content: validationPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temp for evaluation
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { score: 90, needsRefinement: false, issues: [] };
    }

    const result = JSON.parse(content);
    
    // If AI detected security issues (score = 0), log it
    if (result.score === 0) {
      logSecurityIncident('validation_failure', 'hard_block', {
        destination: params.destination,
        detectedPatterns: result.issues || ['AI validation returned score 0'],
      });
    }
    
    return {
      score: result.score || 90,
      needsRefinement: result.score > 0 && (result.score || 90) < 85, // Only refine if not a security issue
      issues: result.issues || [],
    };

  } catch (error) {
    console.error('Validation error:', error);
    return { score: 90, needsRefinement: false, issues: [] };
  }
}

/**
 * Refine itinerary using same model
 */
async function refineItineraryWithModel(
  model: string,
  itinerary: z.infer<typeof aiResponseSchema>,
  params: z.infer<typeof generateItinerarySchema>,
  profile: TravelProfile | null,
  qualityCheck: { score: number; issues: string[] }
): Promise<z.infer<typeof aiResponseSchema> | null> {
  try {
    const refinementPrompt = `You are refining a travel itinerary that needs improvement.

## ORIGINAL ITINERARY:
${JSON.stringify(itinerary, null, 2)}

## IDENTIFIED ISSUES:
${qualityCheck.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

## REQUEST DETAILS:
- Destination: ${params.destination}
- Days: ${params.days}
- Travelers: ${params.travelers}${params.children ? ` + ${params.children} children` : ''}
${profile ? `- Travel Profile: ${profile.archetype}` : ''}

## YOUR TASK:
Create an IMPROVED version that:
1. Fixes all identified issues
2. Maintains what works well
3. Ensures realistic timing and flow
4. ${profile ? `Better matches the ${profile.archetype} profile` : 'Creates better balance'}
5. Provides specific, actionable details

Return the improved itinerary in the SAME JSON format as the original.`;

    const completion = await openrouter.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: refinementPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 8000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(extractJSON(content));
    return aiResponseSchema.parse(parsed);

  } catch (error) {
    console.error('Refinement error:', error);
    return null;
  }
}
