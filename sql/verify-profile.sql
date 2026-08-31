-- ============================================
-- MEMBO V1 - Profile Verification and Manual Creation
-- ============================================
-- Run this in Supabase SQL Editor to verify and fix missing profiles
-- ============================================

-- STEP 1: Verify if your profile exists
-- Replace 'YOUR_USER_UUID' with your actual user ID from auth.users
-- You can find your user ID by running: SELECT id, email FROM auth.users;

SELECT
  id,
  full_name,
  email,
  phone,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles
WHERE id = 'YOUR_USER_UUID';

-- STEP 2: If no row exists, manually create your profile
-- Replace the placeholder values with your actual information

INSERT INTO public.profiles (
  id,
  full_name,
  email,
  phone,
  avatar_url,
  created_at,
  updated_at
) VALUES (
  'YOUR_USER_UUID',           -- Your auth.users.id
  'Your Full Name',           -- Your full name
  'your.email@example.com',   -- Your email from auth.users
  NULL,                       -- Phone (optional, can be NULL)
  NULL,                       -- Avatar URL (optional, can be NULL)
  NOW(),                      -- created_at
  NOW()                       -- updated_at
);

-- STEP 3: Verify the profile was created
SELECT
  id,
  full_name,
  email,
  phone,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles
WHERE id = 'YOUR_USER_UUID';

-- ============================================
-- NOTES:
-- - The automatic trigger (on_auth_user_created) only works for NEW users
-- - Existing users created before the trigger was set up need manual profile creation
-- - After running this, your profile page should load correctly
-- ============================================
