// Vitest setup file for global test configuration
import { expect } from 'vitest'

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

