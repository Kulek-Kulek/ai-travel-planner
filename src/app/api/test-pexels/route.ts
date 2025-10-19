import { fetchDestinationPhoto } from '@/lib/pexels/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.PEXELS_API_KEY) {
      return NextResponse.json({
        error: 'PEXELS_API_KEY is not configured in .env.local',
        configured: false,
      });
    }

    // Test fetching a photo
    const photo = await fetchDestinationPhoto('Beach', 'tropical paradise');

    if (!photo) {
      return NextResponse.json({
        error: 'Failed to fetch photo from Pexels. API key might be invalid.',
        configured: true,
        apiKeyPresent: true,
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      photo,
      message: 'Pexels API is working correctly!',
    });
  } catch (error) {
    console.error('Pexels test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      configured: !!process.env.PEXELS_API_KEY,
    });
  }
}

