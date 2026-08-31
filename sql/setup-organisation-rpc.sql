-- Setup organisation roles and RPC function
-- This creates the roles table and the create_organisation RPC function

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO public.roles (code, label, description) VALUES
  ('owner', 'Owner', 'Full control over the organisation'),
  ('admin', 'Admin', 'Can manage members and settings'),
  ('member', 'Member', 'Basic member access')
ON CONFLICT (code) DO NOTHING;

-- Drop existing RPC function if it exists
DROP FUNCTION IF EXISTS public.create_organisation(text, text, text);

-- Create the create_organisation RPC function
CREATE OR REPLACE FUNCTION public.create_organisation(
  p_name TEXT,
  p_slug TEXT,
  p_org_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_owner_role_id UUID;
  v_user_id UUID;
  v_profile RECORD;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get the owner role ID
  SELECT id INTO v_owner_role_id
  FROM public.roles
  WHERE code = 'owner'
  LIMIT 1;

  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'Owner role not found';
  END IF;

  -- Create the organisation
  INSERT INTO public.organisations (name, slug, org_type, status, created_at, updated_at)
  VALUES (p_name, p_slug, p_org_type, 'active', NOW(), NOW())
  RETURNING id INTO v_org_id;

  -- Create the membership with owner role
  INSERT INTO public.organisation_memberships (
    organisation_id,
    user_id,
    role_id,
    status,
    joined_at,
    created_at,
    updated_at
  )
  VALUES (
    v_org_id,
    v_user_id,
    v_owner_role_id,
    'active',
    NOW(),
    NOW(),
    NOW()
  );

  -- Get user profile information
  SELECT full_name, email, avatar_url INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  -- Create person record in people table
  INSERT INTO public.people (organisation_id, user_id, first_name, last_name, email, avatar_url, status)
  VALUES (
    v_org_id,
    v_user_id,
    COALESCE(SPLIT_PART(v_profile.full_name, ' ', 1), 'User'),
    COALESCE(SPLIT_PART(v_profile.full_name, ' ', 2), ''),
    v_profile.email,
    v_profile.avatar_url,
    'active'
  );

  RETURN v_org_id;
END;
$$;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION public.create_organisation TO authenticated;

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view roles
CREATE POLICY "Anyone can view roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.roles TO authenticated;
