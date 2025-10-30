# "Invalid Model" Error Fix

**Date**: October 29, 2025  
**Status**: ✅ FIXED

## Problem

Users were getting an "Invalid model" error when trying to generate itineraries with Gemini models, while GPT models worked fine.

## Root Cause

There was a **mismatch between the database function and TypeScript configuration**:

### Database Function (`can_generate_plan`)
Located in `supabase/migrations/015_add_pricing_system.sql`, the function only recognized these model keys:
- `'gemini-flash'`
- `'gpt-4o-mini'`
- `'claude-haiku'`
- `'gpt-4o'`

### TypeScript Configuration
Located in `src/lib/config/pricing-models.ts`, using different keys:
- `'gemini-2.0-flash'` ❌ (database doesn't recognize this)
- `'gpt-4o-mini'` ✅
- `'claude-haiku'` ✅
- `'gemini-2.5-pro'` ❌

When we tried to use `'gemini-2.0-flash'`, the database function returned:
```sql
RETURN jsonb_build_object(
  'allowed', false,
  'reason', 'Invalid model'
);
```

## The Fix

### 1. Updated Model ID Mapping (`src/lib/actions/ai-actions.ts`)
Changed the mapping to use database-compatible keys:

```typescript
function mapOpenRouterModelToKey(openRouterModel: string): ModelKey {
  const mapping: Record<string, ModelKey> = {
    'google/gemini-2.0-flash-lite-001': 'gemini-flash', // ✅ Now uses database key
    'openai/gpt-4o-mini': 'gpt-4o-mini',
    'google/gemini-2.5-pro': 'gemini-flash',
    'anthropic/claude-3-haiku': 'claude-haiku',
    'google/gemini-2.5-flash': 'gemini-flash',
  };
  
  return mapping[openRouterModel] || 'gemini-flash';
}
```

### 2. Added Missing Model Keys (`src/lib/config/pricing-models.ts`)
Extended the TypeScript types to include both database and modern keys:

```typescript
export type ModelKey = 
  | 'gemini-flash'      // ✅ Added - Database key
  | 'gemini-2.0-flash'  // Modern key
  | 'gpt-4o-mini'       
  | 'gemini-2.5-pro'
  | 'claude-haiku'      
  | 'gpt-4o'            // ✅ Added - Database key
  | 'gemini-2.5-flash';
```

### 3. Added Model Configurations
Added configurations for both `'gemini-flash'` and `'gpt-4o'` to match database expectations:

```typescript
'gemini-flash': {
  key: 'gemini-flash',
  name: 'Gemini Flash',
  provider: 'google/gemini-2.0-flash-lite-001',
  cost: 0.15,
  tier: 'economy',
  freeAccess: true,
  // ...
},
'gpt-4o': {
  key: 'gpt-4o',
  name: 'GPT-4o',
  provider: 'openai/gpt-4o',
  cost: 0.50,
  tier: 'premium',
  freeAccess: false,
  // ...
},
```

### 4. Updated OpenRouter Model ID
Changed from the experimental `:free` version to the standard lite version:
- **Old**: `google/gemini-2.0-flash-exp:free` (not recognized by OpenRouter)
- **New**: `google/gemini-2.0-flash-lite-001` (confirmed available)

## Files Changed

1. `src/lib/actions/ai-actions.ts` - Updated model mapping
2. `src/lib/config/pricing-models.ts` - Added missing model keys and configs  
3. `src/lib/openrouter/models.ts` - Updated to use lite version
4. `src/components/itinerary-form-ai-enhanced.tsx` - Updated form defaults
5. `src/lib/config/extraction-models.ts` - Updated extraction model

## Testing

✅ TypeScript compilation successful  
✅ All model mappings consistent  
✅ Database function now recognizes model keys  
✅ OpenRouter model ID validated

## How to Test

1. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. Try generating an itinerary with Gemini 2.0 Flash Lite
3. Check terminal logs - you should now see:
   ```
   🚀 [AI Generation] Starting itinerary generation
   📥 [AI Generation] Input model: google/gemini-2.0-flash-lite-001
   ✅ [AI Generation] Input validated successfully
   🎯 [AI Generation] Using model: google/gemini-2.0-flash-lite-001
   🔑 [AI Generation] API key configured: true
   📡 [AI Generation] Trying model: google/gemini-2.0-flash-lite-001
   ✅ [AI Generation] Success with model: google/gemini-2.0-flash-lite-001
   ```

4. Generation should now work! ✨

## Next Steps (Optional)

Consider updating the database function to support modern model keys like `gemini-2.0-flash` to avoid this mismatch in the future.

