-- Step 1: Drop existing policies first
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users and admins can view transactions" ON public.point_transactions;

DROP POLICY IF EXISTS "Admins can view all responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view own responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users and admins can view survey responses" ON public.survey_responses;

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.user_attendance;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.user_attendance;
DROP POLICY IF EXISTS "Users and admins can view attendance" ON public.user_attendance;

DROP POLICY IF EXISTS "Admins can view all points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
DROP POLICY IF EXISTS "Users and admins can view points" ON public.user_points;
