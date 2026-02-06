-- Step 2: Create optimized policies with (select auth.uid())
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
