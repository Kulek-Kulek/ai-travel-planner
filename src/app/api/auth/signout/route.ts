import { signOut } from '@/lib/actions/auth-actions';
import { NextResponse } from 'next/server';

export async function POST() {
  await signOut();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}

export async function GET() {
  await signOut();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}

