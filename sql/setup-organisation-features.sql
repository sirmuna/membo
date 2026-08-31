-- Setup all tables, constraints, RLS policies, and RPC functions for Organisation features.
-- Run this script in the Supabase SQL Editor.

-- ==========================================
-- 1. EXTEND EXISTING TABLES AND SCHEMAS
-- ==========================================

-- Ensure organisations terminology and timezone columns exist
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS terminology JSONB DEFAULT NULL;
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS deletion_eligible_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Ensure roles table unique constraint/index on code exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_code_key') THEN
    ALTER TABLE public.roles ADD CONSTRAINT roles_code_key UNIQUE (code);
  END IF;
END $$;

-- Seed default roles if not already present
INSERT INTO public.roles (code, label, description) VALUES
  ('owner', 'Owner', 'Full control over the organisation'),
  ('admin', 'Admin', 'Can manage members and settings'),
  ('member', 'Member', 'Basic member access')
ON CONFLICT (code) DO NOTHING;

-- Ensure membership table unique constraint on (organisation_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_org_user_membership') THEN
    ALTER TABLE public.organisation_memberships ADD CONSTRAINT unique_org_user_membership UNIQUE (organisation_id, user_id);
  END IF;
END $$;

-- ==========================================
-- 2. CREATE NEW TABLES FOR SPEC FLOWS
-- ==========================================

-- Table: Join Requests
CREATE TABLE IF NOT EXISTS public.organisation_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_org_user_pending_request UNIQUE (organisation_id, user_id, status)
);

-- Table: Invitations
CREATE TABLE IF NOT EXISTS public.organisation_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Ownership Transfers
CREATE TABLE IF NOT EXISTS public.ownership_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.organisation_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_transfers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own or org join requests" ON public.organisation_join_requests;
DROP POLICY IF EXISTS "Users can insert own join requests" ON public.organisation_join_requests;
DROP POLICY IF EXISTS "Org members can view invitations" ON public.organisation_invitations;
DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.organisation_invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.organisation_invitations;
DROP POLICY IF EXISTS "Members can view transfers" ON public.ownership_transfers;
DROP POLICY IF EXISTS "Org owners can manage transfers" ON public.ownership_transfers;

-- RLS policies for organisation_join_requests
CREATE POLICY "Users can view own or org join requests" ON public.organisation_join_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.organisation_memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.organisation_id = public.organisation_join_requests.organisation_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND r.code IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can insert own join requests" ON public.organisation_join_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- RLS policies for organisation_invitations
CREATE POLICY "Anyone can view invitation by token" ON public.organisation_invitations
  FOR SELECT TO authenticated
  USING (true); -- Required to look up invitation before accepting

CREATE POLICY "Org admins can manage invitations" ON public.organisation_invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.organisation_id = public.organisation_invitations.organisation_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND r.code IN ('owner', 'admin')
    )
  );

-- RLS policies for ownership_transfers
CREATE POLICY "Members can view transfers" ON public.ownership_transfers
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Org owners can manage transfers" ON public.ownership_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.organisation_memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.organisation_id = public.ownership_transfers.organisation_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND r.code IN ('owner', 'admin')
    )
  );

-- ==========================================
-- 4. SECURITY DEFINER RPC FUNCTIONS
-- ==========================================

-- Function: Approve Join Request
CREATE OR REPLACE FUNCTION public.approve_join_request(
  p_request_id UUID,
  p_approve BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_caller_role TEXT;
  v_member_role_id UUID;
  v_admin_role_id UUID;
  v_profile RECORD;
BEGIN
  -- Get the request details
  SELECT organisation_id, user_id INTO v_org_id, v_user_id
  FROM public.organisation_join_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Pending join request not found';
  END IF;

  -- Check caller's role in this organisation
  SELECT r.code INTO v_caller_role
  FROM public.organisation_memberships m
  JOIN public.roles r ON m.role_id = r.id
  WHERE m.organisation_id = v_org_id AND m.user_id = auth.uid() AND m.status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners and admins can approve join requests';
  END IF;

  IF p_approve THEN
    -- Get the member role ID
    SELECT id INTO v_member_role_id FROM public.roles WHERE code = 'member' LIMIT 1;

    -- Get user profile information
    SELECT full_name, email, avatar_url INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id;

    -- Update request
    UPDATE public.organisation_join_requests
    SET status = 'approved', updated_at = NOW()
    WHERE id = p_request_id;

    -- Create membership (or update if exists but removed)
    INSERT INTO public.organisation_memberships (organisation_id, user_id, role_id, status, joined_at)
    VALUES (v_org_id, v_user_id, v_member_role_id, 'active', NOW())
    ON CONFLICT (organisation_id, user_id)
    DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', joined_at = NOW(), updated_at = NOW();

    -- Create or update person record in people table
    INSERT INTO public.people (organisation_id, user_id, first_name, last_name, email, avatar_url, status)
    VALUES (
      v_org_id,
      v_user_id,
      COALESCE(SPLIT_PART(v_profile.full_name, ' ', 1), 'User'),
      COALESCE(SPLIT_PART(v_profile.full_name, ' ', 2), ''),
      v_profile.email,
      v_profile.avatar_url,
      'active'
    )
    ON CONFLICT (organisation_id, user_id)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      avatar_url = EXCLUDED.avatar_url,
      status = 'active',
      updated_at = NOW();
  ELSE
    -- Reject request
    UPDATE public.organisation_join_requests
    SET status = 'rejected', updated_at = NOW()
    WHERE id = p_request_id;
  END IF;
END;
$$;

-- Function: Accept Organisation Invitation
CREATE OR REPLACE FUNCTION public.accept_organisation_invitation(
  p_token TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_role_id UUID;
  v_invite_id UUID;
  v_user_id UUID;
  v_profile RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Look up invitation
  SELECT id, organisation_id, role_id INTO v_invite_id, v_org_id, v_role_id
  FROM public.organisation_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > NOW();

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Get user profile information
  SELECT full_name, email, avatar_url INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  -- Create membership
  INSERT INTO public.organisation_memberships (organisation_id, user_id, role_id, status, joined_at)
  VALUES (v_org_id, v_user_id, v_role_id, 'active', NOW())
  ON CONFLICT (organisation_id, user_id)
  DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', joined_at = NOW(), updated_at = NOW();

  -- Create or update person record in people table
  INSERT INTO public.people (organisation_id, user_id, first_name, last_name, email, avatar_url, status)
  VALUES (
    v_org_id,
    v_user_id,
    COALESCE(SPLIT_PART(v_profile.full_name, ' ', 1), 'User'),
    COALESCE(SPLIT_PART(v_profile.full_name, ' ', 2), ''),
    v_profile.email,
    v_profile.avatar_url,
    'active'
  )
  ON CONFLICT (organisation_id, user_id)
  DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    status = 'active',
    updated_at = NOW();

  -- Mark invitation as accepted
  UPDATE public.organisation_invitations
  SET status = 'accepted', updated_at = NOW()
  WHERE id = v_invite_id;

  RETURN v_org_id;
END;
$$;

-- Function: Accept Ownership Transfer
CREATE OR REPLACE FUNCTION public.accept_ownership_transfer(
  p_transfer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_sender_id UUID;
  v_receiver_id UUID;
  v_owner_role_id UUID;
BEGIN
  -- Get transfer details
  SELECT organisation_id, sender_id, receiver_id INTO v_org_id, v_sender_id, v_receiver_id
  FROM public.ownership_transfers
  WHERE id = p_transfer_id AND status = 'pending' AND expires_at > NOW();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Pending ownership transfer not found or expired';
  END IF;

  -- Must be the receiver who calls this
  IF auth.uid() <> v_receiver_id THEN
    RAISE EXCEPTION 'Only the target receiver can accept this transfer';
  END IF;

  -- Get owner role ID
  SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'owner' LIMIT 1;

  -- Promote receiver to owner
  INSERT INTO public.organisation_memberships (organisation_id, user_id, role_id, status, joined_at)
  VALUES (v_org_id, v_receiver_id, v_owner_role_id, 'active', NOW())
  ON CONFLICT (organisation_id, user_id)
  DO UPDATE SET role_id = v_owner_role_id, status = 'active', updated_at = NOW();

  -- Remove previous owner's membership entirely
  DELETE FROM public.organisation_memberships
  WHERE organisation_id = v_org_id AND user_id = v_sender_id;

  -- Update transfer status
  UPDATE public.ownership_transfers
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;

-- Function: Handle Sole Owner Departure
CREATE OR REPLACE FUNCTION public.handle_sole_owner_departure(
  p_org_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_member RECORD;
  v_owner_role_id UUID;
  v_admin_role_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'owner' LIMIT 1;
  SELECT id INTO v_admin_role_id FROM public.roles WHERE code = 'admin' LIMIT 1;

  -- Find the longest-tenured active Admin
  SELECT m.user_id, m.joined_at INTO v_admin_member
  FROM public.organisation_memberships m
  WHERE m.organisation_id = p_org_id 
    AND m.role_id = v_admin_role_id 
    AND m.status = 'active'
  ORDER BY m.joined_at ASC, m.created_at ASC
  LIMIT 1;

  IF v_admin_member.user_id IS NOT NULL THEN
    -- Promote the longest-tenured active admin to Owner
    UPDATE public.organisation_memberships
    SET role_id = v_owner_role_id, updated_at = NOW()
    WHERE organisation_id = p_org_id AND user_id = v_admin_member.user_id;
  ELSE
    -- No Admin exists -> lock the organisation
    UPDATE public.organisations
    SET status = 'locked', 
        deletion_eligible_at = NOW() + INTERVAL '9 months',
        updated_at = NOW()
    WHERE id = p_org_id;
  END IF;
END;
$$;

-- Function: Delete Own Account
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_owner_role_id UUID;
  v_org_record RECORD;
  v_owner_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get owner role ID
  SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'owner' LIMIT 1;

  -- Find all organisations where the user is an active Owner
  FOR v_org_record IN
    SELECT organisation_id 
    FROM public.organisation_memberships 
    WHERE user_id = v_user_id AND role_id = v_owner_role_id AND status = 'active'
  LOOP
    -- Check if they are the SOLE active owner
    SELECT COUNT(*) INTO v_owner_count
    FROM public.organisation_memberships
    WHERE organisation_id = v_org_record.organisation_id AND role_id = v_owner_role_id AND status = 'active';

    IF v_owner_count = 1 THEN
      -- Sole owner! Handle departure
      PERFORM public.handle_sole_owner_departure(v_org_record.organisation_id);
    END IF;
  END LOOP;

  -- Delete user profiles and memberships to avoid foreign key blocks
  DELETE FROM public.organisation_memberships WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- Finally, delete the user from auth.users
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Function: Delete Organisation
CREATE OR REPLACE FUNCTION public.delete_organisation(
  p_org_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_owner_role_id UUID;
  v_owner_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get owner role ID
  SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'owner' LIMIT 1;

  -- Check if user is an owner of this organisation
  IF NOT EXISTS (
    SELECT 1 FROM public.organisation_memberships
    WHERE organisation_id = p_org_id AND user_id = v_user_id AND role_id = v_owner_role_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not an owner of this organisation';
  END IF;

  -- Check if there are other active owners
  SELECT COUNT(*) INTO v_owner_count
  FROM public.organisation_memberships
  WHERE organisation_id = p_org_id AND role_id = v_owner_role_id AND status = 'active';

  IF v_owner_count > 1 THEN
    RAISE EXCEPTION 'Cannot delete organisation with multiple active owners. Transfer ownership first.';
  END IF;

  -- Delete the organisation (CASCADE will handle related tables)
  DELETE FROM public.organisations WHERE id = p_org_id;
END;
$$;

-- Grant permissions to execute the new functions
GRANT EXECUTE ON FUNCTION public.approve_join_request(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_organisation_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_ownership_transfer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_sole_owner_departure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_organisation(UUID) TO authenticated;
