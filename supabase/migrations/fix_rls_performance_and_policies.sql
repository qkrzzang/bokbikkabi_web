-- Fix Multiple Permissive Policies and Auth RLS Performance
-- Use (select auth.uid()) to avoid re-evaluation per row

-- 1. point_transactions table policy consolidation
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;

CREATE POLICY "Users and admins can view transactions"
ON public.point_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.supabase_user_id = (select auth.uid()) 
    AND users.user_type = 'ADMIN'
  )
  OR supabase_user_id = (select auth.uid())
);

-- 2. survey_responses table policy consolidation
DROP POLICY IF EXISTS "Admins can view all responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view own responses" ON public.survey_responses;

CREATE POLICY "Users and admins can view survey responses"
ON public.survey_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.supabase_user_id = (select auth.uid()) 
    AND users.user_type = 'ADMIN'
  )
  OR supabase_user_id = (select auth.uid())
);

-- 3. user_attendance table policy consolidation
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.user_attendance;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.user_attendance;

CREATE POLICY "Users and admins can view attendance"
ON public.user_attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.supabase_user_id = (select auth.uid()) 
    AND users.user_type = 'ADMIN'
  )
  OR supabase_user_id = (select auth.uid())
);

-- 4. user_points table policy consolidation
DROP POLICY IF EXISTS "Admins can view all points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;

CREATE POLICY "Users and admins can view points"
ON public.user_points FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.supabase_user_id = (select auth.uid()) 
    AND users.user_type = 'ADMIN'
  )
  OR supabase_user_id = (select auth.uid())
);
