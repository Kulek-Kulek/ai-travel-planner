# Cursor Rules for AI Travel Planner

Concise, scannable AI coding rules for consistent development practices.

## Rule Files

| File | Type | Scope | Lines | Purpose |
|------|------|-------|-------|---------|
| `shared.mdc` | Always | All files | 54 | Core tech stack, structure, principles |
| `frontend.mdc` | Auto | `**/*.tsx`, `**/hooks/*.ts` | 306 | Next.js, React, TanStack Query, Tailwind, Accessibility |
| `backend.mdc` | Auto | `**/api/**`, `**/lib/**`, `**/lib/actions/**` | 513 | Server Actions, Supabase, OpenRouter AI, Credit System |
| `testing.mdc` | Auto | `**/*.test.*`, `**/tests/**` | 225 | Vitest, Playwright, testing patterns |
| `db-supabase-migration.mdc` | Manual/Auto | `**/supabase/migrations/**` | 279 | Database migration guidelines, RLS, SQL patterns |
| **Total** | | | **~1,377 lines** | **Complete coverage** |

## What's Included

### `shared.mdc` - Foundation
- Full tech stack overview
- Project structure
- TypeScript standards
- Naming conventions
- Environment variables
- Core principles (early returns, guard clauses)

### `frontend.mdc` - Complete Frontend Guide
**Next.js:**
- Server vs Client Components
- Route organization
- Component declaration patterns

**React:**
- Component design principles
- Hooks best practices (useState, useEffect, useMemo, custom hooks)
- State management (when to use what)
- Error boundaries
- Performance optimization

**TanStack Query:**
- Query patterns and configuration
- Mutation patterns
- Query key organization

**Styling:**
- Tailwind CSS patterns
- shadcn/ui usage

**Accessibility:**
- Semantic HTML
- ARIA best practices
- Keyboard navigation

**Other:**
- Forms (React Hook Form + Zod)
- Images (Next.js Image)
- Performance tips

### `backend.mdc` - Server Side
**Architecture:**
- Server Actions as primary mutation channel
- API routes only for webhooks/external services
- Complete working examples

**Supabase:**
- Server & client setup with TypeScript types
- Authentication patterns
- RLS policies and database queries
- Type-safe client usage

**AI Integration:**
- OpenRouter setup
- Credit system implementation (check before, decrement after)
- AI response validation with Zod (FR-006)
- Structured prompts and error handling

**Security:**
- Input validation with Zod
- Structured error returns (ActionResult pattern)
- Complete security checklist

### `testing.mdc` - Quality Assurance
- Vitest configuration
- Component testing patterns
- TanStack Query testing
- Hook testing
- Mocking strategies
- Playwright E2E tests
- Best practices
- Coverage goals

### `db-supabase-migration.mdc` - Database Migrations
**Use with:** `@db-supabase-migration.mdc` when creating migrations

**Specialized guide for:**
- Migration file naming convention (`YYYYMMDDHHmmss_description.sql`)
- SQL writing standards (lowercase, comments, idempotent)
- Table creation patterns
- Row Level Security (RLS) policies
- Common patterns (user-owned data, public read tables)
- Indexes and foreign keys
- Destructive operations safety
- Testing and rollback procedures

## How It Works

Rules automatically attach based on file patterns:
- **Always:** `shared.mdc` loads for every file
- **Auto:** Other rules match glob patterns
- **Manual:** Use `@rulename` in prompts if needed

### Example Flow
Working on `TravelCard.tsx`:
1. ✅ `shared.mdc` (always)
2. ✅ `frontend.mdc` (matches `**/*.tsx`)

Working on `app/api/generate/route.ts`:
1. ✅ `shared.mdc` (always)
2. ✅ `backend.mdc` (matches `**/api/**/*.ts`)

Working on `useTravelData.ts` hook:
1. ✅ `shared.mdc` (always)
2. ✅ `frontend.mdc` (matches `**/hooks/*.ts`)

Creating a database migration:
1. ✅ `shared.mdc` (always)
2. ✅ `db-supabase-migration.mdc` (matches `**/supabase/migrations/**/*.sql`)
3. Or manually with: `@db-supabase-migration.mdc create a table for...`

## Maintenance

### When to Update
- New patterns emerge
- Team conventions change
- Technology updates
- Repeated mistakes appear

### How to Update
1. Edit the `.mdc` file directly
2. Keep rules under 600 lines (current max: 513)
3. Use code examples for clarity
4. Test with Cursor to verify
5. Update this README if scope changes

### Style Guide for Rules
- ✅ Use concrete examples
- ✅ Show patterns, not just descriptions
- ✅ Include both ✅ Do and ❌ Don't
- ✅ Keep it scannable (bullets, code blocks)
- ❌ Avoid vague statements
- ❌ Don't explain basic concepts

## Quick Reference

### Common Patterns

**Component:**
```typescript
export const MyComponent = ({ title }: Props) => {
  const [state, setState] = useState(initial);
  return <div>{title}</div>;
};
```

**Query:**
```typescript
export function useData() {
  return useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });
}
```

**Server Action:**
```typescript
'use server';
export async function createItem(input: Input): Promise<ActionResult<Data>> {
  // 1. Validate, 2. Auth, 3. Process, 4. Return
}
```

**Test:**
```typescript
it('works correctly', async () => {
  render(<Component />);
  await user.click(screen.getByRole('button'));
  expect(screen.getByText('result')).toBeInTheDocument();
});
```

## Recent Changes

### 2025-10-12: Complete Rule System
- **Merged** `react.mdc` into `frontend.mdc` for unified frontend guide (306 lines)
- **Expanded** `backend.mdc` with Server Actions, credit system, complete examples (513 lines)
- **Added** `db-supabase-migration.mdc` for database migrations (279 lines)
- **Architecture:** Server Actions for mutations, API routes only for webhooks
- **Total:** 5 rule files, ~1,377 lines, production-ready

## Need Help?

- Review existing rules for patterns
- Reference actual project files
- Discuss major changes with team
- Keep it simple and actionable
