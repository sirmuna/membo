-- ==========================================
-- MEMBO V1: People, Groups, and Attendance Database Schema
-- ==========================================

-- 1. People Table
CREATE TABLE IF NOT EXISTS public.people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_org_user UNIQUE (organisation_id, user_id)
);

-- 2. Custom Field Definitions
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'date', 'select')),
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_org_field_name UNIQUE (organisation_id, field_name)
);

-- 3. Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT DEFAULT 'General',
  leader_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Group Memberships Table
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_group_person UNIQUE (group_id, person_id)
);

-- 5. Attendance Schedules Table
CREATE TABLE IF NOT EXISTS public.attendance_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.attendance_schedules(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_session_person_record UNIQUE (session_id, person_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_people_org ON public.people(organisation_id);
CREATE INDEX IF NOT EXISTS idx_groups_org ON public.groups(organisation_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_person ON public.group_memberships(person_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_org ON public.attendance_sessions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);

-- Enable RLS
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is member of organisation
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_memberships
    WHERE organisation_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- RLS Policies (Allow access to org members)
CREATE POLICY "Org members can view people" ON public.people FOR SELECT TO authenticated USING (public.is_org_member(organisation_id));
CREATE POLICY "Org members can edit people" ON public.people FOR ALL TO authenticated USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can view custom fields" ON public.custom_field_definitions FOR SELECT TO authenticated USING (public.is_org_member(organisation_id));
CREATE POLICY "Org members can manage custom fields" ON public.custom_field_definitions FOR ALL TO authenticated USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can view groups" ON public.groups FOR SELECT TO authenticated USING (public.is_org_member(organisation_id));
CREATE POLICY "Org members can manage groups" ON public.groups FOR ALL TO authenticated USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can view group memberships" ON public.group_memberships FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND public.is_org_member(g.organisation_id)));
CREATE POLICY "Org members can manage group memberships" ON public.group_memberships FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND public.is_org_member(g.organisation_id)));

CREATE POLICY "Org members can view attendance schedules" ON public.attendance_schedules FOR SELECT TO authenticated USING (public.is_org_member(organisation_id));
CREATE POLICY "Org members can manage attendance schedules" ON public.attendance_schedules FOR ALL TO authenticated USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can view attendance sessions" ON public.attendance_sessions FOR SELECT TO authenticated USING (public.is_org_member(organisation_id));
CREATE POLICY "Org members can manage attendance sessions" ON public.attendance_sessions FOR ALL TO authenticated USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can view attendance records" ON public.attendance_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attendance_sessions s WHERE s.id = session_id AND public.is_org_member(s.organisation_id)));
CREATE POLICY "Org members can manage attendance records" ON public.attendance_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attendance_sessions s WHERE s.id = session_id AND public.is_org_member(s.organisation_id)));

-- ==========================================
-- SYNC FUNCTION: Members & Roles to People Table
-- ==========================================

-- Function to sync all existing organisation members to people table
CREATE OR REPLACE FUNCTION public.sync_members_to_people()
RETURNS TABLE(
  organisation_id UUID,
  synced_count INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_record RECORD;
  v_member_record RECORD;
  v_profile RECORD;
  v_synced INTEGER;
  v_current_org_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Loop through all organisations
  FOR v_org_record IN
    SELECT DISTINCT om.organisation_id
    FROM public.organisation_memberships om
    WHERE om.status = 'active'
  LOOP
    v_synced := 0;
    v_current_org_id := v_org_record.organisation_id;

    -- Loop through all active members of this organisation
    FOR v_member_record IN
      SELECT om.user_id
      FROM public.organisation_memberships om
      WHERE om.organisation_id = v_current_org_id
        AND om.status = 'active'
    LOOP
      v_current_user_id := v_member_record.user_id;

      -- Get user profile
      SELECT full_name, email, avatar_url INTO v_profile
      FROM public.profiles
      WHERE id = v_current_user_id;

      -- Insert or update people record using separate statements
      -- First try to update if exists
      UPDATE public.people
      SET
        first_name = COALESCE(SPLIT_PART(v_profile.full_name, ' ', 1), 'User'),
        last_name = COALESCE(SPLIT_PART(v_profile.full_name, ' ', 2), ''),
        email = v_profile.email,
        avatar_url = v_profile.avatar_url,
        status = 'active',
        updated_at = NOW()
      WHERE organisation_id = v_current_org_id AND user_id = v_current_user_id;

      -- If no rows were updated, insert new record
      IF NOT FOUND THEN
        INSERT INTO public.people (organisation_id, user_id, first_name, last_name, email, avatar_url, status)
        VALUES (
          v_current_org_id,
          v_current_user_id,
          COALESCE(SPLIT_PART(v_profile.full_name, ' ', 1), 'User'),
          COALESCE(SPLIT_PART(v_profile.full_name, ' ', 2), ''),
          v_profile.email,
          v_profile.avatar_url,
          'active'
        );
      END IF;

      v_synced := v_synced + 1;
    END LOOP;

    RETURN QUERY SELECT v_current_org_id, v_synced, NULL::TEXT;
  END LOOP;

  RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_members_to_people() TO authenticated;

-- ==========================================
-- DUPLICATE USER DETECTION
-- ==========================================

-- Function to detect duplicate users by email within an organisation
CREATE OR REPLACE FUNCTION public.detect_duplicate_people(p_organisation_id UUID)
RETURNS TABLE(
  person_id UUID,
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  duplicate_count INTEGER,
  duplicate_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH duplicates AS (
    SELECT
      email,
      COUNT(*) as count,
      ARRAY_AGG(id ORDER BY created_at) as ids
    FROM public.people
    WHERE organisation_id = p_organisation_id
      AND email IS NOT NULL
      AND email != ''
      AND status = 'active'
    GROUP BY email
    HAVING COUNT(*) > 1
  )
  SELECT
    p.id,
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    d.count,
    d.ids
  FROM public.people p
  JOIN duplicates d ON p.email = d.email
  WHERE p.organisation_id = p_organisation_id
    AND p.id = d.ids[1]; -- Return one record per duplicate group
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.detect_duplicate_people(UUID) TO authenticated;

-- Function to create a duplicate alert for admins
CREATE OR REPLACE FUNCTION public.create_duplicate_alert(
  p_organisation_id UUID,
  p_duplicate_ids UUID[],
  p_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  -- Insert into a duplicate alerts table (we'll create this)
  INSERT INTO public.duplicate_alerts (
    organisation_id,
    duplicate_ids,
    email,
    status,
    created_at
  )
  VALUES (
    p_organisation_id,
    p_duplicate_ids,
    p_email,
    'pending',
    NOW()
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_duplicate_alert(UUID, UUID[], TEXT) TO authenticated;

-- Table: Duplicate Alerts
CREATE TABLE IF NOT EXISTS public.duplicate_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  duplicate_ids UUID[] NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolution_action TEXT, -- 'merge', 'keep_both', 'delete_one'
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.duplicate_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for duplicate_alerts
CREATE POLICY "Org admins can view duplicate alerts" ON public.duplicate_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.organisation_id = organisation_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND r.code IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org admins can manage duplicate alerts" ON public.duplicate_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.organisation_id = organisation_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND r.code IN ('owner', 'admin')
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_duplicate_alerts_org ON public.duplicate_alerts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_alerts_status ON public.duplicate_alerts(status);

-- ==========================================
-- AUTOMATIC DUPLICATE CHECK TRIGGER
-- ==========================================

-- Function to check for duplicates and create alerts
CREATE OR REPLACE FUNCTION public.check_for_duplicates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_count INTEGER;
  v_duplicate_ids UUID[];
  v_alert_exists BOOLEAN;
BEGIN
  -- Only check on INSERT or when email changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.email IS DISTINCT FROM OLD.email) THEN
    -- Check if there are existing people with the same email in this organisation
    SELECT COUNT(*), ARRAY_AGG(id ORDER BY created_at)
    INTO v_existing_count, v_duplicate_ids
    FROM public.people
    WHERE organisation_id = NEW.organisation_id
      AND email = NEW.email
      AND email IS NOT NULL
      AND email != ''
      AND status = 'active'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    -- If duplicates found (more than 1 existing or 1 existing + this new one)
    IF v_existing_count > 0 THEN
      -- Add current record to duplicate IDs if it's an insert
      IF TG_OP = 'INSERT' THEN
        v_duplicate_ids := array_append(v_duplicate_ids, NEW.id);
      END IF;

      -- Check if an alert already exists for this email in this org
      SELECT EXISTS(
        SELECT 1 FROM public.duplicate_alerts
        WHERE organisation_id = NEW.organisation_id
          AND email = NEW.email
          AND status = 'pending'
      ) INTO v_alert_exists;

      -- Only create new alert if one doesn't exist
      IF NOT v_alert_exists THEN
        INSERT INTO public.duplicate_alerts (
          organisation_id,
          duplicate_ids,
          email,
          status,
          created_at
        )
        VALUES (
          NEW.organisation_id,
          v_duplicate_ids,
          NEW.email,
          'pending',
          NOW()
        );
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_for_duplicates() TO authenticated;

-- Create trigger on people table
DROP TRIGGER IF EXISTS people_duplicate_check_trigger ON public.people;
CREATE TRIGGER people_duplicate_check_trigger
  AFTER INSERT OR UPDATE OF email ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.check_for_duplicates();
