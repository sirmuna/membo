# Testing Automatic Profile Creation Trigger

## Purpose
Verify that the `on_auth_user_created` PostgreSQL trigger automatically creates a profile row in `public.profiles` when a new user signs up.

## Prerequisites
- MEMBO application running locally
- Supabase project configured
- Access to Supabase SQL Editor

## Testing Steps

### Step 1: Verify the trigger exists
Run this in Supabase SQL Editor to confirm the trigger is active:

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Expected result: One row showing the trigger on `auth.users` table.

### Step 2: Verify the function exists
```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_user';
```

Expected result: One row showing the function exists.

### Step 3: Create a test account
1. Navigate to `http://localhost:3000/auth/signup`
2. Enter test credentials:
   - Full Name: `Test User`
   - Email: `test@example.com` (or any unused email)
   - Password: `TestPassword123!`
3. Click "Sign Up"

### Step 4: Verify automatic profile creation
After signup completes, run this in Supabase SQL Editor:

```sql
-- Get the new user's ID from auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'test@example.com';

-- Verify the profile was automatically created
SELECT
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.avatar_url,
  p.created_at,
  u.email as auth_email,
  u.created_at as auth_created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'test@example.com';
```

Expected result:
- The profile row should exist
- `full_name` should match what was entered during signup
- `email` should match the auth user email
- `created_at` should be very close to the auth user's `created_at`

### Step 5: Verify profile page loads
1. Navigate to `http://localhost:3000/dashboard/profile`
2. The profile should load with the test user's information
3. No "Failed to load profile" error should appear

### Step 6: Cleanup (optional)
To clean up the test account:

```sql
-- Delete the profile (RLS will prevent this if not the authenticated user)
-- You may need to use the service role key or disable RLS temporarily

-- Delete from auth.users (this will cascade to profile if set up correctly)
-- Note: This requires service role privileges
```

Or simply sign in as the test user and use the account deletion feature once built.

## Success Criteria
- [ ] Trigger exists in database
- [ ] Function exists in database
- [ ] New signup creates profile automatically
- [ ] Profile contains correct full_name and email
- [ ] Profile page loads without errors for new user

## Troubleshooting

### If profile is not created automatically:
1. Check if trigger is enabled:
```sql
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

2. Check trigger function for errors:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

3. Check auth.users table for the new user:
```sql
SELECT * FROM auth.users WHERE email = 'test@example.com';
```

4. Check PostgreSQL logs in Supabase dashboard for trigger errors

### If profile exists but data is incorrect:
- Verify the signup form is passing `full_name` in user metadata
- Check the `handle_new_user` function logic
