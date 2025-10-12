# AI Travel Planner

An intelligent travel planning application that uses AI to create personalized travel itineraries, recommendations, and travel assistance.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **UI:** Tailwind CSS 4, shadcn/ui
- **Data Fetching:** TanStack Query (React Query)
- **Backend/DB/Auth:** Supabase (PostgreSQL, Auth)
- **AI Provider:** OpenRouter
- **Testing:** Playwright (E2E), Vitest (Unit/Integration)

## Project Structure

```
src/
├── app/              # Next.js pages, layouts, API routes
├── components/       # React components
│   └── ui/          # shadcn/ui components
├── lib/             # Utilities, configs
│   ├── supabase/   # Supabase client
│   ├── openrouter/ # AI client
│   └── actions/    # Server Actions
├── hooks/           # Custom React hooks
├── types/           # TypeScript types
└── stores/          # State management (if needed)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm/pnpm/yarn
- Supabase account
- OpenRouter account

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Create `.env.local`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # OpenRouter AI
   OPENROUTER_API_KEY=your_openrouter_key
   
   # Optional
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Set up Supabase:**
   
   Install Supabase CLI:
   ```bash
   npm install supabase --save-dev
   ```
   
   Run migrations:
   ```bash
   npx supabase db reset
   ```
   
   Generate TypeScript types:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## Development

### Adding Components

Install shadcn/ui components:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
# etc.
```

### Creating Database Migrations

1. Create migration file:
   ```bash
   # Manual: supabase/migrations/YYYYMMDDHHmmss_description.sql
   ```

2. Apply migrations:
   ```bash
   npx supabase db reset
   ```

3. Generate types:
   ```bash
   npx supabase gen types typescript --local > src/types/supabase.ts
   ```

### Server Actions (Primary Pattern)

Use Server Actions for all mutations:

```typescript
// lib/actions/example-actions.ts
'use server';

export async function createItem(input: Input): Promise<ActionResult<Data>> {
  // 1. Validate with Zod
  // 2. Authenticate user
  // 3. Process request
  // 4. Return structured result
}
```

### Testing

```bash
# Unit tests
npm run test
npm run test:watch
npm run test:coverage

# E2E tests
npm run test:e2e
npm run test:e2e:ui
```

## Architecture

### Data Layer

- **Server Actions:** Primary channel for all mutations (INSERT, UPDATE, DELETE)
- **API Routes:** Only for webhooks and external integrations
- **TanStack Query:** Client-side data fetching and caching
- **Supabase RLS:** Row Level Security on all tables

### AI Integration

- **Credit System:** Check credits before generation, decrement after
- **Validation:** All AI responses validated with Zod schemas
- **Security:** API keys kept server-side only

### Authentication

- Supabase Auth with session management
- Server-side auth checks in all protected routes
- RLS policies enforce user data isolation

## Cursor Rules

This project includes comprehensive Cursor AI rules in `.cursor/rules/`:
- `shared.mdc` - Core principles
- `frontend.mdc` - Next.js & React patterns
- `backend.mdc` - Server Actions & Supabase
- `testing.mdc` - Testing patterns
- `db-supabase-migration.mdc` - Database migrations

See `.cursor/rules/README.md` for details.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
```

## Contributing

1. Follow the established patterns in `.cursor/rules/`
2. Use Server Actions for mutations
3. Validate all inputs with Zod
4. Enable RLS on all database tables
5. Write tests for new features

## License

[Your License]
