// Vitest setup file for global test configuration
import { expect, vi } from 'vitest'

// Suppress console output during tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
const originalConsoleLog = console.log

console.error = vi.fn()
console.warn = vi.fn()
console.log = vi.fn()

// Restore original console methods after all tests (optional, for debugging)
// Uncomment these lines if you need to see console output for debugging:
// console.error = originalConsoleError
// console.warn = originalConsoleWarn
// console.log = originalConsoleLog

// Mock environment variables for tests
process.env.OPENAI_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Add custom matchers if needed
expect.extend({
  toBeSecurityError(received: unknown) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      // @ts-expect-error index signature lookup for runtime check
      (received.error === 'content_policy_violation' ||
        // @ts-expect-error index signature lookup for runtime check
        received.securityError !== undefined)

    return {
      pass,
      message: () =>
        pass
          ? 'Expected not to be a security error'
          : 'Expected to be a security error with \'error\' or \'securityError\' field',
    }
  },
})

// Extend TypeScript types for custom matchers
declare module 'vitest' {
  interface Assertion {
    toBeSecurityError(): void
  }
  interface AsymmetricMatchersContaining {
    toBeSecurityError(): void
  }
}

