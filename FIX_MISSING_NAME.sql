-- Quick Fix: Update your profile with your name
-- Run this in Supabase SQL Editor while logged in

-- Check current profile
SELECT id, email, full_name FROM profiles WHERE id = auth.uid();

-- Update your name (replace 'Your Name' with your actual name)
UPDATE profiles
SET full_name = 'Kris'  -- Change this to your preferred name
WHERE id = auth.uid();

-- Verify it worked
SELECT id, email, full_name FROM profiles WHERE id = auth.uid();

