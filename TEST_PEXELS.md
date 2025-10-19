# Pexels Troubleshooting

## Quick Checks:

### 1. Check .env.local file:
```bash
# Open travel-planner/.env.local
# Should have:
PEXELS_API_KEY=your-actual-api-key-here
```

### 2. Restart server:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 3. Check browser console (F12):
- Look for "Searching Pexels for: ..." message
- Look for any errors

### 4. Check server terminal:
- Look for "PEXELS_API_KEY not configured" warning
- Look for "Searching Pexels for: ..." logs

## Common Issues:

### Issue 1: API Key Not Set
**Symptom:** Server logs show "PEXELS_API_KEY not configured"
**Fix:** Add API key to .env.local and restart

### Issue 2: Wrong API Key Format
**Symptom:** Pexels API errors in console
**Fix:** Make sure you copied the entire API key from Pexels

### Issue 3: Server Not Restarted
**Symptom:** Old images still showing, new env not loaded
**Fix:** Stop server completely and restart

### Issue 4: Cache Issue
**Symptom:** Old Unsplash images cached
**Fix:** Hard refresh browser (Ctrl+Shift+R)

## Test Steps:

1. Generate NEW itinerary (e.g., "Barcelona, 3 days")
2. Check if photo appears
3. If no photo, open browser DevTools Console (F12)
4. Look for error messages
5. Share the error with me

