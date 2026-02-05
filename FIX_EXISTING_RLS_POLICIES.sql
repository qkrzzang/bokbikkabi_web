-- =====================================================
-- 기존 RLS 정책 확인 및 재생성
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- =====================================================
-- 1단계: 현재 정책 확인
-- =====================================================

-- access_logs 정책 확인
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'access_logs'
ORDER BY cmd, policyname;

-- agent_comments 정책 확인
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'agent_comments'
ORDER BY cmd, policyname;

-- =====================================================
-- 2단계: 기존 정책 삭제 후 재생성
-- =====================================================

-- access_logs 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Authenticated users can create logs" ON public.access_logs;

-- access_logs 정책 생성
CREATE POLICY "Admins can view access logs"
  ON public.access_logs FOR SELECT
  USING (
    (SELECT auth.uid()) IN (
      SELECT supabase_user_id FROM users WHERE user_type = 'ADMIN'
    )
  );

CREATE POLICY "Authenticated users can create logs"
  ON public.access_logs FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- agent_comments 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view comments" ON public.agent_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.agent_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.agent_comments;
DROP POLICY IF EXISTS "Users and admins can delete comments" ON public.agent_comments;

-- agent_comments 정책 생성
CREATE POLICY "Anyone can view comments"
  ON public.agent_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.agent_comments FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

CREATE POLICY "Users can update own comments"
  ON public.agent_comments FOR UPDATE
  USING ((SELECT auth.uid()) = supabase_user_id)
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

CREATE POLICY "Users and admins can delete comments"
  ON public.agent_comments FOR DELETE
  USING (
    (SELECT auth.uid()) = supabase_user_id
    OR (SELECT auth.uid()) IN (
      SELECT supabase_user_id FROM users WHERE user_type = 'ADMIN'
    )
  );

-- =====================================================
-- 3단계: 결과 확인
-- =====================================================

-- access_logs 정책 확인
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'access_logs'
ORDER BY cmd, policyname;

-- agent_comments 정책 확인
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'agent_comments'
ORDER BY cmd, policyname;

-- =====================================================
-- 예상 결과
-- =====================================================
-- access_logs: 2 policies (SELECT, INSERT)
-- agent_comments: 4 policies (SELECT, INSERT, UPDATE, DELETE)

