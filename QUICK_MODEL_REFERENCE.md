# Quick Model Reference

## Active Models

### Free Tier (Economy)
```typescript
'google/gemini-2.0-flash-exp:free'  // Fast, reliable
'openai/gpt-4o-mini'                // Default ⭐
```

### Paid Tier (Premium)
```typescript
'google/gemini-2.5-pro'        // Advanced reasoning
'anthropic/claude-3-haiku'     // Efficient, balanced
'google/gemini-2.5-flash'      // Latest, enhanced
```

## Pricing

| Model | Cost (EUR) | Tier |
|-------|------------|------|
| Gemini 2.0 Flash | €0.10 | Economy |
| GPT-4o Mini | €0.15 | Economy |
| Gemini 2.5 Flash | €0.20 | Premium |
| Claude 3 Haiku | €0.25 | Premium |
| Gemini 2.5 Pro | €0.35 | Premium |

## Model Keys Mapping

```typescript
// OpenRouter ID -> Pricing Key
{
  'google/gemini-2.0-flash-exp:free': 'gemini-2.0-flash',
  'openai/gpt-4o-mini': 'gpt-4o-mini',
  'google/gemini-2.5-pro': 'gemini-2.5-pro',
  'anthropic/claude-3-haiku': 'claude-haiku',
  'google/gemini-2.5-flash': 'gemini-2.5-flash',
}
```

## Testing Commands

```bash
# Build and verify
cd travel-planner
npm run build

# Check for errors
npm run lint

# Start dev server
npm run dev
```

## Common Tasks

### Add a New Model
1. Add to `src/lib/openrouter/models.ts` (OPENROUTER_MODEL_VALUES)
2. Add pricing config in `src/lib/config/pricing-models.ts` (AI_MODELS)
3. Update mapping in `src/components/itinerary-form-ai-enhanced.tsx`
4. Update mapping in `src/lib/actions/ai-actions.ts`
5. Add to tier allowedModels in pricing-models.ts

### Change Default Model
Update in both places:
- `src/lib/openrouter/models.ts` (DEFAULT_OPENROUTER_MODEL)
- `src/components/itinerary-form-ai-enhanced.tsx` (defaultFormValues.model)

### Change Model Pricing
Update in `src/lib/config/pricing-models.ts`:
```typescript
AI_MODELS['model-key'].cost = 0.25; // New price
```

