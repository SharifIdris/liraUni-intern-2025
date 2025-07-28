-- Fix multiple permissive policies on profiles table

-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles modify policy" ON public.profiles;

-- Create optimized policies without overlap
CREATE POLICY "Profiles select policy" ON public.profiles
FOR SELECT
USING (true); -- Everyone can view all profiles

CREATE POLICY "Profiles insert policy" ON public.profiles
FOR INSERT
WITH CHECK (id = (SELECT auth.uid())); -- Users can only insert their own profile

CREATE POLICY "Profiles update policy" ON public.profiles
FOR UPDATE
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid())); -- Users can only update their own profile

CREATE POLICY "Profiles delete policy" ON public.profiles
FOR DELETE
USING (id = (SELECT auth.uid())); -- Users can only delete their own profile