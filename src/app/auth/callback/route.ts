import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isValidUUID } from '@/lib/utils/validation';

/**
 * Auth callback handler
 * CRIT-3 fix: Validates UUID to prevent open redirect vulnerability
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const itineraryId = requestUrl.searchParams.get('itineraryId');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // CRIT-3 fix: Validate itineraryId before using in redirect
    const validItineraryId = isValidUUID(itineraryId) ? itineraryId : null;
    
    // Build safe redirect URL
    const planSelectionUrl = validItineraryId
      ? `${origin}/choose-plan?itineraryId=${validItineraryId}`
      : `${origin}/choose-plan`;
      
    return NextResponse.redirect(planSelectionUrl);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`);
}

