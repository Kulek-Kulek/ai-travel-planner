import { signOut } from '@/lib/actions/auth-actions';
import { NextResponse } from 'next/server';

// POST-only for CSRF protection (state-changing operations should never use GET)
export async function POST() {
  await signOut();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}


