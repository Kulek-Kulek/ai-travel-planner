# Extraction + Security Dual-Track Fix

## Problem

The AI extraction was **blocking field extraction** when it detected inappropriate content, causing poor UX where valid information (destination, days, travelers) was not being prefilled even though it could be extracted from the description.

### Example Issue:
**Input:** "wycieczka do paryża na dwa dni we doje na dupeczki"
(Trip to Paris for two days we go for dupeczki)

**Previous Behavior:**
- ❌ Security alert shows (✓ correct)
- ❌ Destination: NOT prefilled (✗ bad UX)
- ❌ Days: NOT prefilled (✗ bad UX)
- ❌ Travelers: NOT prefilled (✗ bad UX)

**Expected Behavior:**
- ✅ Security alert shows (content policy violation)
- ✅ Destination: "Paris" prefilled
- ✅ Days: 2 prefilled
- ✅ Travelers: 2 prefilled (if mentioned)

## Root Cause

The extraction prompt instructed the AI to:
```
**IF YOU FIND INAPPROPRIATE CONTENT**:
→ STOP IMMEDIATELY
→ DO NOT EXTRACT ANYTHING
→ Return error format only
```

This caused the AI to return:
```json
{
  "error": "content_policy_violation",
  "reason": "Detected dupeczki..."
}
```

With **no extracted fields**, resulting in:
- Destination: null
- Days: null
- Travelers: null
- Security error: shown

## Solution

Changed the extraction to a **dual-track approach**:
1. **Always extract** valid travel information (destination, days, travelers, etc.)
2. **Separately flag** inappropriate content violations
3. **Return both** extracted fields AND security flag

### New Response Format

```json
{
  "destination": "Paris",
  "days": 2,
  "travelers": 2,
  "children": null,
  "childAges": [],
  "startDate": null,
  "endDate": null,
  "hasAccessibilityNeeds": false,
  "travelStyle": null,
  "interests": [],
  "hasViolation": true,
  "violationReason": "Detected 'dupeczki' (Polish sexual slang) - violates content policy"
}
```

### Updated Prompt Logic

**Before:**
```
STEP 1: Check for violations
  → If found: STOP, return error, don't extract
  → If clean: Proceed to extraction

STEP 2: Extract (only if Step 1 passed)
```

**After:**
```
TASK 1: Extract travel information (ALWAYS)
  - Extract destination, days, travelers, etc.
  - Do this regardless of content

TASK 2: Check for inappropriate content
  - Scan for violations
  - If found: Set hasViolation: true
  - Add violationReason with details
```

## Implementation Changes

### 1. Updated Extraction Prompt (`extract-travel-info.ts`)

**Changed from:**
- "Stop immediately if inappropriate content found"
- "Return error format only"

**Changed to:**
- "Always extract travel information"
- "Add hasViolation and violationReason fields"
- "Return both extracted data AND security flags"

### 2. Updated Parsing Logic

**Before:**
```typescript
if (parsed.error) {
  return {
    destination: null,
    days: null,
    travelers: null,
    // ... all null
    securityError: "Violation detected"
  };
}
```

**After:**
```typescript
if (parsed.hasViolation && parsed.violationReason) {
  return {
    destination: parsed.destination || null,  // ✅ Keep extracted value
    days: parsed.days || null,                // ✅ Keep extracted value
    travelers: parsed.travelers || null,      // ✅ Keep extracted value
    // ... keep all extracted values
    securityError: `Violation: ${parsed.violationReason}`
  };
}
```

### 3. Updated Fallback String Detection

**Before:**
```typescript
if (descriptionLower.includes(inappropriateTerm)) {
  return {
    destination: null,  // ❌ Nulled out
    days: null,         // ❌ Nulled out
    // ...
    securityError: "Violation"
  };
}
```

**After:**
```typescript
if (descriptionLower.includes(inappropriateTerm)) {
  return {
    ...validated,  // ✅ Keep all extracted fields
    securityError: "Violation"
  };
}
```

## User Experience Flow

### Example: "wycieczka do paryża na dupeczki na 2 dni dla 2 osób"

1. **User types description** in any language
2. **AI extracts:**
   - Destination: "Paris" (translated from "paryża")
   - Days: 2 (from "na 2 dni")
   - Travelers: 2 (from "dla 2 osób")
3. **AI detects:** "dupeczki" = inappropriate content
4. **AI returns:** Extracted fields + hasViolation flag
5. **Form receives:**
   - extracted.destination = "Paris"
   - extracted.days = 2
   - extracted.travelers = 2
   - extracted.securityError = "Content policy violation..."
6. **Form prefills** destination, days, travelers
7. **Form shows** security alert modal
8. **Form blocks** submission
9. **User sees:**
   - ✅ Fields are filled with their valid input
   - ✅ Security alert explains the issue
   - ✅ Submit button is disabled
   - ✅ User can correct the description

## Benefits

### 1. **Better UX**
- Users see their valid input is recognized
- Fields are prefilled, saving time
- Clear feedback on what's wrong vs. what's correct

### 2. **Clear Communication**
- "We understood Paris, 2 days, 2 travelers"
- "BUT your description contains inappropriate content"
- Users know exactly what to fix

### 3. **Maintains Security**
- Inappropriate content is still detected
- Submission is still blocked
- Security alerts still show
- Logging still happens

### 4. **Reduces Frustration**
- Users don't have to re-enter valid information
- Form doesn't appear "broken" or "not understanding" them
- Clear path to resolution

## Testing

Test with:
```
"wycieczka do paryża na dupeczki na 2 dni dla 2 osób"
```

**Expected Result:**
- ✅ Destination field shows: "Paris"
- ✅ Days field shows: 2
- ✅ Travelers field shows: 2
- ✅ Security alert modal appears
- ✅ Submit button is disabled with "🚫 Security Violation Detected"

**Compare to before:**
- ❌ All fields were empty
- ✅ Security alert still appeared
- User had to manually fill everything after fixing the description

## Technical Details

- **File modified:** `src/lib/actions/extract-travel-info.ts`
- **Lines changed:** ~80 lines in prompt + parsing logic
- **New response fields:** `hasViolation` (boolean), `violationReason` (string)
- **Backward compatible:** Still works if AI returns old error format (rare edge case)
- **Fallback protection:** String detection also returns extracted fields now

## Security Maintained

All security layers remain intact:
- ✅ Layer 1: AI content policy check (now returns data + flag)
- ✅ Layer 1.4: Fallback string detection (now returns data + error)
- ✅ Layer 2: Destination validation (unchanged)
- ✅ Layer 3: Output validation (unchanged)
- ✅ Client-side: Form submission blocking (unchanged)
- ✅ Client-side: Secondary string check (unchanged)

The fix **improves UX without compromising security**.

