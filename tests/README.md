# Tests

This directory contains all centralized tests for the AI Travel Planner application.

## Test Organization

Tests are organized by type:

### 📁 `unit/`
Unit tests for pure functions, utilities, and business logic.
- **Purpose:** Test individual functions in isolation
- **Location:** `tests/unit/`
- **Examples:**
  - `utils/geocoding.test.ts` - Tests for geocoding utilities
  - `utils/language-detector.test.ts` - Tests for language detection
  - `utils/share.test.ts` - Tests for sharing functionality

### 📁 `integration/`
Integration tests for Server Actions and API interactions.
- **Purpose:** Test server-side logic with mocked dependencies
- **Location:** `tests/integration/`
- **Examples:**
  - `actions/itinerary-actions.test.ts` - Tests for itinerary CRUD operations
  - `actions/auth-actions.test.ts` - Tests for authentication flows
  - `actions/profile-actions.test.ts` - Tests for profile updates

### 📁 `components/`
Component tests using React Testing Library.
- **Purpose:** Test React component rendering and interactions
- **Location:** `tests/components/`
- **Examples:**
  - `itinerary-card.test.tsx` - Tests for ItineraryCard component
  - `itinerary-like-button.test.tsx` - Tests for like functionality
  - `download-pdf-button.test.tsx` - Tests for PDF download

### 📁 `e2e/` (Future)
End-to-end tests using Playwright.
- **Purpose:** Test complete user flows in a real browser
- **Location:** `tests/e2e/`
- **Status:** Planned for future implementation

## Running Tests

```bash
# Run all tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Writing Tests

### Test Structure

Follow the **AAA pattern** (Arrange, Act, Assert):

```typescript
it('should do something', () => {
  // Arrange - Set up test data and mocks
  const input = 'test';
  
  // Act - Execute the function/action
  const result = myFunction(input);
  
  // Assert - Verify the result
  expect(result).toBe('expected');
});
```

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { calculateSum } from '@/lib/utils/math';

describe('calculateSum', () => {
  it('should add two numbers correctly', () => {
    const result = calculateSum(2, 3);
    expect(result).toBe(5);
  });

  it('should handle negative numbers', () => {
    const result = calculateSum(-2, 3);
    expect(result).toBe(1);
  });

  it('should return 0 for empty inputs', () => {
    const result = calculateSum(0, 0);
    expect(result).toBe(0);
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { myAction } from '@/lib/actions/my-actions';

describe('myAction', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it('should fetch data successfully', async () => {
    const result = await myAction();
    
    expect(result.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('table_name');
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('should render with props', () => {
    render(<MyComponent title="Test" />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(<MyComponent onClick={onClick} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## Mocking Guidelines

### Mock Supabase

```typescript
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// In test
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
};
(createClient as any).mockResolvedValue(mockSupabase);
```

### Mock Next.js Features

```typescript
// Mock navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

// Mock cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
```

### Mock Components

```typescript
// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
```

## Best Practices

### ✅ Do

- Write descriptive test names that explain the expected behavior
- Test behavior, not implementation details
- Use semantic queries (`getByRole`, `getByLabelText`) for better accessibility
- Mock external dependencies (API calls, databases, etc.)
- Test edge cases and error conditions
- Keep tests simple and focused
- Use `beforeEach` for common setup
- Clean up after tests (if needed)

### ❌ Don't

- Test implementation details (internal state, private methods)
- Use brittle selectors (CSS classes, data-testid unless necessary)
- Write tests that depend on other tests
- Skip error cases
- Over-mock (mock only what's necessary)
- Test third-party libraries
- Write tests that are too complex

## Coverage Goals

- **Utilities:** 90%+ coverage
- **Business Logic:** 80%+ coverage  
- **Components:** 70%+ coverage
- **Server Actions:** 80%+ coverage

Run `npm run test:coverage` to see current coverage metrics.

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions (or your CI provider).

## Troubleshooting

### Tests failing with "Cannot find module"

Make sure path aliases are configured in `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    '@': resolve(__dirname, './src'),
  },
}
```

### Tests timing out

Increase timeout for specific tests:

```typescript
it('should handle async operation', async () => {
  // test code
}, { timeout: 10000 }); // 10 seconds
```

### Mock not working

Clear all mocks in `beforeEach`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

