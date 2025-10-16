'use server';

import { openrouter } from '@/lib/openrouter/client';
import { z } from 'zod';

// Input schema
const generateItinerarySchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  days: z.number().int().positive().max(30),
  travelers: z.number().int().positive().max(20),
  notes: z.string().optional(),
});

// AI response schema matching your PRD
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
  input: z.infer<typeof generateItinerarySchema>
): Promise<ActionResult<z.infer<typeof aiResponseSchema>>> {
  try {
    // 1. Validate input
    const validated = generateItinerarySchema.parse(input);
    
    // 2. Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not configured');
      return { 
        success: false, 
        error: 'AI service is not configured. Please add your OpenRouter API key.' 
      };
    }
    
    // 3. Build prompt
    const prompt = buildPrompt(validated);
    
    // 4. Call AI (server-side only)
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
      return { success: false, error: 'Failed to generate itinerary. Please try again.' };
    }
    
    // 5. Parse and validate AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('AI response parse error:', content);
      return { success: false, error: 'Invalid response from AI. Please try again.' };
    }
    
    const validatedResponse = aiResponseSchema.parse(parsedResponse);
    
    return { success: true, data: validatedResponse };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues);
      return { success: false, error: 'Invalid data provided' };
    }
    
    if (error instanceof Error) {
      // Handle specific AI errors
      if (error.message.includes('rate_limit')) {
        return { success: false, error: 'Rate limit exceeded. Please try again in a moment.' };
      }
      if (error.message.includes('insufficient_quota')) {
        console.error('OpenRouter quota exceeded');
        return { success: false, error: 'AI service temporarily unavailable. Please try again later.' };
      }
      if (error.message.includes('Invalid API key')) {
        console.error('Invalid OpenRouter API key');
        return { success: false, error: 'AI service configuration error. Please contact support.' };
      }
    }
    
    console.error('AI generation error:', error);
    return { success: false, error: 'Failed to generate travel plan. Please try again.' };
  }
}

function buildPrompt(params: z.infer<typeof generateItinerarySchema>): string {
  return `Generate a ${params.days}-day travel itinerary for ${params.destination}.

Number of travelers: ${params.travelers}
${params.notes ? `Additional notes: ${params.notes}` : ''}

IMPORTANT: Detect the language used in the user's notes and respond in that SAME language. If no notes provided or notes are in English, respond in English. Match the user's language for all text content (place names, descriptions, etc.).

Create a detailed day-by-day travel plan including attractions, food suggestions, and estimated visit times. 
Each day should include multiple places to visit with timing recommendations.

Return ONLY a JSON object (no markdown, no extra text) with this EXACT structure:
{
  "city": "${params.destination}",
  "days": [
    {
      "title": "Day 1" (or "Dzień 1" for Polish, etc. - match user's language),
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
${params.notes ? `- Take into account: ${params.notes}` : ''}`;
}

