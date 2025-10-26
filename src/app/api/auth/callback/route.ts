import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const itineraryId = requestUrl.searchParams.get('itineraryId');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('OAuth callback error:', error);
      // Redirect to sign-in with error
      return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
    }
  }

  // Redirect to home with itineraryId if present
  if (itineraryId) {
    return NextResponse.redirect(`${origin}/?itineraryId=${itineraryId}`);
  }
  
  return NextResponse.redirect(`${origin}/`);
}


