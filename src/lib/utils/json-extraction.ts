/**
 * Utility functions for extracting and parsing JSON from AI responses
 */

/**
 * Robust JSON extraction from AI responses
 * Handles markdown code blocks, extra commentary, and other formatting issues
 * 
 * This is a pure utility function (not a server action) that can be used
 * by any module that needs to parse JSON responses from AI models.
 * 
 * @param content - Raw content from AI response
 * @returns Cleaned JSON string ready for parsing
 * 
 * @example
 * ```typescript
 * const content = completion.choices[0]?.message?.content;
 * const cleanedJSON = extractJSON(content);
 * const parsed = JSON.parse(cleanedJSON);
 * ```
 */
export function extractJSON(content: string): string {
  let cleanedContent = content.trim();
  
  // Step 1: Strip markdown code blocks if present (```json ... ```)
  if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, '');
    cleanedContent = cleanedContent.replace(/\n?```\s*$/, '');
  }
  
  // Step 2: Extract just the JSON object (handle cases where AI adds commentary)
  // Find the first '{' and the last '}' to extract the JSON object
  const firstBrace = cleanedContent.indexOf('{');
  const lastBrace = cleanedContent.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanedContent = cleanedContent.substring(firstBrace, lastBrace + 1);
  }
  
  return cleanedContent;
}

