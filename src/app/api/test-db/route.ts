import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test 1: Check connection
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Test 2: Try to read from itineraries (should work for public)
    const { data: publicItineraries, error: readError } = await supabase
      .from('itineraries')
      .select('id')
      .eq('is_private', false)
      .limit(1);
    
    // Test 3: Try to insert (should fail without proper data, but we can see the error)
    const { error: insertError } = await supabase
      .from('itineraries')
      .insert({
        user_id: null,
        destination: 'Test',
        days: 1,
        travelers: 1,
        notes: null,
        ai_plan: { city: 'Test', days: [] },
        tags: [],
        is_private: false,
      })
      .select('id')
      .single();
    
    return NextResponse.json({
      status: 'ok',
      tests: {
        connection: 'success',
        user: user ? { id: user.id, email: user.email } : 'anonymous',
        userError: userError?.message || null,
        readTest: readError ? `failed: ${readError.message}` : `success (${publicItineraries?.length || 0} found)`,
        insertTest: insertError ? `failed: ${insertError.message}` : 'success',
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

