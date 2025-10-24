/**
 * Simple language detection utility
 * 
 * Detects if text is primarily English or another language.
 * Used to decide whether to use regex or AI extraction.
 */

/**
 * Detect if text is primarily in English
 * 
 * This is a simple heuristic based on common English words.
 * Not 100% accurate but good enough for form optimization.
 */
export function isEnglishText(text: string): boolean {
  if (!text || text.trim().length < 10) {
    return true; // Default to English for very short text
  }

  const lowerText = text.toLowerCase();
  
  // Common English words in travel context
  const englishIndicators = [
    // Common words
    'the', 'and', 'for', 'with', 'to', 'in', 'of', 'my', 'we', 'our',
    // Travel words
    'trip', 'travel', 'traveling', 'travelling', 'visit', 'visiting',
    'going', 'plan', 'planning', 'vacation', 'holiday',
    // Time words
    'day', 'days', 'week', 'weeks', 'month', 'weekend',
    // People words
    'wife', 'husband', 'partner', 'family', 'kids', 'children',
    // Pronouns
    'i', 'me', 'us', 'we',
  ];

  // Non-English indicators (words that suggest another language)
  const nonEnglishIndicators = [
    // Polish
    'jadę', 'żoną', 'żona', 'dni', 'dzień', 'mąż', 'dzieci',
    // Spanish
    'viajo', 'esposa', 'marido', 'días', 'día', 'familia',
    // German
    'reise', 'frau', 'mann', 'tage', 'tag', 'kinder',
    // French
    'voyage', 'femme', 'mari', 'jours', 'jour', 'enfants',
    // Italian
    'viaggio', 'moglie', 'marito', 'giorni', 'giorno',
    // Portuguese
    'viagem', 'esposa', 'marido', 'dias', 'dia',
  ];

  // Count English indicators
  let englishCount = 0;
  for (const word of englishIndicators) {
    if (lowerText.includes(word)) {
      englishCount++;
    }
  }

  // Count non-English indicators
  let nonEnglishCount = 0;
  for (const word of nonEnglishIndicators) {
    if (lowerText.includes(word)) {
      nonEnglishCount++;
    }
  }

  // If we found clear non-English indicators, return false
  if (nonEnglishCount > 0) {
    return false;
  }

  // If we found at least 2 English indicators, consider it English
  // This helps with mixed language or short text
  return englishCount >= 2;
}

/**
 * Get language hint message for non-English text
 */
export function getNonEnglishHint(detectedAsNonEnglish: boolean): string | null {
  if (!detectedAsNonEnglish) return null;

  return "We detected you might be writing in another language. For the best results with automatic extraction, please describe your trip in English. Or upgrade to Premium for multilingual AI support!";
}




