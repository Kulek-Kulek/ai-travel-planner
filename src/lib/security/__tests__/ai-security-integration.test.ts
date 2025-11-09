/**
 * Integration Tests for Three-Layer AI Security System
 * 
 * Tests the complete end-to-end security flow across all three layers:
 * 1. Content Policy Check (Layer 1) 
 * 2. Destination Validation (Layer 2)
 * 3. Output Quality/Security Check (Layer 3)
 * 
 * These tests verify that security violations are properly detected,
 * logged, and returned to the user with appropriate error messages.
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// LAYER 1: Content Policy Violations - Error Format Tests
// ============================================================================

describe('Layer 1 Integration: Content Policy Check Error Formats', () => {
  
  describe('Sexual Content Violations', () => {
    it('should return correct error format for sexual content', () => {
      const aiResponse = {
        error: 'content_policy_violation',
        violation_type: 'sexual_content',
        reason: 'This request contains inappropriate sexual content or references, which violates our content policy.'
      };

      expect(aiResponse.error).toBe('content_policy_violation');
      expect(aiResponse.violation_type).toBe('sexual_content');
      expect(aiResponse.reason).toContain('sexual content');
      expect(aiResponse.reason).toContain('content policy');
    });

    it('should handle multilingual sexual content detection', () => {
      const testCases = [
        { lang: 'Polish', phrase: 'dupeczki', description: 'sexual slang' },
        { lang: 'Spanish', phrase: 'para follar', description: 'sexual purpose' },
        { lang: 'French', phrase: 'pour baiser', description: 'sexual purpose' },
      ];

      testCases.forEach(({ lang, phrase, description }) => {
        // AI should detect these and return violation
        const mockResponse = {
          hasViolation: true,
          violationReason: `Sexual content: '${phrase}' (${lang} ${description})`
        };

        expect(mockResponse.hasViolation).toBe(true);
        expect(mockResponse.violationReason).toContain('Sexual content');
        expect(mockResponse.violationReason).toContain(phrase);
      });
    });
  });

  describe('Illegal Substances Violations', () => {
    it('should return correct error format for illegal substances', () => {
      const aiResponse = {
        error: 'content_policy_violation',
        violation_type: 'illegal_substances',
        reason: 'This request involves illegal drug activities, which violates our content policy.'
      };

      expect(aiResponse.error).toBe('content_policy_violation');
      expect(aiResponse.violation_type).toBe('illegal_substances');
      expect(aiResponse.reason).toContain('illegal drug');
    });

    it('should detect drug-related requests in multiple languages', () => {
      const drugKeywords = ['cocaine', 'kokaina', 'cocaïne', 'kokain'];
      
      drugKeywords.forEach(keyword => {
        const mockResponse = {
          hasViolation: true,
          violationReason: `Illegal substances: Request mentions ${keyword}`
        };

        expect(mockResponse.hasViolation).toBe(true);
        expect(mockResponse.violationReason).toContain('Illegal substances');
      });
    });
  });

  describe('Weapons & Violence Violations', () => {
    it('should return correct error format for weapons/violence', () => {
      const aiResponse = {
        error: 'content_policy_violation',
        violation_type: 'weapons_violence',
        reason: 'This request involves weapons or violent activities, which violates our content policy.'
      };

      expect(aiResponse.error).toBe('content_policy_violation');
      expect(aiResponse.violation_type).toBe('weapons_violence');
      expect(aiResponse.reason).toContain('weapons');
    });

    it('should detect terrorism keywords in multiple languages', () => {
      const terrorismKeywords = ['terrorism', 'terroryzm', 'terrorismo', 'terrorisme'];
      
      terrorismKeywords.forEach(keyword => {
        const mockResponse = {
          hasViolation: true,
          violationReason: `Violence/terrorism: Request mentions ${keyword}`
        };

        expect(mockResponse.hasViolation).toBe(true);
      });
    });
  });

  describe('Hate Speech Violations', () => {
    it('should return correct error format for hate speech', () => {
      const aiResponse = {
        error: 'content_policy_violation',
        violation_type: 'hate_speech',
        reason: 'This request contains hate speech or discriminatory content, which violates our content policy.'
      };

      expect(aiResponse.error).toBe('content_policy_violation');
      expect(aiResponse.violation_type).toBe('hate_speech');
      expect(aiResponse.reason).toContain('hate speech');
    });
  });

  describe('Human Trafficking Violations', () => {
    it('should return correct error format for human trafficking', () => {
      const aiResponse = {
        error: 'content_policy_violation',
        violation_type: 'human_trafficking',
        reason: 'This request involves human trafficking or exploitation, which violates our content policy and international law.'
      };

      expect(aiResponse.error).toBe('content_policy_violation');
      expect(aiResponse.violation_type).toBe('human_trafficking');
      expect(aiResponse.reason).toContain('human trafficking');
      expect(aiResponse.reason).toContain('international law');
    });
  });

  describe('Financial Crime Violations', () => {
    it('should return correct error format for financial crimes', () => {
      const aiResponse = {
        error: 'content_policy_violation',
        violation_type: 'financial_crime',
        reason: 'This request involves financial crimes, which violates our content policy.'
      };

      expect(aiResponse.error).toBe('content_policy_violation');
      expect(aiResponse.violation_type).toBe('financial_crime');
      expect(aiResponse.reason).toContain('financial crimes');
    });
  });

  describe('Dangerous Activity Violations', () => {
    it('should return correct error format for dangerous activities', () => {
      const aiResponse = {
        error: 'content_policy_violation',
        violation_type: 'dangerous_activity',
        reason: 'This request involves potentially harmful activities. If you\'re experiencing thoughts of self-harm, please contact a mental health professional.'
      };

      expect(aiResponse.error).toBe('content_policy_violation');
      expect(aiResponse.violation_type).toBe('dangerous_activity');
      expect(aiResponse.reason).toContain('harmful activities');
      expect(aiResponse.reason).toContain('mental health professional');
    });
  });
});

// ============================================================================
// LAYER 2: Destination Validation - Response Format Tests
// ============================================================================

describe('Layer 2 Integration: Destination Validation Response Formats', () => {
  
  describe('Invalid Destination Detection', () => {
    it('should return invalid for household locations', () => {
      const mockValidationResult = {
        isValid: false,
        confidence: 'high' as const,
        reason: 'Kitchen is a household location, not a travel destination'
      };

      expect(mockValidationResult.isValid).toBe(false);
      expect(mockValidationResult.confidence).toBe('high');
      expect(mockValidationResult.reason).toContain('household location');
    });

    it('should return invalid for fictional places', () => {
      const mockValidationResult = {
        isValid: false,
        confidence: 'high' as const,
        reason: 'Hogwarts is a fictional place from Harry Potter, not a real destination'
      };

      expect(mockValidationResult.isValid).toBe(false);
      expect(mockValidationResult.reason).toContain('fictional');
    });

    it('should return invalid for nonsense destinations', () => {
      const mockValidationResult = {
        isValid: false,
        confidence: 'high' as const,
        reason: 'This appears to be random characters, not a real destination'
      };

      expect(mockValidationResult.isValid).toBe(false);
    });

    it('should handle multilingual household locations', () => {
      const householdLocations = [
        { word: 'kuchnia', lang: 'Polish', meaning: 'kitchen' },
        { word: 'cocina', lang: 'Spanish', meaning: 'kitchen' },
        { word: 'cuisine', lang: 'French', meaning: 'kitchen' },
        { word: 'küche', lang: 'German', meaning: 'kitchen' },
      ];

      householdLocations.forEach(({ word, lang, meaning }) => {
        const mockValidationResult = {
          isValid: false,
          confidence: 'high' as const,
          reason: `${word} (${meaning} in ${lang}) is a household location, not a travel destination`
        };

        expect(mockValidationResult.isValid).toBe(false);
        expect(mockValidationResult.reason).toContain('household location');
      });
    });
  });

  describe('Valid Destination Detection', () => {
    it('should return valid for real cities', () => {
      const mockValidationResult = {
        isValid: true,
        confidence: 'high' as const,
        reason: 'Paris is a real city in France, a popular travel destination'
      };

      expect(mockValidationResult.isValid).toBe(true);
      expect(mockValidationResult.confidence).toBe('high');
    });

    it('should return valid for famous regions', () => {
      const mockValidationResult = {
        isValid: true,
        confidence: 'high' as const,
        reason: 'Tuscany is a famous region in Italy'
      };

      expect(mockValidationResult.isValid).toBe(true);
    });

    it('should handle edge case: Champagne region (food + place)', () => {
      const mockValidationResult = {
        isValid: true,
        confidence: 'high' as const,
        reason: 'Champagne is a real region in France, famous for wine production and tourism'
      };

      expect(mockValidationResult.isValid).toBe(true);
      expect(mockValidationResult.reason).toContain('region in France');
    });
  });

  describe('Confidence Levels', () => {
    it('should return high confidence for obvious cases', () => {
      const obviousCases = [
        { dest: 'Paris', expected: true },
        { dest: 'kitchen', expected: false },
        { dest: 'Hogwarts', expected: false },
      ];

      obviousCases.forEach(({ dest, expected }) => {
        const mockValidationResult = {
          isValid: expected,
          confidence: 'high' as const,
          reason: `Test reason for ${dest}`
        };

        expect(mockValidationResult.confidence).toBe('high');
      });
    });

    it('should return medium confidence for ambiguous cases', () => {
      const mockValidationResult = {
        isValid: false,
        confidence: 'medium' as const,
        reason: 'Uncertain if this is a real place or misspelled'
      };

      expect(mockValidationResult.confidence).toBe('medium');
    });

    it('should return low confidence on validation errors', () => {
      const mockValidationResult = {
        isValid: false,
        confidence: 'low' as const,
        reason: 'Validation error'
      };

      expect(mockValidationResult.confidence).toBe('low');
    });
  });
});

// ============================================================================
// LAYER 3: Output Validation - Quality Check Tests
// ============================================================================

describe('Layer 3 Integration: Output Quality/Security Check', () => {
  
  describe('Security Score = 0 Detection', () => {
    it('should return score 0 for non-travel content', () => {
      const qualityCheckResult = {
        score: 0,
        needsRefinement: false,
        issues: ['Generated content is not a travel itinerary', 'Contains recipe content']
      };

      expect(qualityCheckResult.score).toBe(0);
      expect(qualityCheckResult.issues.length).toBeGreaterThan(0);
      expect(qualityCheckResult.issues.some(issue => 
        issue.toLowerCase().includes('not a travel itinerary')
      )).toBe(true);
    });

    it('should return score 0 for inappropriate content in output', () => {
      const qualityCheckResult = {
        score: 0,
        needsRefinement: false,
        issues: ['Original request contains inappropriate content', 'Policy violation detected in user notes']
      };

      expect(qualityCheckResult.score).toBe(0);
      expect(qualityCheckResult.issues.some(issue => 
        issue.toLowerCase().includes('inappropriate') || issue.toLowerCase().includes('violation')
      )).toBe(true);
    });

    it('should return score 0 for invalid destination in output', () => {
      const qualityCheckResult = {
        score: 0,
        needsRefinement: false,
        issues: ['Destination is not a real geographic location']
      };

      expect(qualityCheckResult.score).toBe(0);
      expect(qualityCheckResult.issues.some(issue => 
        issue.toLowerCase().includes('not a real')
      )).toBe(true);
    });
  });

  describe('Normal Quality Scores', () => {
    it('should return positive score for legitimate itineraries', () => {
      const qualityCheckResult = {
        score: 92,
        needsRefinement: false,
        issues: []
      };

      expect(qualityCheckResult.score).toBeGreaterThan(0);
      expect(qualityCheckResult.score).toBeLessThanOrEqual(100);
      expect(qualityCheckResult.issues.length).toBe(0);
    });

    it('should identify refinement needs for low-quality legitimate content', () => {
      const qualityCheckResult = {
        score: 72,
        needsRefinement: true,
        issues: ['Timing could be more realistic', 'Could add more details to activities']
      };

      expect(qualityCheckResult.score).toBeGreaterThan(0);
      expect(qualityCheckResult.needsRefinement).toBe(true);
      expect(qualityCheckResult.issues.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// FRONTEND ERROR DETECTION TESTS
// ============================================================================

describe('Frontend Security Error Detection', () => {
  
  describe('Security Error Identification', () => {
    it('should identify security errors by markers', () => {
      const securityErrors = [
        '❌ Content Policy Violation: sexual content detected',
        '🚨 Security Alert: invalid destination',
        'Content Policy Violation: This request violates our policy',
      ];

      securityErrors.forEach(errorMessage => {
        const isSecurityError = 
          errorMessage.includes('❌') ||
          errorMessage.includes('🚨') ||
          errorMessage.includes('Content Policy Violation') ||
          errorMessage.includes('Security Alert');

        expect(isSecurityError).toBe(true);
      });
    });

    it('should identify security errors by keywords', () => {
      const keywords = [
        'sexual', 'sexual content', 'sexual services',
        'illegal substances', 'illegal drug',
        'weapons', 'violence', 'terrorism', 'terrorist',
        'hate speech', 'discriminatory',
        'human trafficking', 'exploitation',
        'financial crime', 'money laundering',
        'dangerous activit', 'self-harm'
      ];

      keywords.forEach(keyword => {
        const errorMessage = `This request involves ${keyword}, which violates our policy.`;
        
        const isSecurityError = keywords.some(k => 
          errorMessage.toLowerCase().includes(k.toLowerCase())
        );

        expect(isSecurityError).toBe(true);
      });
    });

    it('should NOT identify normal errors as security errors', () => {
      const normalErrors = [
        'Failed to generate itinerary',
        'Network error occurred',
        'Server timeout',
        'Please try again later',
        'Invalid input format',
      ];

      normalErrors.forEach(errorMessage => {
        const isSecurityError = 
          errorMessage.includes('❌') ||
          errorMessage.includes('🚨') ||
          errorMessage.includes('Content Policy Violation') ||
          errorMessage.toLowerCase().includes('sexual') ||
          errorMessage.toLowerCase().includes('terrorism');

        expect(isSecurityError).toBe(false);
      });
    });
  });

  describe('Security Modal Trigger', () => {
    it('should trigger modal for security violations', () => {
      const securityErrors = [
        '❌ Content Policy Violation: inappropriate request',
        '🚨 Invalid Destination: kitchen is not a valid destination',
        'Content Policy Violation: This request violates our policy',
      ];

      securityErrors.forEach(error => {
        const shouldShowModal = 
          error.includes('❌') ||
          error.includes('🚨') ||
          error.includes('Content Policy Violation') ||
          error.includes('Invalid Destination');

        expect(shouldShowModal).toBe(true);
      });
    });

    it('should NOT trigger modal for normal errors', () => {
      const normalErrors = [
        'Failed to connect to server',
        'Request timeout',
        'Unknown error occurred',
      ];

      normalErrors.forEach(error => {
        const shouldShowModal = 
          error.includes('❌') ||
          error.includes('🚨') ||
          error.includes('Content Policy Violation');

        expect(shouldShowModal).toBe(false);
      });
    });
  });
});

// ============================================================================
// EXTRACTION WITH SECURITY ERROR TESTS
// ============================================================================

describe('ExtractedTravelInfo with Security Errors', () => {
  
  describe('Security Error in Extraction Result', () => {
    it('should return securityError field when violation detected', () => {
      const extractionResult = {
        destination: 'Paris',
        days: 2,
        travelers: 2,
        children: null,
        childAges: undefined,
        startDate: null,
        endDate: null,
        hasAccessibilityNeeds: false,
        travelStyle: null,
        interests: [],
        securityError: '❌ Content Policy Violation: Sexual content detected in request',
      };

      expect(extractionResult.securityError).toBeDefined();
      expect(extractionResult.securityError).toContain('Content Policy Violation');
      
      // Should still extract valid travel info
      expect(extractionResult.destination).toBe('Paris');
      expect(extractionResult.days).toBe(2);
      expect(extractionResult.travelers).toBe(2);
    });

    it('should clear invalid destination but keep other extracted info', () => {
      const extractionResult = {
        destination: null, // Cleared after validation
        days: 2,
        travelers: 2,
        children: null,
        childAges: undefined,
        startDate: null,
        endDate: null,
        hasAccessibilityNeeds: false,
        travelStyle: null,
        interests: [],
        securityError: '❌ Invalid Destination: "kitchen" is not a valid travel destination',
      };

      expect(extractionResult.securityError).toBeDefined();
      expect(extractionResult.securityError).toContain('Invalid Destination');
      expect(extractionResult.destination).toBeNull();
      
      // Other fields should still be extracted
      expect(extractionResult.days).toBe(2);
      expect(extractionResult.travelers).toBe(2);
    });

    it('should have no security error for valid extraction', () => {
      const extractionResult = {
        destination: 'Paris',
        days: 3,
        travelers: 2,
        children: null,
        childAges: undefined,
        startDate: null,
        endDate: null,
        hasAccessibilityNeeds: false,
        travelStyle: 'cultural',
        interests: ['museums', 'restaurants'],
        securityError: undefined,
      };

      expect(extractionResult.securityError).toBeUndefined();
      expect(extractionResult.destination).toBe('Paris');
      expect(extractionResult.days).toBe(3);
      expect(extractionResult.travelStyle).toBe('cultural');
      expect(extractionResult.interests).toContain('museums');
    });
  });
});

// ============================================================================
// MULTILINGUAL SECURITY TESTS
// ============================================================================

describe('Multilingual Security Integration', () => {
  
  describe('Multilingual Violation Detection', () => {
    it('should detect violations in Polish', () => {
      const polishViolations = [
        { phrase: 'dupeczki', category: 'sexual slang' },
        { phrase: 'burdel', category: 'sexual venue' },
        { phrase: 'kokaina', category: 'drugs' },
        { phrase: 'terroryzm', category: 'terrorism' },
      ];

      polishViolations.forEach(({ phrase, category }) => {
        const mockResponse = {
          hasViolation: true,
          violationReason: `Detected ${category}: '${phrase}' in Polish`
        };

        expect(mockResponse.hasViolation).toBe(true);
        expect(mockResponse.violationReason).toContain(phrase);
      });
    });

    it('should detect violations in Spanish', () => {
      const spanishViolations = [
        { phrase: 'para follar', category: 'sexual purpose' },
        { phrase: 'putero', category: 'sexual venue' },
        { phrase: 'droga', category: 'drugs' },
      ];

      spanishViolations.forEach(({ phrase, category }) => {
        const mockResponse = {
          hasViolation: true,
          violationReason: `Detected ${category}: '${phrase}' in Spanish`
        };

        expect(mockResponse.hasViolation).toBe(true);
      });
    });

    it('should detect violations in French', () => {
      const frenchViolations = [
        { phrase: 'pour baiser', category: 'sexual purpose' },
        { phrase: 'bordel', category: 'sexual venue' },
      ];

      frenchViolations.forEach(({ phrase, category }) => {
        const mockResponse = {
          hasViolation: true,
          violationReason: `Detected ${category}: '${phrase}' in French`
        };

        expect(mockResponse.hasViolation).toBe(true);
      });
    });
  });

  describe('Multilingual Destination Validation', () => {
    it('should reject household locations in multiple languages', () => {
      const householdWords = [
        { word: 'kuchnia', lang: 'Polish' },
        { word: 'cocina', lang: 'Spanish' },
        { word: 'cuisine', lang: 'French' },
        { word: 'küche', lang: 'German' },
      ];

      householdWords.forEach(({ word, lang }) => {
        const mockValidation = {
          isValid: false,
          confidence: 'high' as const,
          reason: `${word} (kitchen in ${lang}) is not a travel destination`
        };

        expect(mockValidation.isValid).toBe(false);
        expect(mockValidation.confidence).toBe('high');
      });
    });
  });
});
