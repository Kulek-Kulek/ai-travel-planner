"use server";

/**
 * AI-powered extraction of travel information from natural language.
 * 
 * This is an OPTIONAL enhancement to the regex-based extraction in the form.
 * Use this if you want more accurate parsing at the cost of API calls.
 * 
 * To use this:
 * 1. Import in your form component
 * 2. Call with debouncing (wait 1-2 seconds after user stops typing)
 * 3. Cache results to avoid duplicate API calls
 */

import { openrouter } from "@/lib/openrouter/client";
import { extractionSchema, type ExtractedTravelInfo } from "@/lib/types/extract-travel-info-types";
import { CURRENT_EXTRACTION_MODEL } from "@/lib/config/extraction-models";

/**
 * Extract travel information from a natural language description using AI
 * 
 * @param description - The user's travel description
 * @param model - OpenRouter model to use (default: Claude 3.5 Haiku - fast, cheap, accurate)
 * @returns Extracted travel information
 * 
 * Note: This uses a cheaper model by default. For extraction tasks, expensive models 
 * like Claude Sonnet are overkill. See AI_MODELS_COMPARISON.md for cost analysis.
 */
export async function extractTravelInfoWithAI(
  description: string,
  model: string = CURRENT_EXTRACTION_MODEL
): Promise<ExtractedTravelInfo> {
  // Don't call API for very short descriptions
  if (!description || description.trim().length < 5) {
    return {
      destination: null,
      days: null,
      travelers: null,
      children: null,
      childAges: undefined,
      startDate: null,
      endDate: null,
      hasAccessibilityNeeds: false,
      travelStyle: null,
      interests: [],
    };
  }

  try {
    const prompt = `You are a travel planning assistant. Extract specific travel information from this description and return ONLY valid JSON.

Description: "${description}"

Extract the following information:
1. destination: The specific city, region, or country (e.g., "Paris", "Tokyo", "Italy"). Return null if not clearly specified.
2. days: The number of days for the trip (convert weeks/nights to days). Return null if not mentioned.
3. travelers: The number of adult travelers (age 18+). Interpret "solo" as 1, "couple" as 2, "family of 4" as 4 (assume 2 adults unless children are mentioned). Return null if unclear.
4. children: The number of children under 18. Return null if not mentioned.
5. childAges: Array of children's ages if mentioned (e.g., [14, 16]). Return empty array or omit if not mentioned.
6. startDate: The start date in YYYY-MM-DD format if mentioned. Return null if not specified.
7. endDate: The end date in YYYY-MM-DD format if mentioned. Return null if not specified.
8. hasAccessibilityNeeds: true if wheelchair, accessibility, or mobility needs are mentioned.
9. travelStyle: The travel style (e.g., "luxury", "budget", "adventure", "relaxed"). Return null if not mentioned.
10. interests: Array of interests/activities mentioned (e.g., ["food", "museums", "hiking", "beaches"]).

IMPORTANT: For "week" trips, extract exactly 7 days (not 8). For "first week of July", extract startDate and endDate instead of guessing days.

Be conservative - only extract information that is clearly stated. When in doubt, return null.

Return JSON in this exact format:
{
  "destination": "string or null",
  "days": number or null,
  "travelers": number or null,
  "children": number or null,
  "childAges": [array of numbers],
  "startDate": "string or null",
  "endDate": "string or null",
  "hasAccessibilityNeeds": boolean,
  "travelStyle": "string or null",
  "interests": ["array", "of", "strings"]
}`;

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Strip markdown code blocks if present (```json ... ```)
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      // Remove opening ```json or ```
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, '');
      // Remove closing ```
      cleanedContent = cleanedContent.replace(/\n?```\s*$/, '');
    }

    // Parse JSON response
    const parsed = JSON.parse(cleanedContent);
    
    // Validate with Zod schema
    const validated = extractionSchema.parse(parsed);
    
    console.log("=== AI EXTRACTION SUCCESS ===");
    console.log("Model:", model);
    console.log("Extracted:", JSON.stringify(validated, null, 2));
    console.log("============================");
    
    return validated;
  } catch (error) {
    console.error("=== AI EXTRACTION ERROR ===");
    console.error("Model used:", model);
    console.error("Description:", description);
    console.error("Error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    console.error("==========================");
    
    // Return empty extraction on error (fallback to regex extraction)
    return {
      destination: null,
      days: null,
      travelers: null,
      children: null,
      childAges: undefined,
      startDate: null,
      endDate: null,
      hasAccessibilityNeeds: false,
      travelStyle: null,
      interests: [],
    };
  }
}


