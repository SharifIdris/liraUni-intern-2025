-- Fix RLS performance issues and security warnings

-- 1. Fix function search path issues by adding SET search_path
DROP FUNCTION IF EXISTS public.validate_password_strength(text);
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Password must be at least 8 characters
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Password must contain at least one uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Password must contain at least one lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Password must contain at least one number
  IF password !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.log_security_event(uuid, text, text, boolean, jsonb);
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_action text,
  p_resource text DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    success,
    details
  ) VALUES (
    p_user_id,
    p_action,
    p_resource,
    p_success,
    p_details
  );
END;
$$;

-- 2. Optimize RLS policies to fix auth_rls_initplan warnings
-- Replace direct auth.uid() calls with SELECT subqueries

-- Activities table policies optimization
DROP POLICY IF EXISTS "Interns can insert their own activities" ON public.activities;
DROP POLICY IF EXISTS "Interns can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Staff can update activities" ON public.activities;
DROP POLICY IF EXISTS "Staff can view all activities" ON public.activities;

-- Combine policies to reduce multiple permissive policy warnings
CREATE POLICY "Activities access policy" ON public.activities
FOR ALL
USING (
  -- Users can view their own activities OR staff can view all
  (user_id = (SELECT auth.uid())) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
  ))
)
WITH CHECK (
  -- Users can only insert/update their own activities OR staff can update any
  (user_id = (SELECT auth.uid())) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
  ))
);

-- Attendance records policies optimization
DROP POLICY IF EXISTS "Staff can manage attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can view all attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance_records;

CREATE POLICY "Attendance access policy" ON public.attendance_records
FOR ALL
USING (
  -- Users can view their own attendance OR staff can view all
  (user_id = (SELECT auth.uid())) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
  ))
)
WITH CHECK (
  -- Only staff can manage attendance records
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
  )
);

-- Channels policies optimization
DROP POLICY IF EXISTS "Interns can view channels they belong to" ON public.channels;
DROP POLICY IF EXISTS "Staff can manage channels" ON public.channels;

CREATE POLICY "Channels access policy" ON public.channels
FOR ALL
USING (
  -- Interns can view channels they belong to OR staff can view all
  ((SELECT auth.uid()) = ANY (intern_ids)) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
  ))
)
WITH CHECK (
  -- Only staff can manage channels
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
  )
);

-- Comments policies optimization
DROP POLICY IF EXISTS "Staff can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments on accessible activities" ON public.comments;

CREATE POLICY "Comments access policy" ON public.comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = comments.activity_id 
    AND (
      a.user_id = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid()) 
        AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
      )
    )
  )
);

CREATE POLICY "Comments insert policy" ON public.comments
FOR INSERT
WITH CHECK (
  -- Only staff can insert comments and must be their own user_id
  user_id = (SELECT auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
  )
);

-- Messages policies optimization
DROP POLICY IF EXISTS "Users can insert messages in their channels" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.messages;

CREATE POLICY "Messages access policy" ON public.messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM channels
    WHERE id = messages.channel_id 
    AND (
      (SELECT auth.uid()) = ANY (intern_ids) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid()) 
        AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
      )
    )
  )
)
WITH CHECK (
  -- Users can only insert their own messages in accessible channels
  user_id = (SELECT auth.uid()) AND
  EXISTS (
    SELECT 1 FROM channels
    WHERE id = messages.channel_id 
    AND (
      (SELECT auth.uid()) = ANY (intern_ids) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid()) 
        AND role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
      )
    )
  )
);

-- Notifications policies optimization
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Notifications access policy" ON public.notifications
FOR ALL
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Profiles policies optimization
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Profiles view policy" ON public.profiles
FOR SELECT
USING (true); -- Everyone can view all profiles

CREATE POLICY "Profiles modify policy" ON public.profiles
FOR ALL
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Security audit log policy optimization
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.security_audit_log;

CREATE POLICY "Security audit access policy" ON public.security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) 
    AND role = 'admin'::user_role
  )
);

-- Create a security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;