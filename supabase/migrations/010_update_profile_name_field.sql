-- Migration: Update profile trigger to use 'name' instead of 'full_name'
-- This aligns with the updated signup form that uses a flexible 'name' field

-- Create or replace the function (no drop needed - automatically replaces)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Anonymous')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger (necessary because you can't ALTER trigger logic)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update comment
COMMENT ON COLUMN profiles.full_name IS 'User display name - can be first name, full name, or nickname';

