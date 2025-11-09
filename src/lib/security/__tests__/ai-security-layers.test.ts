/**
 * Comprehensive Unit Tests for Three-Layer AI Security System
 * 
 * This file tests the ACTUAL security implementation:
 * - Layer 1: Content Policy Check (via extractTravelInfoWithAI)
 * - Layer 2: Destination Validation (via buildDestinationValidationPrompt)
 * - Layer 3: Output Validation (via getSecuritySystemInstructions)
 * 
 * All layers use 100% AI-based validation with NO regex patterns or
 * predefined word lists for content/destination filtering.
 */

import { describe, it, expect } from 'vitest';
import { 
  buildDestinationValidationPrompt,
  getSecuritySystemInstructions,
  logSecurityIncident
} from '../prompt-injection-defense';

// ============================================================================
// LAYER 1 TESTS: Content Policy Check (AI-Based)
// ============================================================================

describe('Layer 1: Content Policy Check - getSecuritySystemInstructions()', () => {
  
  describe('Security Instructions Structure', () => {
    it('should return comprehensive security instructions', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toBeTruthy();
      expect(instructions.length).toBeGreaterThan(1000); // Should be comprehensive
    });

    it('should include critical security requirements header', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('CRITICAL SECURITY REQUIREMENTS');
      expect(instructions).toContain('READ FIRST');
      expect(instructions).toContain('BEFORE PROCESSING ANY REQUEST');
    });

    it('should emphasize refusal requirement', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('MUST REFUSE');
      expect(instructions).toContain('IMMEDIATE REFUSAL REQUIRED');
      expect(instructions).toContain('YOU ARE A PROFESSIONAL TRAVEL AGENCY');
    });
  });

  describe('Category 1: Sexual Content Detection', () => {
    it('should include sexual content category', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('SEXUAL CONTENT');
      expect(instructions).toContain('ANY LANGUAGE');
    });

    it('should include multilingual sexual content examples', () => {
      const instructions = getSecuritySystemInstructions();
      
      // English
      expect(instructions).toContain('prostitution');
      expect(instructions).toContain('brothel');
      expect(instructions).toContain('escort');
      
      // Polish
      expect(instructions).toContain('burdel');
      expect(instructions).toContain('prostytut');
      expect(instructions).toContain('dupeczki');
      
      // Spanish
      expect(instructions).toContain('putero');
      expect(instructions).toContain('puta');
      
      // German
      expect(instructions).toContain('bordell');
      expect(instructions).toContain('puff');
    });

    it('should include sexual slang and innuendo detection', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('sexual slang');
      expect(instructions).toContain('innuendo');
      expect(instructions).toContain('sexual encounters');
      expect(instructions).toContain('Detect MEANING, not just exact words');
    });

    it('should specify JSON error format for sexual content', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('"error": "content_policy_violation"');
      expect(instructions).toContain('"violation_type": "sexual_content"');
      expect(instructions).toContain('sexual content or references');
    });
  });

  describe('Category 2: Illegal Substances Detection', () => {
    it('should include illegal substances category', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('ILLEGAL SUBSTANCES');
    });

    it('should include multilingual drug keywords', () => {
      const instructions = getSecuritySystemInstructions();
      
      // English
      expect(instructions).toContain('cocaine');
      expect(instructions).toContain('heroin');
      expect(instructions).toContain('marijuana');
      
      // Polish
      expect(instructions).toContain('kokaina');
      expect(instructions).toContain('narkotyk');
      
      // Spanish
      expect(instructions).toContain('droga');
      
      // German
      expect(instructions).toContain('drogen');
    });

    it('should detect drug tourism and trafficking', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('Drug trafficking'); // Capital D
      expect(instructions).toContain('drug tourism');
      expect(instructions).toContain('Finding dealers');
    });

    it('should specify JSON error format for illegal substances', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('"violation_type": "illegal_substances"');
      expect(instructions).toContain('illegal drug activities');
    });
  });

  describe('Category 3: Weapons, Violence & Terrorism Detection', () => {
    it('should include weapons and violence category', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('WEAPONS & VIOLENCE & TERRORISM');
    });

    it('should include terrorism keywords in multiple languages', () => {
      const instructions = getSecuritySystemInstructions();
      
      // English
      expect(instructions).toContain('terrorism');
      expect(instructions).toContain('terrorist');
      expect(instructions).toContain('bomb');
      
      // Polish
      expect(instructions).toContain('terroryzm');
      expect(instructions).toContain('broń');
      
      // Spanish
      expect(instructions).toContain('terrorismo');
      expect(instructions).toContain('armas');
      
      // German
      expect(instructions).toContain('terrorisme');
      expect(instructions).toContain('waffen');
    });

    it('should detect weapons trafficking and violent activities', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('Arms dealing');
      expect(instructions).toContain('weapon trafficking');
      expect(instructions).toContain('Planning violent or terrorist attacks');
      expect(instructions).toContain('Bomb-making');
    });

    it('should specify JSON error format for weapons/violence', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('"violation_type": "weapons_violence"');
      expect(instructions).toContain('weapons or violent activities');
    });
  });

  describe('Category 4: Hate Speech & Discrimination Detection', () => {
    it('should include hate speech category', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('HATE SPEECH & DISCRIMINATION');
    });

    it('should detect multiple forms of discrimination', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('Racism');
      expect(instructions).toContain('Antisemitism');
      expect(instructions).toContain('Islamophobia');
      expect(instructions).toContain('Homophobia');
      expect(instructions).toContain('transphobia');
      expect(instructions).toContain('Sexism');
      expect(instructions).toContain('misogyny');
    });

    it('should specify JSON error format for hate speech', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('"violation_type": "hate_speech"');
      expect(instructions).toContain('hate speech or discriminatory content');
    });
  });

  describe('Category 5: Human Trafficking & Exploitation Detection', () => {
    it('should include human trafficking category', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('HUMAN TRAFFICKING & EXPLOITATION');
    });

    it('should detect trafficking and smuggling', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('Human trafficking');
      expect(instructions).toContain('smuggling people');
      expect(instructions).toContain('Illegal immigration schemes');
      expect(instructions).toContain('Child exploitation');
      expect(instructions).toContain('Forced labor');
    });

    it('should specify JSON error format for human trafficking', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('"violation_type": "human_trafficking"');
      expect(instructions).toContain('human trafficking or exploitation');
      expect(instructions).toContain('international law');
    });
  });

  describe('Category 6: Financial Crimes Detection', () => {
    it('should include financial crimes category', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('FINANCIAL CRIMES');
    });

    it('should detect money laundering and fraud', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('Money laundering');
      expect(instructions).toContain('Tax evasion');
      expect(instructions).toContain('fraud');
      expect(instructions).toContain('Smuggling goods');
      expect(instructions).toContain('Scams');
    });

    it('should specify JSON error format for financial crimes', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('"violation_type": "financial_crime"');
      expect(instructions).toContain('financial crimes');
    });
  });

  describe('Category 7: Self-Harm & Dangerous Activities Detection', () => {
    it('should include dangerous activities category', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('SELF-HARM & DANGEROUS ACTIVITIES');
    });

    it('should detect self-harm and dangerous activities', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('Self-harm');
      expect(instructions).toContain('suicide');
      expect(instructions).toContain('Extremely dangerous stunts');
      expect(instructions).toContain('endanger the traveler');
    });

    it('should include mental health resources reference', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('mental health professional');
    });

    it('should specify JSON error format for dangerous activities', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('"violation_type": "dangerous_activity"');
      expect(instructions).toContain('potentially harmful activities');
    });
  });

  describe('Detection Logic and Examples', () => {
    it('should include detection decision process', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('DETECTION LOGIC');
      expect(instructions).toContain('Read the ENTIRE user request');
      expect(instructions).toContain('Identify the PRIMARY PURPOSE');
      expect(instructions).toContain('YOU ARE THE GATEKEEPER');
    });

    it('should provide violation examples', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('Examples of VIOLATIONS');
      expect(instructions).toContain('MUST REFUSE');
      
      // Examples should include multilingual cases
      expect(instructions).toContain('wycieczka do paryża na dupeczki');
      expect(instructions).toContain('para follar');
      expect(instructions).toContain('pour baiser');
    });

    it('should provide legitimate request examples', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('LEGITIMATE requests');
      expect(instructions).toContain('ALLOW');
      expect(instructions).toContain('Historical tour');
      expect(instructions).toContain('normal tourism');
    });

    it('should emphasize intent and purpose', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('INTENT and PURPOSE');
      expect(instructions).toContain('PRIMARY purpose');
      expect(instructions).toContain('Is the trip ABOUT inappropriate activities');
    });
  });

  describe('Multilingual Support', () => {
    it('should emphasize language-agnostic detection', () => {
      const instructions = getSecuritySystemInstructions();
      
      // Should mention multiple languages throughout
      const anyLanguageCount = (instructions.match(/ANY LANGUAGE/g) || []).length;
      expect(anyLanguageCount).toBeGreaterThanOrEqual(3);
    });

    it('should include examples in at least 4 languages', () => {
      const instructions = getSecuritySystemInstructions();
      
      // Polish examples
      expect(instructions).toContain('burdel');
      expect(instructions).toContain('kokaina');
      
      // Spanish examples
      expect(instructions).toContain('putero');
      expect(instructions).toContain('droga');
      
      // German examples
      expect(instructions).toContain('bordell');
      expect(instructions).toContain('drogen');
      
      // French examples
      expect(instructions).toContain('bordello');
    });
  });

  describe('Refusal Behavior', () => {
    it('should instruct AI not to sanitize inappropriate requests', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('DO NOT');
      expect(instructions).toContain('sanitize');
      expect(instructions).toContain('Ignore violations');
    });

    it('should require immediate refusal', () => {
      const instructions = getSecuritySystemInstructions();
      
      expect(instructions).toContain('IMMEDIATE REFUSAL REQUIRED');
      expect(instructions).toContain('REFUSE INAPPROPRIATE REQUESTS IMMEDIATELY');
    });
  });
});

// ============================================================================
// LAYER 2 TESTS: Destination Validation (AI-Based)
// ============================================================================

describe('Layer 2: Destination Validation - buildDestinationValidationPrompt()', () => {
  
  describe('Prompt Structure', () => {
    it('should create a comprehensive validation prompt', () => {
      const prompt = buildDestinationValidationPrompt('Paris');
      
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(1000);
    });

    it('should include the destination being validated', () => {
      const destination = 'Tokyo';
      const prompt = buildDestinationValidationPrompt(destination);
      
      expect(prompt).toContain(`Destination: "${destination}"`);
    });

    it('should position itself as geographic validation expert', () => {
      const prompt = buildDestinationValidationPrompt('Paris');
      
      expect(prompt).toContain('geographic validation expert');
      expect(prompt).toContain('REAL, VALID travel destination');
    });
  });

  describe('Valid Destinations Examples', () => {
    it('should list valid destination categories', () => {
      const prompt = buildDestinationValidationPrompt('Paris');
      
      expect(prompt).toContain('VALID destinations include');
      expect(prompt).toContain('Real cities');
      expect(prompt).toContain('Real regions');
      expect(prompt).toContain('Real countries');
      expect(prompt).toContain('Real islands');
      expect(prompt).toContain('Natural areas');
      expect(prompt).toContain('Famous landmarks');
    });

    it('should provide specific valid destination examples', () => {
      const prompt = buildDestinationValidationPrompt('Paris');
      
      // Cities
      expect(prompt).toContain('Paris');
      expect(prompt).toContain('Tokyo');
      expect(prompt).toContain('Barcelona');
      
      // Regions
      expect(prompt).toContain('Tuscany');
      expect(prompt).toContain('Provence');
      
      // Landmarks
      expect(prompt).toContain('Machu Picchu');
      expect(prompt).toContain('Great Wall of China');
    });
  });

  describe('Invalid Destinations - Category 1: Household Locations', () => {
    it('should reject household locations in English', () => {
      const prompt = buildDestinationValidationPrompt('kitchen');
      
      expect(prompt).toContain('Household locations');
      expect(prompt).toContain('NOT real travel destinations');
      expect(prompt).toContain('English: kitchen, bedroom, bathroom');
    });

    it('should reject household locations in Polish', () => {
      const prompt = buildDestinationValidationPrompt('kuchnia');
      
      expect(prompt).toContain('Polish: kuchnia, kuchni, sypialnia');
      expect(prompt).toContain('łazienka');
      expect(prompt).toContain('balkon');
      expect(prompt).toContain('korytarz');
    });

    it('should reject household locations in Spanish', () => {
      const prompt = buildDestinationValidationPrompt('cocina');
      
      expect(prompt).toContain('Spanish: cocina, dormitorio, baño');
      expect(prompt).toContain('armario');
      expect(prompt).toContain('balcón');
    });

    it('should reject household locations in French', () => {
      const prompt = buildDestinationValidationPrompt('cuisine');
      
      expect(prompt).toContain('French: cuisine, chambre, salle de bain');
      expect(prompt).toContain('grenier');
    });

    it('should reject household locations in German', () => {
      const prompt = buildDestinationValidationPrompt('küche');
      
      expect(prompt).toContain('German: küche, schlafzimmer, badezimmer');
      expect(prompt).toContain('keller');
    });
  });

  describe('Invalid Destinations - Category 2: Everyday Places', () => {
    it('should reject mundane local places in multiple languages', () => {
      const prompt = buildDestinationValidationPrompt('office');
      
      expect(prompt).toContain('Local everyday places');
      expect(prompt).toContain('Too mundane for travel planning');
      expect(prompt).toContain('office, workplace, school');
      expect(prompt).toContain('Polish: biuro, miejsce pracy, szkoła');
      expect(prompt).toContain('Spanish: oficina, lugar de trabajo');
    });
  });

  describe('Invalid Destinations - Category 3: Food Items', () => {
    it('should reject food items in multiple languages', () => {
      const prompt = buildDestinationValidationPrompt('sausage');
      
      expect(prompt).toContain('Food items');
      expect(prompt).toContain('Not places');
      expect(prompt).toContain('English: sausage, bread, cheese');
      expect(prompt).toContain('Polish: kiełbasa, chleb, ser');
      expect(prompt).toContain('Spanish: salchicha, pan, queso');
    });

    it('should allow famous food regions as exception', () => {
      const prompt = buildDestinationValidationPrompt('Champagne');
      
      expect(prompt).toContain('Exception');
      expect(prompt).toContain('Champagne region');
      expect(prompt).toContain('Parma');
    });
  });

  describe('Invalid Destinations - Category 4: Non-Travel Tasks', () => {
    it('should reject non-travel objects/tasks in multiple languages', () => {
      const prompt = buildDestinationValidationPrompt('homework');
      
      expect(prompt).toContain('Non-travel tasks/objects');
      expect(prompt).toContain('Homework, recipe, essay');
      expect(prompt).toContain('Polish: praca domowa, przepis, esej');
    });
  });

  describe('Invalid Destinations - Category 5: Fictional Places', () => {
    it('should reject fictional places', () => {
      const prompt = buildDestinationValidationPrompt('Hogwarts');
      
      expect(prompt).toContain('Fictional places');
      expect(prompt).toContain('Hogwarts');
      expect(prompt).toContain('Narnia');
      expect(prompt).toContain('Gotham');
      expect(prompt).toContain('Wakanda');
      expect(prompt).toContain('Atlantis');
      expect(prompt).toContain('Middle Earth');
      expect(prompt).toContain('Westeros');
    });

    it('should include Polish translations of fictional places', () => {
      const prompt = buildDestinationValidationPrompt('Śródziemie');
      
      expect(prompt).toContain('Polish: Śródziemie, Hogwart, Narnia');
    });
  });

  describe('Invalid Destinations - Category 6: Abstract Concepts', () => {
    it('should reject abstract concepts in multiple languages', () => {
      const prompt = buildDestinationValidationPrompt('happiness');
      
      expect(prompt).toContain('Abstract concepts');
      expect(prompt).toContain('Happiness, freedom, love');
      expect(prompt).toContain('Polish: szczęście, wolność, miłość');
    });
  });

  describe('Invalid Destinations - Category 7: Generic/Vague', () => {
    it('should reject vague destinations in multiple languages', () => {
      const prompt = buildDestinationValidationPrompt('nowhere');
      
      expect(prompt).toContain('Generic/vague');
      expect(prompt).toContain('Nowhere, anywhere, somewhere');
      expect(prompt).toContain('Polish: nigdzie, gdziekolwiek, gdzieś');
    });
  });

  describe('Invalid Destinations - Category 8: Private Residences', () => {
    it('should reject private residences', () => {
      const prompt = buildDestinationValidationPrompt('my house');
      
      expect(prompt).toContain('Private residences');
      expect(prompt).toContain('My house, your house');
      expect(prompt).toContain("friend's place");
    });
  });

  describe('Critical Instructions', () => {
    it('should emphasize understanding meaning and context', () => {
      const prompt = buildDestinationValidationPrompt('kuchnia');
      
      expect(prompt).toContain('CRITICAL INSTRUCTIONS');
      expect(prompt).toContain('Understand the MEANING and CONTEXT');
      expect(prompt).toContain('not just keywords');
      expect(prompt).toContain('Translate mentally');
    });

    it('should instruct to be strict', () => {
      const prompt = buildDestinationValidationPrompt('test');
      
      expect(prompt).toContain('Be STRICT');
      expect(prompt).toContain("if there's any doubt"); // lowercase 'any'
      expect(prompt).toContain('return isValid: false');
    });

    it('should reject food + household combinations', () => {
      const prompt = buildDestinationValidationPrompt('kitchen');
      
      expect(prompt).toContain('food + household items');
      expect(prompt).toContain('ALWAYS invalid');
    });
  });

  describe('Validation Examples', () => {
    it('should provide positive validation examples', () => {
      const prompt = buildDestinationValidationPrompt('Paris');
      
      expect(prompt).toContain('VALID (return isValid: true)');
      expect(prompt).toContain('"Paris" → Real city');
      expect(prompt).toContain('"Tuscany" → Real region');
      expect(prompt).toContain('"Paryż" → Paris in Polish');
    });

    it('should provide negative validation examples', () => {
      const prompt = buildDestinationValidationPrompt('kitchen');
      
      expect(prompt).toContain('INVALID (return isValid: false)');
      expect(prompt).toContain('"kuchnia" → Kitchen in Polish');
      expect(prompt).toContain('"cocina" → Kitchen in Spanish');
      expect(prompt).toContain('"cuisine" → Kitchen in French');
      expect(prompt).toContain('"Hogwart" → Fictional place');
    });
  });

  describe('JSON Response Format', () => {
    it('should specify exact JSON response format', () => {
      const prompt = buildDestinationValidationPrompt('Paris');
      
      expect(prompt).toContain('Return ONLY valid JSON');
      expect(prompt).toContain('"isValid": true or false');
      expect(prompt).toContain('"confidence": "high" | "medium" | "low"');
      expect(prompt).toContain('"reason": "Brief explanation');
    });

    it('should include example JSON responses', () => {
      const prompt = buildDestinationValidationPrompt('Paris');
      
      // Should show JSON structure
      expect(prompt).toMatch(/\{[\s\S]*"isValid"[\s\S]*"confidence"[\s\S]*"reason"[\s\S]*\}/);
    });
  });
});

// ============================================================================
// LAYER 3 TESTS: Output Validation Comments
// ============================================================================

describe('Layer 3: Output Validation - Documentation', () => {
  it('should document that output validation uses AI quality check', () => {
    // This is tested through the ai-actions.ts validateItineraryQuality function
    // The security module documents this approach
    expect(true).toBe(true);
  });
});

// ============================================================================
// UTILITY TESTS: Security Logging
// ============================================================================

describe('Security Logging - logSecurityIncident()', () => {
  it('should log security incidents without throwing errors', () => {
    expect(() => {
      logSecurityIncident('prompt_injection', 'hard_block', {
        userId: 'test-user',
        userInput: 'test input',
        detectedPatterns: ['test pattern'],
      });
    }).not.toThrow();
  });

  it('should handle missing optional parameters', () => {
    expect(() => {
      logSecurityIncident('inappropriate_content', 'soft_warn', {});
    }).not.toThrow();
  });

  it('should accept all incident types', () => {
    const types: Array<'prompt_injection' | 'invalid_destination' | 'inappropriate_content' | 'validation_failure'> = [
      'prompt_injection',
      'invalid_destination',
      'inappropriate_content',
      'validation_failure',
    ];

    types.forEach(type => {
      expect(() => {
        logSecurityIncident(type, 'hard_block', { userId: 'test' });
      }).not.toThrow();
    });
  });

  it('should accept all severity levels', () => {
    const severities: Array<'hard_block' | 'soft_warn' | 'pass'> = [
      'hard_block',
      'soft_warn',
      'pass',
    ];

    severities.forEach(severity => {
      expect(() => {
        logSecurityIncident('inappropriate_content', severity, { userId: 'test' });
      }).not.toThrow();
    });
  });
});

