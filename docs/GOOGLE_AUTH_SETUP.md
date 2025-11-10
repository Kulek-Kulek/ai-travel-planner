# Google OAuth Authentication Setup Guide

This guide explains how to configure Google OAuth authentication for the AI Travel Planner application using Supabase.

## Overview

The application now supports Google OAuth authentication alongside traditional email/password authentication. Users can sign in or sign up using their Google accounts with a single click.

## Features Implemented

- ✅ Google OAuth sign-in button on the sign-in page
- ✅ Google OAuth sign-up button on the sign-up page
- ✅ Google OAuth button in mobile navigation menu
- ✅ OAuth callback handler for processing authentication
- ✅ Preserves `itineraryId` through the OAuth flow (for saving drafts)
- ✅ Beautiful UI with Google branding
- ✅ Proper error handling and user feedback
- ✅ Responsive design for all screen sizes

## Configuration Steps

### 1. Set Up Google Cloud Console

1. **Create a Google Cloud Project** (if you don't have one):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Click "Select a project" > "New Project"
   - Name your project (e.g., "AI Travel Planner")
   - Click "Create"

2. **Enable Google+ API**:
   - In the Google Cloud Console, go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click on it and press "Enable"

3. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" user type (unless you have a Google Workspace)
   - Fill in the required fields:
     - **App name**: AI Travel Planner
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click "Save and Continue"
   - Add scopes (required):
     - `./auth/userinfo.email`
     - `./auth/userinfo.profile`
     - `openid`
   - Click "Save and Continue"
   - Add test users if in testing mode
   - Click "Save and Continue"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Name it (e.g., "AI Travel Planner Web Client")
   - Add **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - Add **Authorized redirect URIs**:
     - `https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/auth/v1/callback`
     - Find your project ID in your Supabase dashboard URL
   - Click "Create"
   - **Save** the Client ID and Client Secret (you'll need these)

### 2. Configure Supabase

1. **Go to Supabase Dashboard**:
   - Navigate to your project at [Supabase](https://supabase.com/dashboard)

2. **Enable Google Provider**:
   - Go to "Authentication" > "Providers"
   - Find "Google" in the list
   - Toggle it to "Enabled"

3. **Add Google Credentials**:
   - Paste your **Client ID** from Google Cloud Console
   - Paste your **Client Secret** from Google Cloud Console
   - Click "Save"

4. **Configure Site URL** (Authentication Settings):
   - Go to "Authentication" > "URL Configuration"
   - Set **Site URL** to your production URL (e.g., `https://yourdomain.com`)
   - Add **Redirect URLs**:
     - `http://localhost:3000/**` (for development)
     - `https://yourdomain.com/**` (for production)

### 3. Set Environment Variables

Ensure you have these environment variables in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Set this for production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 4. Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test Sign-In Flow**:
   - Navigate to `/sign-in`
   - Click "Continue with Google"
   - Sign in with your Google account
   - Verify you're redirected to the home page authenticated

3. **Test Sign-Up Flow**:
   - Navigate to `/sign-up`
   - Click "Continue with Google"
   - Sign in with a new Google account
   - Verify you're redirected and a new user profile is created

## How It Works

### Authentication Flow

1. **User clicks "Continue with Google"**:
   - Triggers `signInWithGoogle()` server action
   - Preserves `itineraryId` in sessionStorage if present

2. **Supabase redirects to Google**:
   - User authenticates with Google
   - Google redirects back to Supabase with authorization code

3. **Supabase processes OAuth**:
   - Exchanges code for user tokens
   - Creates or updates user in Supabase Auth

4. **Callback handler processes result**:
   - `/api/auth/callback` receives the code
   - Exchanges code for session via `supabase.auth.exchangeCodeForSession()`
   - Redirects to home page with `itineraryId` if present

### Key Files

- **`src/lib/actions/auth-actions.ts`**: Contains `signInWithGoogle()` server action
- **`src/app/api/auth/callback/route.ts`**: OAuth callback handler
- **`src/app/(auth)/sign-in/page.tsx`**: Sign-in page with Google button
- **`src/app/(auth)/sign-up/page.tsx`**: Sign-up page with Google button
- **`src/components/mobile-nav.tsx`**: Mobile navigation with Google sign-in option

## User Profile Creation

When a user signs in with Google for the first time:

1. Supabase Auth creates a new user record automatically
2. The user's email and name are populated from their Google account
3. A profile is created in the `profiles` table via database trigger
4. User metadata includes:
   - `email`: From Google account
   - `full_name`: From Google account
   - `avatar_url`: Google profile picture URL
   - `provider`: Set to "google"

## Handling the Name Field

For Google OAuth users, the name is automatically populated from their Google account profile. The `name` field in the sign-up form is only required for email/password registration.

If you need to prompt Google users to set a custom display name, you can:
- Add a profile setup step after first OAuth sign-in
- Check if `user_metadata.name` is set in the profile
- Redirect to `/profile` for first-time users

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- **Solution**: Ensure the redirect URI in Google Cloud Console exactly matches: 
  `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`

### "Error 401: Invalid client"
- **Solution**: Double-check that you copied the correct Client ID and Client Secret to Supabase

### "Access blocked: This app's request is invalid"
- **Solution**: Make sure you've configured the OAuth consent screen and added required scopes

### OAuth works locally but not in production
- **Solution**: 
  1. Add your production domain to "Authorized JavaScript origins" in Google Cloud Console
  2. Add your production domain to Supabase "Redirect URLs"
  3. Set `NEXT_PUBLIC_APP_URL` environment variable in production

### User not redirected after OAuth
- **Solution**: Check that `/api/auth/callback` route is accessible and returning valid responses

### ItineraryId not preserved
- **Solution**: Verify that sessionStorage is being set before OAuth redirect and the callback is properly handling the parameter

## Security Considerations

1. **Client Secret**: Keep your Google Client Secret secure. Never commit it to version control.
2. **Redirect URIs**: Only whitelist trusted domains to prevent OAuth hijacking.
3. **HTTPS**: Always use HTTPS in production for OAuth callbacks.
4. **Token Storage**: Supabase handles secure token storage via HTTP-only cookies.

## Additional Resources

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify all configuration steps above
4. Ensure environment variables are set correctly

