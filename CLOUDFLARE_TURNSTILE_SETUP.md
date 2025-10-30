# Cloudflare Turnstile Setup Guide

This guide explains how to set up Cloudflare Turnstile for bot protection on your AI Travel Planner application.

## Why Turnstile?

Since generating itineraries costs money (OpenRouter API calls), we need to protect against bots that could abuse the system and generate excessive costs. Cloudflare Turnstile provides:

- 🤖 Bot protection without annoying CAPTCHAs
- 🔒 Free for most use cases
- 🚀 User-friendly experience
- 🔐 Privacy-focused

## Setup Instructions

### 1. Create a Turnstile Site

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Log in or create a free account
3. Navigate to **Turnstile** in the sidebar
4. Click **Add Site**
5. Configure your site:
   - **Site Name**: AI Travel Planner
   - **Domain**: Add your production domain (e.g., `yourdomain.com`)
   - For development, also add: `localhost`
   - **Widget Mode**: Managed (recommended)
   - **Widget Type**: Visible Widget

### 2. Get Your Keys

After creating the site, you'll receive:
- **Site Key** (public) - Used in your frontend
- **Secret Key** (private) - Used for server-side verification

### 3. Add Environment Variables

Add these variables to your `.env.local` file:

```bash
# Cloudflare Turnstile - Bot Protection
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here
```

⚠️ **Important**: Never commit your `.env.local` file to version control!

### 4. Testing

#### Development Mode
For local testing, Turnstile provides a test site key that always passes:
```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

#### Production Mode
Make sure to use your real keys in production. Add them to your hosting platform's environment variables:

**Vercel:**
1. Go to your project settings
2. Navigate to Environment Variables
3. Add both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`

**Other platforms:**
Follow their specific instructions for adding environment variables.

## How It Works

1. **Frontend**: When a user fills out the itinerary form, the Turnstile widget verifies they're human
2. **Token Generation**: Upon successful verification, Turnstile generates a one-time token
3. **Submission**: The token is included with the form submission
4. **Backend Verification**: The server verifies the token with Cloudflare before generating the itinerary
5. **Protection**: Invalid tokens or missing tokens result in rejected requests

## Testing Your Setup

1. Start your development server: `npm run dev`
2. Navigate to the homepage
3. Fill out the itinerary form
4. You should see the Turnstile widget appear before the submit button
5. Complete the verification and submit the form
6. Check the browser console and server logs for verification success messages

## Troubleshooting

### Widget Not Showing
- Check that `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set correctly
- Verify the site key is for the correct domain
- Clear your browser cache and refresh

### Verification Failing
- Check that `TURNSTILE_SECRET_KEY` is set on the server
- Verify your domain is added to the allowed domains in Turnstile dashboard
- Check server logs for specific error messages

### Widget Showing "Error"
- Your site key might be invalid
- The domain might not be configured correctly
- Check Cloudflare dashboard for any site configuration issues

## Security Best Practices

1. ✅ Always verify tokens on the server-side (already implemented)
2. ✅ Never expose your secret key in client-side code
3. ✅ Use environment variables for all keys
4. ✅ Rotate keys periodically for production
5. ✅ Monitor your Turnstile dashboard for suspicious activity

## Cost

Cloudflare Turnstile is **free** for:
- Up to 1 million verifications per month
- Unlimited sites

For most applications, this is more than sufficient. If you need more, check Cloudflare's pricing.

## Additional Resources

- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Turnstile Dashboard](https://dash.cloudflare.com/)
- [API Documentation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## Support

If you encounter issues, check:
1. Cloudflare Turnstile Dashboard for errors
2. Server logs for verification failures
3. Browser console for client-side errors
4. Ensure all environment variables are set correctly

