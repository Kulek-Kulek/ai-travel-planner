/**
 * Validation utilities for security
 * Implements input validation and sanitization
 */

// UUID validation regex (RFC 4122 compliant)
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a value is a valid UUID
 * @param value - The value to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value);
}

/**
 * Validates and sanitizes a UUID, returning null if invalid
 * @param value - The value to validate
 * @returns The UUID string if valid, null otherwise
 */
export function validateAndSanitizeUUID(value: unknown): string | null {
  return isValidUUID(value) ? value : null;
}

/**
 * Escape special characters in PostgreSQL LIKE/ILIKE patterns
 * Prevents pattern injection attacks
 * 
 * Escapes:
 * - % (matches any characters)
 * - _ (matches single character)
 * - \ (escape character)
 * 
 * @param str - The string to escape
 * @returns Escaped string safe for LIKE/ILIKE patterns
 * 
 * @example
 * escapeLikePattern('100%') // returns '100\\%'
 * escapeLikePattern('test_name') // returns 'test\\_name'
 */
export function escapeLikePattern(str: string): string {
  // Escape: % (matches any characters), _ (matches single character), \ (escape character)
  return str.replace(/[%_\\]/g, '\\$&');
}

