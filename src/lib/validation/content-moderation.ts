/**
 * Content Moderation for Travel Itinerary Inputs (Basic Pattern Matching)
 * 
 * Prevents:
 * - Prompt injection attacks (language-agnostic patterns)
 * - Inappropriate/offensive content (basic patterns)
 * - Non-travel related inputs (English only - limited)
 * - Abuse and spam
 * 
 * IMPORTANT: This provides BASIC validation using regex patterns.
 * For robust MULTILINGUAL content validation, use the AI-based validator
 * in ai-content-validator.ts which can detect attacks in any language.
 * 
 * This module is used as a fast first-pass filter and fallback.
 */

export interface ContentValidationResult {
  valid: boolean;
  error?: string;
  field?: 'destination' | 'notes';
}

/**
 * Prompt injection patterns to detect and block
 * These patterns attempt to manipulate AI behavior
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,
  /forget\s+(all\s+)?(previous|above|prior)\s+instructions?/i,
  /new\s+instructions?:/i,
  /system\s*(prompt|message|role):/i,
  /you\s+are\s+(now|a)\s+(assistant|bot|ai)\s+(that|who)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(a|an)/i,
  /roleplay\s+as/i,
  /simulate\s+(being|a)/i,
  /override\s+(previous|system)\s+(instructions?|settings?)/i,
  /\[SYSTEM\]/i,
  /\<\|system\|\>/i,
  /\<\|im_start\|\>/i,
  /tell\s+me\s+a\s+(recipe|joke|story|poem)/i,
  /how\s+to\s+(make|cook|prepare)\s+(pancakes?|cake|food)/i,
  /write\s+(a\s+)?(recipe|poem|song|story)/i,
];

/**
 * Offensive/inappropriate content patterns
 * Block slurs, sexual content, and abuse
 */
const INAPPROPRIATE_PATTERNS = [
  // Sexual content indicators
  /\b(sex|porn|xxx|nude|naked|erotic)\b/i,
  /\b(sexual|sexuality|intercourse)\b/i,
  
  // Common offensive terms (partial list - extend as needed)
  /\b(fuck|shit|ass|bitch|bastard|damn)\s*(you|off|it)?/i,
  /\b(idiot|stupid|dumb|moron|retard)(ed)?\b/i,
  
  // Hate speech indicators
  /\b(hate|kill|murder|die)\s+(you|them|all)/i,
  /\b(racist|sexist|homophobic|transphobic)\b/i,
  
  // Spam indicators
  /\b(viagra|cialis|casino|lottery|prize)\b/i,
  /\b(click\s+here|buy\s+now|limited\s+offer)\b/i,
];

/**
 * Non-travel related patterns that suggest abuse (ENGLISH ONLY - LIMITED USE)
 * NOTE: These only work for English. For multilingual support, use AI validation.
 * These indicate the user is not creating a travel plan
 */
const NON_TRAVEL_PATTERNS_ENGLISH = [
  /\b(recipe|ingredient|cooking|oven|stove)\b/i,
  /\b(pancake|cake|cookie|bread)\s+(recipe|preparation)/i,
  /\b(programming|code|function|variable)\b/i,
  /\b(homework|assignment|essay|thesis)\b/i,
];

/**
 * Valid destination patterns - must contain letters and optionally spaces/commas/hyphens
 * Real places typically have these characteristics
 */
const VALID_DESTINATION_PATTERN = /^[a-zA-ZÀ-ÿ\s,.\-'()]+$/;

/**
 * Suspicious destination patterns that are clearly not places
 */
const INVALID_DESTINATION_PATTERNS = [
  /\b(kitchen|bedroom|bathroom|office|garage)\b/i,
  /\b(home|house|apartment)\b/i,
  /\b(nowhere|anywhere|somewhere)\b/i,
  /^\d+$/,  // Just numbers
  /^[!@#$%^&*()]+$/,  // Just special characters
];

/**
 * Check if text contains prompt injection attempts
 */
function containsPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if text contains inappropriate content
 */
function containsInappropriateContent(text: string): boolean {
  return INAPPROPRIATE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if text is clearly non-travel related (spam/abuse)
 * NOTE: Only works for English content. Use AI validation for multilingual support.
 */
function isNonTravelContentEnglish(text: string): boolean {
  // If ANY non-travel patterns match, it's suspicious
  // This is a quick check for obvious English abuse cases
  return NON_TRAVEL_PATTERNS_ENGLISH.some(pattern => pattern.test(text));
}

/**
 * Validate destination field
 */
export function validateDestination(destination: string): ContentValidationResult {
  const trimmed = destination.trim();
  
  // Check for empty or too short
  if (trimmed.length < 2) {
    return {
      valid: false,
      error: 'Destination is too short',
      field: 'destination',
    };
  }

  // Check for prompt injection
  if (containsPromptInjection(trimmed)) {
    return {
      valid: false,
      error: 'Invalid destination format. Please enter a real travel destination.',
      field: 'destination',
    };
  }

  // Check for inappropriate content
  if (containsInappropriateContent(trimmed)) {
    return {
      valid: false,
      error: 'Destination contains inappropriate content. Please enter a real travel destination.',
      field: 'destination',
    };
  }

  // Check against invalid destination patterns
  for (const pattern of INVALID_DESTINATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Please enter a real travel destination (city, country, or region).',
        field: 'destination',
      };
    }
  }

  // Check if it matches valid destination format
  if (!VALID_DESTINATION_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Destination contains invalid characters. Please use only letters, spaces, and basic punctuation.',
      field: 'destination',
    };
  }

  // Check if it's suspiciously non-travel (English only - basic check)
  // For comprehensive multilingual validation, use AI validator
  if (isNonTravelContentEnglish(trimmed)) {
    return {
      valid: false,
      error: 'Please enter a real travel destination.',
      field: 'destination',
    };
  }

  return { valid: true };
}

/**
 * Validate notes field (optional field with additional context)
 */
export function validateNotes(notes: string | undefined): ContentValidationResult {
  // Notes are optional
  if (!notes || notes.trim().length === 0) {
    return { valid: true };
  }

  const trimmed = notes.trim();

  // Check for prompt injection
  if (containsPromptInjection(trimmed)) {
    return {
      valid: false,
      error: 'Notes contain invalid instructions. Please only include travel preferences and requirements.',
      field: 'notes',
    };
  }

  // Check for inappropriate content
  if (containsInappropriateContent(trimmed)) {
    return {
      valid: false,
      error: 'Notes contain inappropriate content. Please keep your notes professional and travel-related.',
      field: 'notes',
    };
  }

  // Check if notes are clearly non-travel related (English only - basic check)
  // For comprehensive multilingual validation, use AI validator
  if (isNonTravelContentEnglish(trimmed)) {
    return {
      valid: false,
      error: 'Notes should contain travel preferences, not unrelated content. Please describe your travel needs.',
      field: 'notes',
    };
  }

  return { valid: true };
}

/**
 * Validate all itinerary input content
 * Main validation function called before AI generation
 */
export function validateItineraryContent(input: {
  destination: string;
  notes?: string;
}): ContentValidationResult {
  // Validate destination
  const destinationResult = validateDestination(input.destination);
  if (!destinationResult.valid) {
    return destinationResult;
  }

  // Validate notes
  const notesResult = validateNotes(input.notes);
  if (!notesResult.valid) {
    return notesResult;
  }

  return { valid: true };
}

/**
 * Sanitize input by removing potential injection attempts
 * Used as a fallback, but validation should catch these first
 */
export function sanitizeInput(text: string): string {
  let sanitized = text;
  
  // Remove common injection patterns
  sanitized = sanitized.replace(/ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, '');
  sanitized = sanitized.replace(/system\s*(prompt|message|role):/gi, '');
  sanitized = sanitized.replace(/\[SYSTEM\]/gi, '');
  
  return sanitized.trim();
}

