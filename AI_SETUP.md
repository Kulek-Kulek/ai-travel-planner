# 🤖 AI Integration Setup Guide

## ✅ What's Been Integrated

AI-powered itinerary generation is now fully integrated into your app!

### Files Created/Modified

1. **`src/lib/openrouter/client.ts`** - OpenRouter API client
2. **`src/lib/actions/ai-actions.ts`** - Server Action for AI generation
3. **`src/app/page.tsx`** - Updated to use real AI

## 🔑 Setup Steps

### Step 1: Get Your OpenRouter API Key

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up or log in
3. Go to **Keys** section
4. Create a new API key
5. Copy the key (starts with `sk-or-...`)

### Step 2: Create Environment File

Create a file named `.env.local` in the `travel-planner/` directory:

```bash
# OpenRouter AI (Required)
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here

# App URL (Optional, for OpenRouter tracking)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (Not needed yet, for future auth)
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Important:** 
- Replace `sk-or-v1-your-actual-key-here` with your actual OpenRouter API key
- Never commit `.env.local` to git (it's already in `.gitignore`)

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
cd travel-planner
npm run dev
```

The server needs to restart to pick up the new environment variables.

### Step 4: Test It!

1. Visit http://localhost:3001 (or whatever port Next.js shows)
2. Fill out the form:
   - **Destination:** "Paris, France"
   - **Days:** 3
   - **Travelers:** 2
   - **Notes:** "Interested in art museums and local cafes"
3. Click **"✨ Generate Itinerary"**
4. Wait 10-20 seconds
5. See your AI-generated itinerary! 🎉

## 🏗️ How It Works

### Architecture

```
Client Component (page.tsx)
         ↓
Server Action (ai-actions.ts)
         ↓
OpenRouter Client (client.ts)
         ↓
Claude 3.5 Sonnet AI
         ↓
Validated JSON Response
         ↓
Display in UI
```

### Server Action Pattern

```typescript
// Server Action with 'use server' directive
export async function generateItinerary(input) {
  // 1. Validate input with Zod
  const validated = schema.parse(input);
  
  // 2. Call OpenRouter API (server-side only)
  const completion = await openrouter.chat.completions.create({...});
  
  // 3. Validate AI response with Zod
  const validatedResponse = aiResponseSchema.parse(response);
  
  // 4. Return typed result
  return { success: true, data: validatedResponse };
}
```

### Security Features

✅ **Server-side only** - API key never exposed to client  
✅ **Input validation** - Zod schemas prevent invalid data  
✅ **Output validation** - AI responses are validated before use  
✅ **Error handling** - Graceful failure with user-friendly messages  
✅ **Type safety** - Full TypeScript support throughout

## 🎯 Features Implemented

### 1. AI Model
- **Model:** Claude 3.5 Sonnet (Anthropic)
- **Why:** Best balance of quality, speed, and cost
- **Temperature:** 0.7 (creative but consistent)
- **Max Tokens:** 2000 (plenty for itineraries)

### 2. Prompt Engineering
The prompt includes:
- Destination and duration
- Number of travelers
- User's custom notes
- Specific JSON structure requirements
- Practical travel considerations

### 3. Response Validation
```typescript
{
  city: string,
  days: [
    {
      title: "Day 1",
      places: [
        {
          name: string,
          desc: string,
          time: string
        }
      ]
    }
  ]
}
```

### 4. Error Handling
Catches and handles:
- Missing API key
- Rate limiting
- Invalid responses
- Network errors
- Parsing errors

## 💰 Cost Estimates

OpenRouter pricing for Claude 3.5 Sonnet (as of setup):
- ~$0.01-0.03 per itinerary generation
- $5 credit gives you 200-500 generations
- Perfect for development and testing

## 🧪 Testing Scenarios

### Test 1: Simple Request
```
Destination: Tokyo, Japan
Days: 3
Travelers: 1
Notes: (empty)
```
**Expected:** General 3-day Tokyo itinerary

### Test 2: Specific Requirements
```
Destination: Paris, France
Days: 5
Travelers: 2
Notes: We love art museums, French cuisine, and romantic spots. Vegetarian options preferred.
```
**Expected:** Detailed itinerary with museums, restaurants, romantic locations

### Test 3: Time-Specific
```
Destination: Barcelona, Spain
Days: 4
Travelers: 4
Notes: Starting afternoon on day 1, need family-friendly activities
```
**Expected:** Adjusted first-day timing, family-appropriate suggestions

## ⚠️ Troubleshooting

### Error: "AI service is not configured"
**Solution:** Add `OPENROUTER_API_KEY` to `.env.local` and restart server

### Error: "Invalid API key"
**Solution:** 
1. Check your API key is correct
2. Ensure it starts with `sk-or-`
3. Verify you copied it completely

### Error: "Rate limit exceeded"
**Solution:** Wait a minute and try again (free tier has rate limits)

### Error: "Failed to generate itinerary"
**Solution:**
1. Check your internet connection
2. Verify OpenRouter.ai is accessible
3. Check browser console for detailed error

### AI Returns Malformed JSON
**Solution:** The validation will catch this and return an error. Try again - AI is stochastic.

## 🔍 Monitoring

### Check OpenRouter Dashboard
1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. View **Activity** tab
3. See:
   - Request counts
   - Token usage
   - Cost per request
   - Error rates

### Local Logging
Server Action logs errors to console:
```bash
# Watch your terminal for:
- Validation errors
- API errors  
- Response parsing issues
```

## 🚀 Next Steps

Now that AI is working, you can:

1. **Add Authentication** - Let users save itineraries
2. **Add Credit System** - Limit generations per user
3. **Save to Database** - Store generated itineraries
4. **Add Editing** - Let users modify AI suggestions
5. **Export Features** - PDF, email, share links

## 📚 Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

---

**Status:** ✅ Ready to Generate Itineraries
**Created:** ${new Date().toISOString()}

