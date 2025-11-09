/**
 * Cloudflare Turnstile server-side verification
 * 
 * Verifies the Turnstile token to prevent bot abuse
 */

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error('❌ TURNSTILE_SECRET_KEY is not configured');
    // ONLY bypass in true local development (not preview, not production)
    const isLocalDevelopment = process.env.NODE_ENV === 'development' && !process.env.VERCEL_ENV;
    if (isLocalDevelopment) {
      console.warn('⚠️ Turnstile bypassed for LOCAL development only');
      return true;
    }
    // Fail closed for all deployed environments (preview and production)
    console.error('🚫 Turnstile verification FAILED - missing secret key in deployed environment');
    return false;
  }

  if (!token) {
    console.error('❌ No Turnstile token provided');
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    
    // Optional: include remote IP for additional validation
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Turnstile verification request failed:', data);
      return false;
    }

    if (!data.success) {
      console.warn('⚠️ Turnstile verification failed:', data['error-codes']);
      return false;
    }

    console.log('✅ Turnstile verification successful');
    return true;
  } catch (error) {
    console.error('❌ Turnstile verification error:', error);
    return false;
  }
}

