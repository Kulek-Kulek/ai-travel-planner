// Vitest setup file for global test configuration
import { expect } from 'vitest'

// Mock environment variables for tests
process.env.OPENAI_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Add custom matchers if needed
expect.extend({
  toBeSecurityError(received: any) {
    const pass = 
      received && 
      typeof received === 'object' &&
      (received.error === 'content_policy_violation' || 
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
  interface Assertion<T = any> {
    toBeSecurityError(): T
  }
  interface AsymmetricMatchersContaining {
    toBeSecurityError(): any
  }
}

