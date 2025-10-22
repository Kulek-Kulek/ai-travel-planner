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
import { z } from "zod";

// Input schema
const generateItinerarySchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  days: z.number().int().positive().max(30),
  travelers: z.number().int().positive().max(20),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  children: z.number().int().min(0).max(10).optional(),
  childAges: z.array(z.number().int().min(0).max(17)).optional(),
  hasAccessibilityNeeds: z.boolean().optional(),
  notes: z.string().optional(),
  keepExistingPhoto: z.boolean().optional(),
  existingPhotoData: z
    .object({
      image_url: z.string().nullable().optional(),
      image_photographer: z.string().nullable().optional(),
      image_photographer_url: z.string().nullable().optional(),
    })
    .optional(),
  model: z.enum(OPENROUTER_MODEL_VALUES).default(DEFAULT_OPENROUTER_MODEL),
});

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

export async function generateItinerary(
  input: z.infer<typeof generateItinerarySchema>,
): Promise<ActionResult<SavedItinerary>> {
  try {
    // 1. Validate input
    const validated = generateItinerarySchema.parse(input);

    // 2. Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      return {
        success: false,
        error:
          "AI service is not configured. Please add your OpenRouter API key.",
      };
    }

    // 3. Build prompt
    const prompt = buildPrompt(validated);

    // 4. Call AI to generate itinerary with budget-first fallback routing
    const primaryAndFallbacks = [
      validated.model,
      ...OPENROUTER_BUDGET_FIRST_ORDER.filter((m) => m !== validated.model),
    ];

    let completion;
    let usedModel: string | null = null;
    let lastError: unknown = null;
    for (const modelId of primaryAndFallbacks) {
      try {
        completion = await openrouter.chat.completions.create({
          model: modelId,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 8000,
        });
        if (completion) {
          usedModel = modelId;
          break;
        }
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    if (!completion) {
      console.error("All model fallbacks failed", lastError);
      return {
        success: false,
        error: "AI service unavailable. Please try again later.",
      };
    }

    // 5. Parse and validate AI response; if empty/invalid, try the next fallback model automatically
    let validatedResponse: z.infer<typeof aiResponseSchema> | null = null;
    if (completion?.choices?.[0]?.message?.content) {
      const rawContent = completion.choices[0].message.content;
      try {
        const parsed = JSON.parse(rawContent);
        validatedResponse = aiResponseSchema.parse(parsed);
      } catch (parseErr) {
        // Try extracting JSON from response
        const start = rawContent.indexOf("{");
        const end = rawContent.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          const possibleJson = rawContent.slice(start, end + 1);
          try {
            const parsed = JSON.parse(possibleJson);
            validatedResponse = aiResponseSchema.parse(parsed);
          } catch {
            // JSON extraction failed, will try fallback models
          }
        }
      }
    }

    if (!validatedResponse) {
      // current model failed to yield valid output; try remaining models
      for (const modelId of primaryAndFallbacks) {
        if (modelId === usedModel) continue;
        try {
          const attempt = await openrouter.chat.completions.create({
            model: modelId,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 8000,
          });
          const txt = attempt.choices?.[0]?.message?.content;
          if (!txt) continue;
          let parsed: unknown;
          try {
            parsed = JSON.parse(txt);
          } catch {
            const s = txt.indexOf("{");
            const e = txt.lastIndexOf("}");
            if (s !== -1 && e !== -1 && e > s) {
              const maybe = txt.slice(s, e + 1);
              try {
                parsed = JSON.parse(maybe);
              } catch {
                continue;
              }
            } else {
              continue;
            }
          }
          try {
            validatedResponse = aiResponseSchema.parse(parsed);
            usedModel = modelId;
            break;
          } catch {
            continue;
          }
        } catch {
          continue;
        }
      }
    }

    if (!validatedResponse) {
      return {
        success: false,
        error:
          "AI output was empty or invalid. Please try another model (e.g., Gemini Flash 2.5 or GPT-4o mini).",
      };
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

    const [photo, tags] = await Promise.all([
      photoPromise,
      generateTags({
        destination: validated.destination,
        days: validated.days,
        travelers: validated.travelers,
        notes: validated.notes,
        aiPlan: validatedResponse,
        model: validated.model,
      }),
    ]);

    // 7. Save to database
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: savedItinerary, error: dbError } = await supabase
      .from("itineraries")
      .insert({
        user_id: user?.id || null, // NULL for anonymous users
        destination: validated.destination,
        days: validated.days,
        travelers: validated.travelers,
        start_date: validated.startDate?.toISOString().split("T")[0] || null,
        end_date: validated.endDate?.toISOString().split("T")[0] || null,
        children: validated.children || 0,
        child_ages: validated.childAges || [],
        has_accessibility_needs: validated.hasAccessibilityNeeds || false,
        notes: validated.notes || null,
        ai_plan: validatedResponse,
        tags,
        is_private: false, // Default to public (users can change later)
        image_url: photo?.url || null,
        image_photographer: photo?.photographer || null,
        image_photographer_url: photo?.photographerUrl || null,
      })
      .select("id")
      .single();

    if (dbError || !savedItinerary) {
      console.error("Database save error:", dbError);
      console.error("Error details:", JSON.stringify(dbError, null, 2));
      console.error("Saved itinerary:", savedItinerary);

      // Provide more specific error messages
      if (dbError) {
        const errorMessage = dbError.message || "Unknown database error";
        console.error("Supabase error message:", errorMessage);

        // Check for common issues
        if (
          errorMessage.includes("permission") ||
          errorMessage.includes("policy")
        ) {
          return {
            success: false,
            error:
              "Database permission error. Please check RLS policies or try signing in.",
          };
        }

        if (errorMessage.includes("violates")) {
          return {
            success: false,
            error:
              "Database constraint violation. Please check your input data.",
          };
        }
      }

      return {
        success: false,
        error:
          "Generated itinerary but failed to save. Please try again or contact support.",
      };
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

function buildPrompt(params: z.infer<typeof generateItinerarySchema>): string {
  // Build traveler description
  let travelersDesc = `${params.travelers} adult${params.travelers > 1 ? "s" : ""}`;
  if (params.children && params.children > 0) {
    travelersDesc += ` and ${params.children} child${params.children > 1 ? "ren" : ""}`;
    if (params.childAges && params.childAges.length > 0) {
      travelersDesc += ` (ages: ${params.childAges.join(", ")})`;
    }
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

  return `Generate a ${params.days}-day travel itinerary for ${params.destination}.

Number of travelers: ${travelersDesc}${dateInstructions}
${params.notes ? `Additional notes: ${params.notes}` : ""}

IMPORTANT: Detect the language used in the user's notes and respond in that SAME language. If no notes provided or notes are in English, respond in English. Match the user's language for all text content (place names, descriptions, etc.).
${params.children && params.children > 0 ? `\nIMPORTANT: This trip includes children (ages ${params.childAges?.join(", ") || "unspecified"}). Include child-friendly activities, appropriate timing, and family-suitable venues.` : ""}
${params.hasAccessibilityNeeds ? `\nIMPORTANT: This trip requires accessibility accommodations. ONLY include venues with wheelchair access, elevators, accessible restrooms, and mobility-friendly facilities. Avoid places with many stairs, narrow passages, or difficult terrain. Prioritize accessible transportation options.` : ""}

Create a detailed day-by-day travel plan including attractions, food suggestions, and estimated visit times. 
Each day should include multiple places to visit with timing recommendations.

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
          "time": "Estimated visit time (e.g., '2 hours' or '2 godziny' - match user's language)"
        }
      ]
    }
  ]
}

Important:
- Include ${params.days} days in the "days" array
- Each day should have 3-5 interesting places/activities
- Consider meal times and breaks
- Mix different types of activities (sightseeing, dining, culture, relaxation)
- Be specific with place names and descriptions
- Make it realistic and practical for ${params.travelers} traveler(s)
- ALL descriptions, times, and text must be in the SAME language as the user's notes
${params.notes ? `- Take into account: ${params.notes}` : ""}`;
}

/**
 * Generate relevant tags for filtering and categorization
 * Uses AI to intelligently tag itineraries based on content
 */
async function generateTags(params: {
  destination: string;
  days: number;
  travelers: number;
  notes?: string;
  aiPlan: z.infer<typeof aiResponseSchema>;
  model: OpenRouterModel;
}): Promise<string[]> {
  try {
    const prompt = `You are a travel categorization expert. Analyze this travel itinerary and generate relevant tags for filtering and search.

Destination: ${params.destination}
Duration: ${params.days} days
Travelers: ${params.travelers}
${params.notes ? `Notes: ${params.notes}` : ""}

Itinerary summary: ${params.aiPlan.days.map((d) => d.places.map((p) => p.name).join(", ")).join("; ")}

Generate 5-10 relevant tags that would help users find this itinerary. Include tags for:
1. Location (city, country, region, continent)
2. Duration category (e.g., "weekend", "3-5 days", "week-long", "1-2 days")
3. Trip type (e.g., "city break", "beach holiday", "adventure", "cultural", "romantic", "family-friendly")
4. Group size (e.g., "solo", "couple", "family", "group")
5. Main interests based on activities (e.g., "food", "history", "art", "nature", "shopping", "nightlife", "museums")
6. Season/weather if relevant (e.g., "summer", "winter activities")
7. Budget level if detectable (e.g., "budget", "mid-range", "luxury")

Return ONLY a JSON array of strings (tags should be lowercase, concise, in English):
["tag1", "tag2", "tag3", ...]

Example: ["rome", "italy", "europe", "3-5 days", "city break", "couple", "history", "art", "food", "cultural"]`;

    const tagModels = [
      params.model,
      ...OPENROUTER_BUDGET_FIRST_ORDER.filter((m) => m !== params.model),
    ];
    let completion;
    let usedModel: string | null = null;
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
          usedModel = modelId;
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

    // Clean and validate tags
    return tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.toLowerCase().trim())
      .filter((tag) => tag.length > 0 && tag.length < 50)
      .slice(0, 15); // Max 15 tags
  } catch (error) {
    console.error("Tag generation error:", error);
    return generateFallbackTags(params);
  }
}

/**
 * Fallback tag generation when AI fails
 */
function generateFallbackTags(params: {
  destination: string;
  days: number;
  travelers: number;
  notes?: string;
  model?: OpenRouterModel;
}): string[] {
  const tags: string[] = [];

  // Add destination
  tags.push(params.destination.toLowerCase());

  // Add duration category
  if (params.days <= 2) tags.push("weekend", "1-2 days");
  else if (params.days <= 5) tags.push("3-5 days");
  else if (params.days <= 7) tags.push("week-long");
  else tags.push("extended trip");

  // Add traveler type
  if (params.travelers === 1) tags.push("solo");
  else if (params.travelers === 2) tags.push("couple");
  else if (params.travelers <= 4) tags.push("small group");
  else tags.push("group");

  // Extract keywords from notes
  if (params.notes) {
    const keywords = [
      "family",
      "kids",
      "children",
      "adventure",
      "romantic",
      "food",
      "culture",
      "beach",
      "history",
      "art",
      "nature",
      "luxury",
      "budget",
    ];
    keywords.forEach((keyword) => {
      if (params.notes!.toLowerCase().includes(keyword)) {
        tags.push(keyword);
      }
    });
  }

  return tags;
}
