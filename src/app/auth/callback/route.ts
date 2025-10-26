import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const itineraryId = requestUrl.searchParams.get('itineraryId');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // After email confirmation, redirect to plan selection
    const planSelectionUrl = `${origin}/choose-plan${itineraryId ? `?itineraryId=${itineraryId}` : ''}`;
    return NextResponse.redirect(planSelectionUrl);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`);
}

