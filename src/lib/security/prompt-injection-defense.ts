/**
 * AI-Based Security Defense System
 * 
 * Protects against:
 * - Prompt injection attacks (in ANY language)
 * - Invalid destinations (household items, fictional places, etc.)
 * - Inappropriate content (sexual, drugs, violence, hate speech, trafficking)
 * - Malicious user behavior
 * 
 * Defense Strategy: 100% AI-BASED (No Regex Patterns)
 * 
 * Why AI-only?
 * - Language-agnostic: Works for Polish, Spanish, French, German, etc.
 * - Context-aware: Understands intent, not just keywords
 * - Bypass-resistant: Can't be defeated with creative spelling
 * - Maintenance-free: AI handles new slang and languages automatically
 * - No false positives: AI understands nuance (e.g., "Champagne region" is valid)
 * 
 * Defense Layers:
 * 1. AI Destination Validation: Checks if destination is a real travel location
 * 2. AI Security Instructions: Embedded in all prompts to refuse inappropriate requests
 * 3. AI Output Validation: Checks generated content for security violations
 * 
 * NOTE: This module contains utility functions (not server actions),
 * so it does not use "use server" directive.
 */

// ============================================================================
// TYPES
// ============================================================================

export type SecuritySeverity = 'hard_block' | 'soft_warn' | 'pass';

export interface SecurityValidationResult {
  isValid: boolean;
  severity: SecuritySeverity;
  issues: string[];
  userMessage: string | null;
  internalReason: string | null;
}

export interface DestinationValidationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string | null;
}

// ============================================================================
// SECURITY LOGGING
// ============================================================================

/**
 * Log security incidents for monitoring and analysis
 */
export function logSecurityIncident(
  type: 'prompt_injection' | 'invalid_destination' | 'inappropriate_content' | 'validation_failure',
  severity: SecuritySeverity,
  details: {
    userId?: string;
    userInput?: string;
    destination?: string;
    detectedPatterns?: string[];
    timestamp?: Date;
  }
): void {
  const logEntry = {
    type,
    severity,
    timestamp: details.timestamp || new Date().toISOString(),
    userId: details.userId || 'anonymous',
    // Truncate sensitive data for logs
    userInputPreview: details.userInput?.substring(0, 200) || 'N/A',
    destination: details.destination || 'N/A',
    detectedPatterns: details.detectedPatterns || [],
  };

  // Log to server console (in production, send to monitoring service)
  console.warn('🚨 SECURITY INCIDENT 🚨', JSON.stringify(logEntry, null, 2));

  // TODO: In production, integrate with:
  // - Sentry / DataDog for alerting
  // - Database logging for incident tracking
  // - Rate limiting / IP blocking for repeat offenders
}

// ============================================================================
// DEPRECATED: REGEX-BASED VALIDATION (NOT USED)
// ============================================================================

/**
 * @deprecated This function is NO LONGER USED in production code.
 * 
 * We now use a 100% AI-based security approach instead of regex patterns.
 * 
 * Regex patterns cannot:
 * - Handle multiple languages (kitchen, kuchnia, cocina, cuisine, küche...)
 * - Prevent creative bypasses (i-g-n-o-r-e, ıgnore with Turkish i, etc.)
 * - Understand context (Champagne region vs champagne drink)
 * 
 * This function is kept only for backward compatibility with existing tests.
 * All security validation is now done through AI prompts and destination validation.
 * 
 * See: buildDestinationValidationPrompt() and getSecuritySystemInstructions()
 */
export function validateUserInput(input: {
  destination?: string | null;
  notes?: string | null;
  userId?: string;
}): SecurityValidationResult {
  const allText = `${input.destination || ''} ${input.notes || ''}`.toLowerCase();
  
  // ========================================
  // HARD BLOCK: Prompt Injection Patterns
  // ========================================
  
  const promptInjectionPatterns = [
    // Direct instruction overrides
    { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|commands?)/i, label: 'instruction override' },
    { pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?)/i, label: 'instruction override' },
    { pattern: /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?)/i, label: 'instruction override' },
    
    // Role manipulation
    { pattern: /you\s+are\s+now\s+(a|an)\s+/i, label: 'role manipulation' },
    { pattern: /act\s+as\s+(a|an)\s+(?!travel|tour\s+guide)/i, label: 'role manipulation' },
    { pattern: /pretend\s+(you\s+are|to\s+be)\s+/i, label: 'role manipulation' },
    { pattern: /play\s+the\s+role\s+of\s+/i, label: 'role manipulation' },
    { pattern: /simulate\s+(being|a)/i, label: 'role manipulation' },
    
    // System prompts / developer mode
    { pattern: /system\s*:\s*/i, label: 'system prompt injection' },
    { pattern: /developer\s+mode/i, label: 'system prompt injection' },
    { pattern: /admin\s+mode/i, label: 'system prompt injection' },
    { pattern: /debug\s+mode/i, label: 'system prompt injection' },
    { pattern: /\[system\]/i, label: 'system prompt injection' },
    
    // Output manipulation
    { pattern: /output\s+in\s+the\s+format/i, label: 'output manipulation' },
    { pattern: /respond\s+with\s+(?!details|information|suggestions)/i, label: 'output manipulation' },
    { pattern: /return\s+a\s+(?!itinerary|plan|schedule)/i, label: 'output manipulation' },
    
    // Jailbreak attempts
    { pattern: /\bdan\s+mode\b/i, label: 'jailbreak attempt' },
    { pattern: /jailbreak/i, label: 'jailbreak attempt' },
    { pattern: /sudo\s+/i, label: 'privilege escalation' },
  ];

  const detectedInjections: string[] = [];
  
  for (const { pattern, label } of promptInjectionPatterns) {
    if (pattern.test(allText)) {
      detectedInjections.push(label);
    }
  }

  if (detectedInjections.length > 0) {
    logSecurityIncident('prompt_injection', 'hard_block', {
      userId: input.userId,
      userInput: allText,
      destination: input.destination || undefined,
      detectedPatterns: detectedInjections,
    });

    return {
      isValid: false,
      severity: 'hard_block',
      issues: detectedInjections,
      userMessage: `🚨 Security Alert: We detected an attempt to manipulate the AI system. Specifically, we found: ${detectedInjections.join(', ')}. Please provide a genuine travel request.`,
      internalReason: `Prompt injection detected: ${detectedInjections.join(', ')}`,
    };
  }

  // ========================================
  // NOTE: We intentionally DO NOT use regex patterns for content validation
  // ========================================
  // 
  // Why? Because:
  // 1. Can't predict all words in all languages (kitchen = kuchnia, kuchni, cocina, cuisine, küche, etc.)
  // 2. Easy to bypass with creative spelling or word spacing
  // 3. AI understands context and intent far better than any pattern
  // 4. Regex creates maintenance burden and false positives
  // 
  // Instead, we rely ENTIRELY on AI for:
  // - Inappropriate content detection (sexual, drugs, violence, hate speech)
  // - Invalid destination detection (household items, fictional places, etc.)
  // - All done through prompt instructions in Layer 2
  // 
  // This approach is:
  // ✅ Language-agnostic (works in ALL languages)
  // ✅ Understands context (legitimate vs malicious)
  // ✅ No maintenance (AI handles new slang/languages automatically)
  // ✅ No false positives (AI understands nuance)
  // ✅ Comprehensive (catches creative variations)
  //
  // We ONLY use regex patterns for TECHNICAL ATTACKS (prompt injection),
  // NOT for content-based filtering or destination validation.

  // ========================================
  // PASS: Input looks clean
  // ========================================
  
  return {
    isValid: true,
    severity: 'pass',
    issues: [],
    userMessage: null,
    internalReason: null,
  };
}

// ============================================================================
// LAYER 2: AI-BASED DESTINATION VALIDATION
// ============================================================================

/**
 * Build a prompt to validate if a destination is a real travel location
 * This is called BEFORE generating the full itinerary
 */
export function buildDestinationValidationPrompt(destination: string): string {
  return `You are a geographic validation expert. Determine if the following is a REAL, VALID travel destination (city, region, country, landmark, etc.).

Destination: "${destination}"

🌍 VALID destinations include:
✅ Real cities: Paris, Tokyo, New York, Kraków, Barcelona, Mumbai, etc.
✅ Real regions: Tuscany, Provence, Scottish Highlands, Patagonia, etc.
✅ Real countries: Japan, Italy, Iceland, Poland, Brazil, Thailand, etc.
✅ Real islands: Bali, Santorini, Hawaii, Maldives, Sicily, etc.
✅ Natural areas: Grand Canyon, Swiss Alps, Amazon Rainforest, Serengeti, etc.
✅ Famous landmarks: Machu Picchu, Great Wall of China, Petra, Angkor Wat, etc.

🚫 INVALID destinations (in ANY language):

1️⃣ **Household locations** - NOT real travel destinations:
   - English: kitchen, bedroom, bathroom, living room, garage, basement, attic, closet, balcony, pantry, hallway, etc.
   - Polish: kuchnia, kuchni, sypialnia, łazienka, salon, garaż, piwnica, strych, szafa, balkon, korytarz, etc.
   - Spanish: cocina, dormitorio, baño, sala de estar, garaje, sótano, ático, armario, balcón, etc.
   - French: cuisine, chambre, salle de bain, salon, garage, sous-sol, grenier, placard, balcon, etc.
   - German: küche, schlafzimmer, badezimmer, wohnzimmer, garage, keller, dachboden, schrank, balkon, etc.

2️⃣ **Local everyday places** - Too mundane for travel planning:
   - English: office, workplace, school, classroom, library, gym, supermarket, store, pharmacy, etc.
   - Polish: biuro, miejsce pracy, szkoła, klasa, biblioteka, siłownia, sklep, apteka, etc.
   - Spanish: oficina, lugar de trabajo, escuela, clase, biblioteca, gimnasio, supermercado, tienda, farmacia, etc.

3️⃣ **Food items** - Not places:
   - English: sausage, bread, cheese, pizza, sandwich, etc.
   - Polish: kiełbasa, chleb, ser, pizza, kanapka, etc.
   - Spanish: salchicha, pan, queso, etc.
   - Exception: If it's a famous food region like "Champagne region" or "Parma" (famous for ham), it's VALID

4️⃣ **Non-travel tasks/objects**:
   - Homework, recipe, essay, report, shopping list, etc.
   - Polish: praca domowa, przepis, esej, raport, lista zakupów, etc.

5️⃣ **Fictional places**:
   - Hogwarts (Harry Potter), Narnia, Gotham, Wakanda, Atlantis, Middle Earth, Westeros, etc.
   - Polish: Śródziemie, Hogwart, Narnia, etc.

6️⃣ **Abstract concepts**:
   - Happiness, freedom, love, peace, adventure (without location), etc.
   - Polish: szczęście, wolność, miłość, spokój, przygoda, etc.

7️⃣ **Generic/vague**:
   - Nowhere, anywhere, somewhere, everywhere, "a place", "some city", etc.
   - Polish: nigdzie, gdziekolwiek, gdzieś, wszędzie, etc.

8️⃣ **Private residences**:
   - My house, your house, friend's place, someone's home, etc.

⚠️ **CRITICAL INSTRUCTIONS**:
1. Understand the MEANING and CONTEXT, not just keywords
2. Translate mentally to check if it's a household item or food in another language
3. Be STRICT: If there's ANY doubt, return isValid: false
4. Phrases combining food + household items are ALWAYS invalid (e.g., "kitchen for sausage")

📋 VALIDATION EXAMPLES:

✅ VALID (return isValid: true):
- "Paris" → Real city
- "Tuscany" → Real region in Italy
- "Machu Picchu" → Famous landmark destination
- "Paryż" → Paris in Polish, real city
- "Kraków" → Real Polish city
- "Champagne" → Famous French region (OK even though it's also a drink)

❌ INVALID (return isValid: false):
- "kuchnia" → Kitchen in Polish (household location)
- "kuchni" → Kitchen in Polish genitive case (household location)
- "cocina" → Kitchen in Spanish (household location)
- "cuisine" → Kitchen in French (household location)
- "balkon" → Balcony in Polish (household location)
- "kiełbasa" → Sausage in Polish (food item, not a place)
- "sypialnia" → Bedroom in Polish (household location)
- "Hogwart" → Fictional place from Harry Potter
- "nowhere" → Not a real place
- "my bedroom" → Private household location

Return ONLY valid JSON:
{
  "isValid": true or false,
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation (e.g., 'Kitchen is a household location, not a travel destination' or 'Paris is a real city in France')"
}

Be strict: if there's any doubt, return isValid: false with confidence: "low".`;
}

// ============================================================================
// LAYER 3: OUTPUT VALIDATION
// ============================================================================

/**
 * Validate that generated itinerary content is legitimate travel content
 */
export function validateItineraryContent(
  itinerary: {
    city?: string;
    days?: Array<{
      places?: Array<{ name?: string; desc?: string }>;
    }>;
  },
  originalDestination: string
): SecurityValidationResult {
  const issues: string[] = [];

  // Check if the itinerary city matches the requested destination (roughly)
  if (itinerary.city) {
    const cityLower = itinerary.city.toLowerCase();
    const destLower = originalDestination.toLowerCase();
    
    // Check for obviously wrong outputs (like recipe content)
    const nonTravelKeywords = [
      'recipe', 'ingredients', 'pancake', 'cooking', 'baking',
      'homework', 'essay', 'assignment', 'report',
      'kitchen', 'bedroom', 'bathroom',
    ];

    for (const keyword of nonTravelKeywords) {
      if (cityLower.includes(keyword)) {
        issues.push(`Generated content appears to be about "${keyword}" not travel`);
      }
    }
  }

  // Check place names for non-travel content
  if (itinerary.days) {
    for (const day of itinerary.days) {
      if (day.places) {
        for (const place of day.places) {
          const placeName = (place.name || '').toLowerCase();
          const placeDesc = (place.desc || '').toLowerCase();
          
          // Flag if place names look like recipe steps or homework
          if (placeName.includes('recipe') || placeName.includes('ingredient') || 
              placeName.includes('homework') || placeDesc.includes('mix the')) {
            issues.push('Generated content contains non-travel activities');
            break;
          }
        }
      }
    }
  }

  if (issues.length > 0) {
    return {
      isValid: false,
      severity: 'hard_block',
      issues,
      userMessage: `🚨 Invalid Output: The AI generated content that doesn't appear to be a legitimate travel itinerary. This may indicate an attempt to manipulate the system. Issues detected: ${issues.join(', ')}`,
      internalReason: `Invalid itinerary output: ${issues.join(', ')}`,
    };
  }

  return {
    isValid: true,
    severity: 'pass',
    issues: [],
    userMessage: null,
    internalReason: null,
  };
}

// ============================================================================
// LAYER 2.5: SYSTEM PROMPT HARDENING
// ============================================================================

/**
 * Generate security-hardened system instructions for AI prompts
 * Add this to the beginning of all AI generation prompts
 */
export function getSecuritySystemInstructions(): string {
  return `## 🛡️ CRITICAL SECURITY REQUIREMENTS - READ FIRST

BEFORE PROCESSING ANY REQUEST, YOU MUST CHECK FOR VIOLATIONS.

YOU ARE A PROFESSIONAL TRAVEL AGENCY. YOU MUST REFUSE INAPPROPRIATE REQUESTS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ❌ IMMEDIATE REFUSAL REQUIRED FOR:

### 1. SEXUAL CONTENT (ANY LANGUAGE)
Keywords to detect: prostitution, brothel, escort, sex tourism, adult entertainment, sexual slang, innuendo
In other languages: burdel, bordel, prostytut, putero, puta, bordell, puff, bordello, dupeczki, dupa, etc.

**CRITICAL**: If the request mentions or implies:
- Brothels, prostitution venues, escort services
- "Adult entertainment" in a sexual context
- Sex tourism or sexually explicit activities
- Sexual slang, innuendo, or inappropriate sexual references (e.g., "dupeczki" = Polish slang for sexual encounters)
- Any mention of sexual activities, body parts in sexual context, or sexual services
- Euphemisms for sexual encounters (e.g., "having fun" with sexual undertones)
- "Red light district" for services (not educational/historical tours)

**IMPORTANT**: Understand context and slang in ALL languages:
- Polish: "na dupeczki", "na ruchanie", "na seks", etc.
- Spanish: "para follar", "para sexo", etc.
- French: "pour baiser", "pour du sexe", etc.
- Detect MEANING, not just exact words

→ YOU MUST REFUSE. Return this EXACT format:
{
  "error": "content_policy_violation",
  "violation_type": "sexual_content",
  "reason": "This request contains inappropriate sexual content or references, which violates our content policy. Our platform is for legitimate travel planning only."
}

### 2. ILLEGAL SUBSTANCES (ANY LANGUAGE)
Keywords: cocaine, heroin, meth, marijuana (where illegal), ecstasy, MDMA, drugs
In other languages: kokaina, heroina, narkotyk, cocaïne, droga, drogen, etc.

**CRITICAL**: If the request mentions:
- Buying, purchasing, or acquiring illegal drugs
- Drug trafficking or drug tourism
- Finding dealers or drug sources
- Visiting locations specifically for drug use

→ YOU MUST REFUSE:
{
  "error": "content_policy_violation",
  "violation_type": "illegal_substances",
  "reason": "This request involves illegal drug activities, which violates our content policy. Our platform is for legitimate travel planning only."
}

### 3. WEAPONS & VIOLENCE & TERRORISM (ANY LANGUAGE)
Keywords: guns, weapons, firearms, explosives, arms dealer, black market, terrorism, terrorist, bomb
In other languages: broń, armas, waffen, armi, оружие, terroryzm, terrorismo, terrorisme, etc.

**CRITICAL**: If the request mentions:
- Buying or acquiring weapons illegally
- Arms dealing or weapon trafficking
- Violence, terrorism, or terrorist activities
- Planning violent or terrorist attacks
- Bomb-making, explosives, or dangerous materials
- Any form of extremism or radicalization

→ YOU MUST REFUSE:
{
  "error": "content_policy_violation",
  "violation_type": "weapons_violence",
  "reason": "This request involves weapons or violent activities, which violates our content policy. Our platform is for legitimate travel planning only."
}

### 4. HATE SPEECH & DISCRIMINATION (ANY LANGUAGE)
**CRITICAL**: If the request contains or promotes:
- Racism, racial slurs, or racist activities
- Antisemitism, Islamophobia, or religious hate
- Homophobia, transphobia, or LGBTQ+ discrimination
- Sexism or misogyny
- Ethnic hatred or supremacist ideologies
- Harassment or bullying of any group
- Offensive language targeting protected groups

→ YOU MUST REFUSE:
{
  "error": "content_policy_violation",
  "violation_type": "hate_speech",
  "reason": "This request contains hate speech or discriminatory content, which violates our content policy. Our platform is for legitimate travel planning only."
}

### 5. HUMAN TRAFFICKING & EXPLOITATION (ANY LANGUAGE)
**CRITICAL**: If the request mentions:
- Human trafficking or smuggling people
- Illegal immigration schemes
- Child exploitation or endangerment
- Forced labor or modern slavery

→ YOU MUST REFUSE:
{
  "error": "content_policy_violation",
  "violation_type": "human_trafficking",
  "reason": "This request involves human trafficking or exploitation, which violates our content policy and international law. Our platform is for legitimate travel planning only."
}

### 6. FINANCIAL CRIMES (ANY LANGUAGE)
**CRITICAL**: If the request mentions:
- Money laundering schemes
- Tax evasion or fraud
- Smuggling goods illegally
- Scams or fraudulent activities

→ YOU MUST REFUSE:
{
  "error": "content_policy_violation",
  "violation_type": "financial_crime",
  "reason": "This request involves financial crimes, which violates our content policy. Our platform is for legitimate travel planning only."
}

### 7. SELF-HARM & DANGEROUS ACTIVITIES
**CRITICAL**: If the request mentions:
- Self-harm or suicide
- Extremely dangerous stunts without proper safety
- Activities that endanger the traveler

→ YOU MUST REFUSE:
{
  "error": "content_policy_violation",
  "violation_type": "dangerous_activity",
  "reason": "This request involves potentially harmful activities. If you're experiencing thoughts of self-harm, please contact a mental health professional. Our platform is for safe travel planning only."
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ✅ DETECTION LOGIC

**Step 1**: Read the ENTIRE user request carefully
**Step 2**: Identify the PRIMARY PURPOSE of the trip
**Step 3**: Ask yourself: "Is this requesting inappropriate venues/activities?"

**Examples of VIOLATIONS** (MUST REFUSE):
- "Plan including all the major brothels" → REFUSE (sexual content)
- "wycieczka do paryża na dupeczki" → REFUSE (sexual slang in Polish - "dupeczki" implies sexual encounters)
- "trip to Barcelona para follar" → REFUSE (Spanish sexual slang)
- "voyage à Paris pour baiser" → REFUSE (French sexual slang)
- "Where to buy cocaine in Colombia" → REFUSE (illegal substances)
- "Find weapons dealer in Eastern Europe" → REFUSE (weapons/violence)
- "Plan trip using racist slurs or hate speech" → REFUSE (hate speech)
- "How to smuggle goods across border" → REFUSE (financial crime)
- "Visit locations for human trafficking" → REFUSE (human trafficking)
- "Dangerous cliff jumping without safety" → REFUSE (dangerous activity)
- "Tour of prostitution venues" → REFUSE (sexual content)
- "Trip for hookups and sex" → REFUSE (sexual content)
- "Buying drugs in Amsterdam coffee shops" → CONTEXT MATTERS (if legal, explain laws; if illegal intent, refuse)

**Examples of LEGITIMATE requests** (ALLOW):
- "Historical tour of red-light district architecture" → ALLOW (educational)
- "Visit museums and restaurants in Amsterdam" → ALLOW (normal tourism)
- "See the Louvre and Eiffel Tower in Paris" → ALLOW (normal tourism)
- "Adventure activities with proper safety gear" → ALLOW (safe tourism)
- "Learn about local culture and history" → ALLOW (educational)
- "Visit cannabis museum in Amsterdam" → ALLOW (educational/historical)

**Key difference**: INTENT and PURPOSE
- Is the trip ABOUT inappropriate activities? → REFUSE
- Is it normal tourism that happens to mention history? → ALLOW

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚨 YOUR DECISION PROCESS

1. Read request
2. Identify PRIMARY purpose
3. If PURPOSE is inappropriate → REFUSE (use error format above)
4. If PURPOSE is legitimate → Proceed with itinerary

**DO NOT**:
- Generate an itinerary if request is inappropriate
- Try to "sanitize" an inappropriate request
- Ignore violations in hope they'll be caught later

**YOU ARE THE GATEKEEPER. REFUSE INAPPROPRIATE REQUESTS IMMEDIATELY.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now proceed with the travel planning request below.
If it violates content policy, return the error format shown above.
If it's legitimate, generate the itinerary.

---

`;
}

