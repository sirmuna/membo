-- Add group_leader role to the roles table
INSERT INTO public.roles (code, label, description) VALUES
  ('group_leader', 'Group Leader', 'Can manage group members and add from organization general list')
ON CONFLICT (code) DO NOTHING;

-- Update the description of the admin role to be more specific
UPDATE public.roles 
SET description = 'Can manage members, settings, and organization general list'
WHERE code = 'admin';

-- Create organization_general_members table
-- This table stores users who are part of the organization but not assigned to specific groups yet
CREATE TABLE IF NOT EXISTS public.organization_general_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  notes TEXT,
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization_general_members
ALTER TABLE public.organization_general_members ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can view general members of their organizations
CREATE POLICY "Organization members can view general members"
  ON public.organization_general_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships
      WHERE organisation_memberships.organisation_id = organization_general_members.organization_id
      AND organisation_memberships.user_id = auth.uid()
      AND organisation_memberships.status = 'active'
    )
  );

-- Policy: Admins and owners can add general members
CREATE POLICY "Admins and owners can add general members"
  ON public.organization_general_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships om
      JOIN public.roles r ON om.role_id = r.id
      WHERE om.organisation_id = organization_general_members.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND r.code IN ('admin', 'owner')
    )
  );

-- Policy: Admins and owners can update general members
CREATE POLICY "Admins and owners can update general members"
  ON public.organization_general_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships om
      JOIN public.roles r ON om.role_id = r.id
      WHERE om.organisation_id = organization_general_members.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND r.code IN ('admin', 'owner')
    )
  );

-- Policy: Admins and owners can delete general members
CREATE POLICY "Admins and owners can delete general members"
  ON public.organization_general_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships om
      JOIN public.roles r ON om.role_id = r.id
      WHERE om.organisation_id = organization_general_members.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND r.code IN ('admin', 'owner')
    )
  );

-- Grant necessary permissions
GRANT ALL ON TABLE public.organization_general_members TO authenticated;
