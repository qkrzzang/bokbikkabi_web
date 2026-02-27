-- =====================================================
-- Fix Supabase RLS Warnings
-- =====================================================
-- 1. Remove ALL existing duplicate RLS policies
-- 2. Create single, optimized policies
-- 3. Optimize auth.uid() calls with (select auth.uid())
-- =====================================================

-- =====================================================
-- 1. agent_reviews table - Remove ALL existing policies
-- =====================================================

-- Drop ALL existing policies (including old and new)
DROP POLICY IF EXISTS "Users can insert own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Agent reviews are viewable by everyone" ON agent_reviews;
DROP POLICY IF EXISTS "Enable read for all users" ON agent_reviews;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON agent_reviews;
DROP POLICY IF EXISTS "reviews_select_all" ON agent_reviews;
DROP POLICY IF EXISTS "reviews_insert_authenticated" ON agent_reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON agent_reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON agent_reviews;

-- Create optimized policies (single, consolidated policies)
-- Everyone can read all reviews
CREATE POLICY "reviews_select_all"
ON agent_reviews FOR SELECT
USING (true);

-- Authenticated users can insert reviews
CREATE POLICY "reviews_insert_authenticated"
ON agent_reviews FOR INSERT
WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Users can update their own reviews
CREATE POLICY "reviews_update_own"
ON agent_reviews FOR UPDATE
USING (
  supabase_user_id IS NOT NULL 
  AND (select auth.uid()) = supabase_user_id
)
WITH CHECK (
  supabase_user_id IS NOT NULL 
  AND (select auth.uid()) = supabase_user_id
);

-- Users can delete their own reviews
CREATE POLICY "reviews_delete_own"
ON agent_reviews FOR DELETE
USING (
  supabase_user_id IS NOT NULL 
  AND (select auth.uid()) = supabase_user_id
);

-- =====================================================
-- 2. common_code_detail table - Remove ALL existing policies
-- =====================================================

-- Drop ALL existing policies (including old and new)
DROP POLICY IF EXISTS "Allow public read access to common_code_detail" ON common_code_detail;
DROP POLICY IF EXISTS "Common code detail viewable by everyone" ON common_code_detail;
DROP POLICY IF EXISTS "Enable read for all users" ON common_code_detail;
DROP POLICY IF EXISTS "Enable write for admin users only" ON common_code_detail;
DROP POLICY IF EXISTS "Admins can insert common code detail" ON common_code_detail;
DROP POLICY IF EXISTS "Admins can update common code detail" ON common_code_detail;
DROP POLICY IF EXISTS "Admins can delete common code detail" ON common_code_detail;
DROP POLICY IF EXISTS "common_code_detail_select_all" ON common_code_detail;
DROP POLICY IF EXISTS "common_code_detail_admin_only" ON common_code_detail;

-- Create optimized policies
-- Everyone can read common code details
CREATE POLICY "common_code_detail_select_all"
ON common_code_detail FOR SELECT
USING (true);

-- Only admins can INSERT common code details
CREATE POLICY "common_code_detail_insert_admin"
ON common_code_detail FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE supabase_user_id = (select auth.uid()) 
    AND user_type = 'ADMIN'
  )
);

-- Only admins can UPDATE common code details
CREATE POLICY "common_code_detail_update_admin"
ON common_code_detail FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE supabase_user_id = (select auth.uid()) 
    AND user_type = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE supabase_user_id = (select auth.uid()) 
    AND user_type = 'ADMIN'
  )
);

-- Only admins can DELETE common code details
CREATE POLICY "common_code_detail_delete_admin"
ON common_code_detail FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE supabase_user_id = (select auth.uid()) 
    AND user_type = 'ADMIN'
  )
);

-- =====================================================
-- 3. Add comments for documentation
-- =====================================================

COMMENT ON POLICY "reviews_select_all" ON agent_reviews IS 
  'Allows all users to read all reviews';

COMMENT ON POLICY "reviews_insert_authenticated" ON agent_reviews IS 
  'Allows authenticated users to insert reviews - optimized with (select auth.uid())';

COMMENT ON POLICY "reviews_update_own" ON agent_reviews IS 
  'Allows users to update only their own reviews - optimized with (select auth.uid())';

COMMENT ON POLICY "reviews_delete_own" ON agent_reviews IS 
  'Allows users to delete only their own reviews - optimized with (select auth.uid())';

COMMENT ON POLICY "common_code_detail_select_all" ON common_code_detail IS 
  'Allows all users to read common code details';

COMMENT ON POLICY "common_code_detail_insert_admin" ON common_code_detail IS 
  'Allows only admins to insert common code details - optimized with (select auth.uid())';

COMMENT ON POLICY "common_code_detail_update_admin" ON common_code_detail IS 
  'Allows only admins to update common code details - optimized with (select auth.uid())';

COMMENT ON POLICY "common_code_detail_delete_admin" ON common_code_detail IS 
  'Allows only admins to delete common code details - optimized with (select auth.uid())';

-- =====================================================
-- Summary:
-- =====================================================
-- ✅ Removed ALL duplicate policies for agent_reviews
-- ✅ Removed ALL duplicate policies for common_code_detail  
-- ✅ Created single, non-overlapping policies:
--    - agent_reviews: 4 policies (SELECT, INSERT, UPDATE, DELETE)
--    - common_code_detail: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- ✅ Optimized all auth.uid() calls with (select auth.uid())
-- ✅ Improved query performance by preventing re-evaluation for each row
-- ✅ No more policy overlaps - each action has exactly ONE policy
-- =====================================================
