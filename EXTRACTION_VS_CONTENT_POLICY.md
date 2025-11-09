# Extraction Logic: Invalid Destinations vs Inappropriate Content

## 🎯 The Key Distinction

There are **two different types of problematic requests** that require **different handling**:

### Type 1: Invalid Destinations (Silly but Not Offensive)
❓ **What**: Nonsensical destinations that aren't real travel places
📍 **Examples**: kitchen, bedroom, Hogwarts, Narnia
🔧 **Handling**: **Extract them normally** → Catch with destination validation later

### Type 2: Inappropriate Content (Policy Violations)
🚫 **What**: Content that violates our content policy
📍 **Examples**: Sexual references, drugs, violence, hate speech
🔧 **Handling**: **Return error format immediately** → Show security alert

## 📋 Detailed Examples

### Case 1: Invalid Destination (Extract Normally)

```typescript
Input: "wycieczka do kuchni po kiełbasę na 2 dni"
Translation: "trip to the kitchen for sausage for 2 days"

Analysis:
- "kuchni" = kitchen (not a real travel destination)
- "kiełbasę" = sausage (silly request)
- BUT: No policy violations (not sexual, not drugs, just silly)

Extraction Result:
{
  "destination": "kitchen",  // ✅ Extract it
  "days": 2,                 // ✅ Extract it
  "travelers": null,
  ...
}

What Happens Next:
1. Form shows: Destination="kitchen", Days=2
2. validateDestinationWithAI() is called
3. AI says: "kitchen is a household location, not a travel destination"
4. Security alert appears: "Invalid Destination: 'kitchen' is not a valid travel destination"
```

### Case 2: Inappropriate Content (Return Error Immediately)

```typescript
Input: "wycieczka do paryża na dupeczki na 2 dni dla 2 osób"
Translation: "trip to Paris for sexual encounters for 2 days for 2 people"

Analysis:
- "paryża" = Paris (valid destination)
- "dupeczki" = Polish sexual slang (POLICY VIOLATION)
- INAPPROPRIATE CONTENT DETECTED

Extraction Result:
{
  "error": "content_policy_violation",
  "violation_type": "sexual_content",
  "reason": "Contains inappropriate sexual slang ('dupeczki' in Polish)"
}

What Happens Next:
1. securityError is set
2. Security alert modal appears immediately
3. Message: "Content Policy Violation: This request contains inappropriate sexual content..."
4. Destination field stays EMPTY (no extraction happened)
```

## 🤔 Why This Distinction?

### Why Extract Invalid Destinations?

**Reason 1: Better UX**
- User types "trip to kitchen for 2 days"
- Form shows: Destination="kitchen", Days=2 ✅
- Clear error: "Kitchen is not a valid travel destination"
- User understands the problem and can correct it

vs.

- User types "trip to kitchen for 2 days"
- Form shows: Destination=(empty), Days=(empty) ❌
- Confusing: Why didn't it extract anything?

**Reason 2: Separation of Concerns**
- Extraction job: Extract facts from text
- Validation job: Check if facts are valid
- Content policy job: Check for policy violations

**Reason 3: Different Error Messages**
- Invalid destination → "Kitchen is a household location" (helpful)
- Policy violation → "Contains inappropriate sexual content" (serious)

### Why Don't Extract When Policy Violated?

**Reason 1: Security First**
- Policy violations are serious (sexual, drugs, violence)
- Must block immediately, before any processing
- Don't want to display ANY extracted info from inappropriate requests

**Reason 2: Clear Signal**
- Returning error format → Clear policy violation
- User sees security alert modal → Understands severity

**Reason 3: No Further Processing**
- Invalid destination → Proceeds to validation layer
- Policy violation → Stops immediately, no further processing

## 🔄 Complete Flow Comparison

### Flow A: Invalid Destination (Kitchen)

```
Input: "trip to kitchen for 2 days"
   ↓
Extraction AI:
- Check: Inappropriate content? → NO
- Check: Valid destination? → Not my job (extract anyway)
- Extract: destination="kitchen", days=2
   ↓
Form displays:
- Destination: kitchen ✅
- Days: 2 ✅
   ↓
Destination Validation:
- validateDestinationWithAI("kitchen")
- AI: "Kitchen is a household location"
- Returns: {isValid: false, reason: "..."}
   ↓
Security Alert:
❌ Invalid Destination: "kitchen" is not a valid travel destination.
Kitchen is a household location, not a travel destination.
```

### Flow B: Inappropriate Content (Sexual Slang)

```
Input: "wycieczka do paryża na dupeczki"
   ↓
Extraction AI:
- Check: Inappropriate content? → YES ("dupeczki" = sexual slang)
- Return error format immediately
- NO extraction happens
   ↓
Code receives:
{
  error: "content_policy_violation",
  violation_type: "sexual_content",
  reason: "Contains inappropriate sexual slang..."
}
   ↓
Form displays:
- Destination: (empty) ✅ (We don't want to show anything)
- Days: (empty) ✅
   ↓
Security Alert:
❌ Content Policy Violation: This request contains inappropriate sexual 
content or references, which violates our content policy.
```

## 🧪 Test Cases

### Should Extract + Validate Later

```typescript
✅ "wycieczka do kuchni" → Extract "kitchen" → Validate → Block
✅ "trip to bedroom" → Extract "bedroom" → Validate → Block
✅ "viaje a la cocina" → Extract "kitchen" → Validate → Block
✅ "voyage à Poudlard" → Extract "Hogwarts" → Validate → Block
✅ "trip to my closet" → Extract "closet" → Validate → Block
```

**Expected Behavior**:
- Form shows: Destination=(extracted), Days=(extracted)
- Security alert appears from validation
- Message explains why destination is invalid

### Should Return Error Immediately

```typescript
❌ "wycieczka do paryża na dupeczki" → Error format immediately
❌ "trip to Barcelona para follar" → Error format immediately
❌ "voyage à Paris pour baiser" → Error format immediately
❌ "trip to buy cocaine in Colombia" → Error format immediately
❌ "visit with racist slurs" → Error format immediately
```

**Expected Behavior**:
- Form shows: Destination=(empty), Days=(empty)
- Security alert appears from extraction
- Message explains content policy violation

## 📝 Prompt Instructions Summary

```typescript
// For AI extraction:

STEP 1: Check for Policy Violations
- Scan for: sexual content, drugs, violence, hate speech
- If found: Return error format immediately

STEP 2: Extract Information
- Extract destination (even if silly like "kitchen")
- Extract days, travelers, etc.
- Translation: "kuchni" → "kitchen", "Paryża" → "Paris"

KEY DISTINCTION:
- Invalid destinations (kitchen, Hogwarts) → Extract them ✅
  * They're silly but not offensive
  * Validation will catch them
  * Better UX (user sees what was extracted)

- Inappropriate content (dupeczki, follar) → Error format ❌
  * Policy violation is serious
  * Block immediately
  * Don't extract anything
```

## ✅ Expected Behavior Fixed

### Before Fix:
```
Input: "wycieczka do paryża na dupeczki na 2 dni dla 2 osób"
Result: Destination=(empty), Days=(empty), No alert ❌
Problem: AI was confused, returned null instead of error
```

### After Fix:
```
Input: "wycieczka do paryża na dupeczki na 2 dni dla 2 osób"
Result: Security alert appears ✅
Message: "Content Policy Violation: Contains inappropriate sexual slang ('dupeczki' in Polish)"
```

### Also Works For:
```
Input: "wycieczka do kuchni po kiełbasę na 2 dni"
Result: Destination="kitchen", Days=2, then validation blocks ✅
Message: "Invalid Destination: 'kitchen' is not a valid travel destination"
```

## 🎯 Key Takeaway

**Two-tier system**:

**Tier 1: Content Policy** (extraction phase)
→ Blocks: Sexual, drugs, violence, hate speech
→ Action: Return error format, show security alert
→ Severity: High (policy violation)

**Tier 2: Destination Validation** (validation phase)
→ Blocks: Household items, fictional places, nonsense
→ Action: Extract first, then validate, then show alert
→ Severity: Medium (silly request)

Both show security alerts, but handle differently internally for better UX and security.

