/**
 * Anonymous Session Management
 * 
 * SECURITY: Prevents anonymous users from bypassing rate limits by:
 * 1. Generating server-side session tokens (stored in httpOnly cookies)
 * 2. Tracking sessions in database with strict limits
 * 3. Browser fingerprinting for additional validation
 * 4. IP + session + fingerprint triple-layer tracking
 * 
 * CRITICAL FIX: Anonymous itinerary creation costs real money via OpenRouter API.
 * Without server-side session tracking, users could:
 * - Create draft → Refresh page → Create another draft (repeat)
 * - Clear sessionStorage to bypass UI lockout
 * - Cost significant money in API calls before IP limit kicks in
 */

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const ANONYMOUS_SESSION_COOKIE = 'anon_session_token';
const SESSION_DURATION_HOURS = 24;

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a simple browser fingerprint from headers
 * This is not foolproof but adds an extra layer of tracking
 */
export async function generateBrowserFingerprint(): Promise<string> {
  const headers = await import('next/headers').then(m => m.headers());
  
  const userAgent = headers.get('user-agent') || '';
  const acceptLanguage = headers.get('accept-language') || '';
  const acceptEncoding = headers.get('accept-encoding') || '';
  
  // Create a hash from browser characteristics
  const fingerprint = crypto
    .createHash('sha256')
    .update(userAgent + acceptLanguage + acceptEncoding)
    .digest('hex');
  
  return fingerprint;
}

/**
 * Get or create anonymous session
 * Returns session info including whether user can create more itineraries
 */
export async function getOrCreateAnonymousSession(): Promise<{
  sessionToken: string;
  sessionId: string;
  itinerariesCreated: number;
  canCreateItinerary: boolean;
  isBlocked: boolean;
  blockedUntil?: Date;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    
    // Get client IP
    const { getClientIP } = await import('@/lib/utils/get-client-ip');
    const clientIP = await getClientIP();
    
    // Generate browser fingerprint
    const browserFingerprint = await generateBrowserFingerprint();
    
    // Get user agent
    const headers = await import('next/headers').then(m => m.headers());
    const userAgent = headers.get('user-agent') || '';
    
    // Check for existing session token in cookie
    let sessionToken = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;
    
    // If no token, generate new one
    if (!sessionToken) {
      sessionToken = generateSessionToken();
    }
    
    // Get or create session in database
    const { data: sessionData, error } = await supabase.rpc(
      'get_or_create_anonymous_session',
      {
        p_session_token: sessionToken,
        p_ip_address: clientIP,
        p_browser_fingerprint: browserFingerprint,
        p_user_agent: userAgent,
      }
    );
    
    if (error) {
      return {
        sessionToken: '',
        sessionId: '',
        itinerariesCreated: 0,
        canCreateItinerary: false,
        isBlocked: true,
        error: 'Failed to create session',
      };
    }
    
    // Set cookie (httpOnly for security)
    cookieStore.set(ANONYMOUS_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_HOURS * 60 * 60, // 24 hours
      path: '/',
    });
    
    const session = sessionData as {
      session_id: string;
      itineraries_created: number;
      blocked_until: string | null;
    };
    const isBlocked = session.blocked_until ? new Date(session.blocked_until) > new Date() : false;
    const itinerariesCreated = session.itineraries_created || 0;
    
    // Limit: 2 itineraries per week
    const canCreateItinerary = !isBlocked && itinerariesCreated < 2;
    
    return {
      sessionToken,
      sessionId: session.session_id,
      itinerariesCreated,
      canCreateItinerary,
      isBlocked,
      blockedUntil: session.blocked_until ? new Date(session.blocked_until) : undefined,
    };
  } catch {
    return {
      sessionToken: '',
      sessionId: '',
      itinerariesCreated: 0,
      canCreateItinerary: false,
      isBlocked: true,
      error: 'Exception creating session',
    };
  }
}

/**
 * Validate anonymous session before allowing itinerary creation
 */
export async function validateAnonymousSession(): Promise<{
  valid: boolean;
  sessionToken?: string;
  reason?: string;
  requireAuth?: boolean;
}> {
  try {
    const session = await getOrCreateAnonymousSession();
    
    if (session.error) {
      return {
        valid: false,
        reason: 'Failed to validate session. Please refresh the page.',
      };
    }
    
    if (session.isBlocked) {
      return {
        valid: false,
        reason: `Your session is temporarily blocked. Please try again later.`,
      };
    }
    
    if (!session.canCreateItinerary) {
      return {
        valid: false,
        reason: 'You have reached your limit of 2 free itineraries this week. Please sign in to create unlimited travel plans.',
        requireAuth: true,
      };
    }
    
    return {
      valid: true,
      sessionToken: session.sessionToken,
    };
  } catch {
    return {
      valid: false,
      reason: 'Session validation failed. Please refresh the page.',
    };
  }
}

/**
 * Clear anonymous session (used after user authenticates)
 */
export async function clearAnonymousSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(ANONYMOUS_SESSION_COOKIE);
  } catch {
    // Silent fail - cookie may not exist
  }
}

/**
 * Track suspicious behavior (e.g., rapid page refreshes)
 */
export async function trackRefreshAttempt(sessionToken: string): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get session
    const { data: sessions } = await supabase
      .from('anonymous_sessions')
      .select('id, refresh_attempts')
      .eq('session_token', sessionToken)
      .single();
    
    if (!sessions) return;
    
    const newRefreshCount = (sessions.refresh_attempts || 0) + 1;
    
    // Block session if too many refresh attempts (possible abuse)
    if (newRefreshCount >= 10) {
      await supabase
        .from('anonymous_sessions')
        .update({
          refresh_attempts: newRefreshCount,
          blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour block
          blocked_reason: 'Too many suspicious refresh attempts',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessions.id);
    } else {
      await supabase
        .from('anonymous_sessions')
        .update({
          refresh_attempts: newRefreshCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessions.id);
    }
  } catch {
    // Silent fail - tracking is not critical
  }
}

/**
 * Track Turnstile verification completion
 */
export async function trackTurnstileVerification(sessionToken: string): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Increment turnstile verifications counter
    const { data: session } = await supabase
      .from('anonymous_sessions')
      .select('turnstile_verifications')
      .eq('session_token', sessionToken)
      .single();
    
    if (session) {
      await supabase
        .from('anonymous_sessions')
        .update({
          turnstile_verifications: (session.turnstile_verifications || 0) + 1,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('session_token', sessionToken);
    }
  } catch {
    // Silent fail - tracking is not critical
  }
}

