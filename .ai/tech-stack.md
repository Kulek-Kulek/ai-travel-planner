# Technology Stack - AI Travel Planner

## Chosen stack
- Framework: Next.js (App Router)
- Language: TypeScript
- UI: Tailwind CSS, shadcn/ui, React Lucid Icons
- Data fetching: TanStack Query
- Backend/DB/Auth: Supabase (PostgreSQL, Auth)
- AI provider: OpenRouter
- Hosting: Vercel
- CI/CD: GitHub Actions
- Unit/Integration testing: Vitest

## Why this stack
- Speed to MVP: Next.js + Supabase provides routing, SSR/ISR, auth, and managed Postgres out of the box. shadcn/ui + Tailwind accelerates accessible UI with minimal custom CSS. TanStack Query simplifies mutations, caching, and loading states.
- Maintainability: TypeScript across the stack improves safety and refactors. Supabase consolidates DB, Auth, and storage, supports SQL migrations and row-level security.
- Scalability: Vercel/Cloudflare scale serverless functions globally; Postgres scales with pooling. Query caching reduces load; queues/rate limits can be added later if needed.
- Cost control: Generous free tiers early. AI usage is the main cost; per-user quotas and metering mitigate spikes.
- Security: Supabase RLS ensures per-user isolation; env vars keep AI keys server-side; schema validation (e.g., zod) and rate limiting reduce abuse.
- Flexibility: Hosting is provider-agnostic (Vercel, Cloudflare, Netlify). AI can switch via OpenRouter if models/pricing change.
