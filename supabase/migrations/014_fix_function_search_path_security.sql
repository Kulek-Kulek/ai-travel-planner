-- Migration: Fix Function Search Path Security Warnings
-- 
-- This migration addresses Supabase Security Advisor warnings about
-- functions with mutable search paths by:
-- 1. Adding SECURITY DEFINER to all trigger functions
-- 2. Setting fixed search_path to prevent search path injection attacks
--
-- Affected functions:
-- - handle_new_user()
-- - handle_profiles_updated_at()
-- - handle_itineraries_updated_at()

-- ============================================================
-- Fix handle_new_user() function
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      ''
    )
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up. Uses SECURITY DEFINER with fixed search_path for security.';

-- ============================================================
-- Fix handle_profiles_updated_at() function
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_profiles_updated_at() IS 'Automatically updates the updated_at timestamp on profile changes. Uses SECURITY DEFINER with fixed search_path for security.';

-- ============================================================
-- Fix handle_itineraries_updated_at() function
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_itineraries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_itineraries_updated_at() IS 'Automatically updates the updated_at timestamp on itinerary changes. Uses SECURITY DEFINER with fixed search_path for security.';

-- Verify functions are properly configured
-- You can check the function definitions with:
-- SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname LIKE 'handle_%';

