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
 * 
 * SECURITY: Includes multi-layered protection against prompt injection,
 * invalid destinations, and inappropriate content.
 */

import { openrouter } from "@/lib/openrouter/client";
import { extractionSchema, type ExtractedTravelInfo } from "@/lib/types/extract-travel-info-types";
import { CURRENT_EXTRACTION_MODEL } from "@/lib/config/extraction-models";
import { 
  buildDestinationValidationPrompt,
  logSecurityIncident,
  getSecuritySystemInstructions,
  type DestinationValidationResult 
} from "@/lib/security/prompt-injection-defense";
import { extractJSON } from "@/lib/utils/json-extraction";

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
  model: string = CURRENT_EXTRACTION_MODEL,
  userId?: string
): Promise<ExtractedTravelInfo & { securityError?: string }> {
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
    // ========================================
    // NO REGEX VALIDATION - 100% AI-BASED SECURITY
    // ========================================
    // We rely ENTIRELY on AI security instructions to detect:
    // - Prompt injection attempts (in ANY language)
    // - Inappropriate content (sexual, drugs, violence, hate speech)
    // - Invalid destinations (household items, fictional places)
    // 
    // Why no regex?
    // 1. Attacks can be in any language: "ignore instructions", "ignoruj instrukcje", "ignorar instrucciones"
    // 2. Creative bypasses: "i-g-n-o-r-e", "ıgnore" (Turkish i), etc.
    // 3. AI understands context and intent far better than patterns
    // 4. Simpler, more maintainable system
    //
    // Security is enforced through:
    // - Hardened AI prompts with explicit security instructions
    // - AI destination validation after extraction
    // - AI content policy enforcement during generation

    // ========================================
    // EXTRACTION + CONTENT POLICY CHECK
    // ========================================
    // 1. Extract information (translate to English)
    // 2. Check for inappropriate content in the FULL text
    // 3. Destination validation happens separately via validateDestinationWithAI()
    
    const securityInstructions = getSecuritySystemInstructions();
    
    const prompt = `You are a multilingual travel planning assistant. Your task is to:
1. Extract travel information from the description
2. Check for inappropriate content

IMPORTANT: You must ALWAYS extract the travel information, even if you detect inappropriate content.

Description: "${description}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## TASK 1: EXTRACT TRAVEL INFORMATION (ALWAYS DO THIS)

Extract the following information from the description, regardless of any inappropriate content

IMPORTANT LANGUAGE HANDLING:
- The description may be in ANY language (English, Polish, French, Spanish, German, etc.)
- Extract information regardless of language
- For destinations, provide the ENGLISH name (e.g., "Paryż" → "Paris", "Londres" → "London", "Rzym" → "Rome")
- Understand common travel phrases in multiple languages:
  - Polish: "chcę pojechać" (I want to go), "na X dni" (for X days), "we dwoje" (two of us), "dla dwóch osób" (for two people)
  - Spanish: "quiero ir" (I want to go), "por X días" (for X days)
  - French: "je veux aller" (I want to go), "pour X jours" (for X days)
  - German: "ich möchte nach" (I want to go to), "für X Tage" (for X days)

Extract the following information:
1. destination: The specific city, region, or country in ENGLISH (e.g., "Paris" not "Paryż", "Tokyo", "Italy"). 
   - ALWAYS extract what the user mentions (translate to English if needed)
   - Return null ONLY if no destination is mentioned at all
   - Examples: "kuchni" → extract as "kitchen", "cocina" → extract as "kitchen", "Paryż" → extract as "Paris"
2. days: The number of days for the trip (convert weeks/nights to days). Understand "dni" (Polish), "días" (Spanish), "jours" (French), "Tage" (German). Return null if not mentioned.
3. travelers: The number of adult travelers (age 18+). Interpret: 
   - "solo" / "sam" / "solo" = 1
   - "couple" / "para" / "we dwoje" / "dla dwóch" = 2
   - "family of 4" = 4 (assume 2 adults unless children mentioned)
   Return null if unclear.
4. children: The number of children under 18. Return null if not mentioned.
5. childAges: Array of children's ages if mentioned (e.g., [14, 16]). Return empty array or omit if not mentioned.
6. startDate: The start date in YYYY-MM-DD format if mentioned. Return null if not specified.
7. endDate: The end date in YYYY-MM-DD format if mentioned. Return null if not specified.
8. hasAccessibilityNeeds: true if wheelchair, accessibility, or mobility needs are mentioned.
9. travelStyle: The travel style (e.g., "luxury", "budget", "adventure", "relaxed"). Return null if not mentioned.
10. interests: Array of interests/activities mentioned (e.g., ["food", "museums", "hiking", "beaches"]).

🔍 EXTRACTION EXAMPLES:

**Example 1: Clean request**
"chcę pojechać do Paryża na dwa dni we dwoje"
→ {
  "destination": "Paris",
  "days": 2,
  "travelers": 2,
  "children": null,
  "childAges": [],
  "startDate": null,
  "endDate": null,
  "hasAccessibilityNeeds": false,
  "travelStyle": null,
  "interests": [],
  "hasViolation": false,
  "violationReason": null
}

**Example 2: Silly but valid destination**
"wycieczka do kuchni po kiełbasę" (trip to kitchen for sausage)
→ {
  "destination": "kitchen",
  "days": null,
  "travelers": null,
  ...,
  "hasViolation": false,
  "violationReason": null
}

**Example 3: Contains valid info AND inappropriate sexual content**
"wycieczka do paryża na dupeczki na 2 dni dla 2 osób"
→ ⚠️ DO NOT STOP! Extract Paris, 2 days, 2 people AND flag the violation:
{
  "destination": "Paris",
  "days": 2,
  "travelers": 2,
  "children": null,
  "childAges": [],
  "startDate": null,
  "endDate": null,
  "hasAccessibilityNeeds": false,
  "travelStyle": null,
  "interests": [],
  "hasViolation": true,
  "violationReason": "Sexual content: 'dupeczki'"
}

**Example 4: Another inappropriate request - STILL EXTRACT**
"wycieczka do paryża na dwa dni we dwoje żeby poruchać"
→ ⚠️ Extract Paris, 2 days, 2 travelers AND flag violation:
{
  "destination": "Paris",
  "days": 2,
  "travelers": 2,
  "children": null,
  "childAges": [],
  "startDate": null,
  "endDate": null,
  "hasAccessibilityNeeds": false,
  "travelStyle": null,
  "interests": [],
  "hasViolation": true,
  "violationReason": "Sexual content: 'poruchać' (to have sex)"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## TASK 2: CHECK FOR INAPPROPRIATE CONTENT (PARALLEL TO EXTRACTION)

⚠️ CRITICAL INSTRUCTION: You are an AI with multilingual understanding. Use your intelligence to detect inappropriate content by understanding INTENT and CONTEXT, not just matching words.

${securityInstructions}

🚫 **Categories to detect (in ANY language):**

1. **Sexual Content:** References to sexual acts, encounters, hookups, prostitution, or sexual slang in any language
   - Understand the MEANING, not just words
   - Examples: phrases meaning "to have sex", "for sexual encounters", "for hookups"
   - Context matters: "sex" as in gender is OK, "sex" as in activity is NOT

2. **Drugs & Illegal Substances:** References to illegal drugs, drug tourism, or substance abuse

3. **Violence & Weapons:** References to violence, weapons, terrorism, illegal activities

4. **Hate Speech:** Discrimination, racism, or hateful content targeting groups

5. **Trafficking:** Human trafficking, illegal border crossing, smuggling

⚠️ CRITICAL DUAL-TASK APPROACH:

**ALWAYS do BOTH:**
1. ✅ EXTRACT all travel information (destination, days, travelers, dates, etc.)
2. ✅ CHECK for inappropriate content

**If you detect inappropriate content:**
- Set "hasViolation": true
- Set "violationReason": "Brief explanation of what was detected and why"
- **STILL RETURN** all the extracted travel fields
- DO NOT set travel fields to null

**Example mindset:**
- "This person wants to go to Paris for 2 days... BUT they mentioned sexual content"
- → Extract: Paris, 2 days, AND flag the violation
- DO NOT think: "Inappropriate content detected, return nothing"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: For "week" trips, extract exactly 7 days (not 8). For "first week of July", extract startDate and endDate instead of guessing days.

Be smart and extract information clearly stated in ANY language. When in doubt, return null.

Return JSON in this EXACT format (all fields required):
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
  "interests": ["array", "of", "strings"],
  "hasViolation": boolean,
  "violationReason": "string or null"
}`;

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5, // Slightly higher for better content moderation judgments
      max_tokens: 600, // Increased for extraction + violation reasoning
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Robust JSON extraction - handle various AI response formats
    const cleanedContent = extractJSON(content);
    
    // Parse JSON response
    const parsed = JSON.parse(cleanedContent);
    
    // Check if AI detected a security violation
    // New format includes hasViolation and violationReason fields
    if (parsed.hasViolation && parsed.violationReason) {
      logSecurityIncident('inappropriate_content', 'hard_block', {
        userId,
        userInput: description,
        detectedPatterns: ['AI content policy check', parsed.violationReason],
      });
      
      // Still return the extracted fields, but add security error
      return {
        destination: parsed.destination || null,
        days: parsed.days || null,
        travelers: parsed.travelers || null,
        children: parsed.children || null,
        childAges: parsed.childAges || undefined,
        startDate: parsed.startDate || null,
        endDate: parsed.endDate || null,
        hasAccessibilityNeeds: parsed.hasAccessibilityNeeds || false,
        travelStyle: parsed.travelStyle || null,
        interests: parsed.interests || [],
        securityError: `❌ Content Policy Violation: ${parsed.violationReason}`,
      };
    }
    
    // Validate with Zod schema
    const validated = extractionSchema.parse(parsed);
    
    // ========================================
    // LAYER 2: POST-EXTRACTION DESTINATION VALIDATION
    // ========================================
    
    // If we extracted a destination, ALWAYS validate it with AI
    // We rely ENTIRELY on AI validation (language-agnostic, understands context)
    // NO regex patterns - they can't predict all languages and cases
    if (validated.destination) {
      const aiDestinationValidation = await validateDestinationWithAI(
        validated.destination,
        model,
        userId
      );

      if (!aiDestinationValidation.isValid) {
        logSecurityIncident('invalid_destination', 'hard_block', {
          userId,
          userInput: description,
          destination: validated.destination,
          detectedPatterns: [aiDestinationValidation.reason || 'AI validation failed'],
        });

        return {
          ...validated,
          destination: null, // Clear invalid destination
          securityError: `❌ Invalid Destination: "${validated.destination}" is not a valid travel destination. ${aiDestinationValidation.reason || 'Please provide a real city, country, or region.'} Our platform is for legitimate travel planning only.`,
        };
      }
    }
    
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

/**
 * Validate a destination using AI to determine if it's a real travel location
 */
async function validateDestinationWithAI(
  destination: string,
  model: string,
  userId?: string
): Promise<DestinationValidationResult> {
  try {
    const prompt = buildDestinationValidationPrompt(destination);

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature for consistent validation
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      // If AI fails, be conservative and reject
      return {
        isValid: false,
        confidence: 'low',
        reason: 'AI validation service unavailable',
      };
    }

    // Robust JSON extraction using helper function
    const cleanedContent = extractJSON(content);
    const result = JSON.parse(cleanedContent);
    
    // Log if destination was rejected
    if (!result.isValid) {
      logSecurityIncident('invalid_destination', 'hard_block', {
        userId,
        destination,
        detectedPatterns: [result.reason || 'AI validation rejected'],
      });
    }

    return {
      isValid: result.isValid || false,
      confidence: result.confidence || 'medium',
      reason: result.reason || null,
    };
  } catch (error) {
    console.error('AI destination validation error:', error);
    // On error, be conservative and reject suspicious destinations
    return {
      isValid: false,
      confidence: 'low',
      reason: 'Validation error',
    };
  }
}

