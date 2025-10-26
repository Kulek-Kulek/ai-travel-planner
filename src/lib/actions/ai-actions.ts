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
      } catch {
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // For non-authenticated users, save as draft (won't show in public gallery)
    // For authenticated users, save as published (will show in gallery)
    const isAnonymous = !user?.id;

    const insertData = {
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
      status: isAnonymous ? "draft" : "published", // Drafts for anonymous users
    };

    const { data: savedItinerary, error: dbError } = await supabase
      .from("itineraries")
      .insert(insertData)
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
