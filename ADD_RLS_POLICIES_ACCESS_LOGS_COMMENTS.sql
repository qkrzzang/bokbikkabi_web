-- =====================================================
-- RLS 정책 추가: access_logs, agent_comments
-- Supabase Dashboard > SQL Editor에서 즉시 실행
-- =====================================================

-- =====================================================
-- 1. access_logs 테이블 RLS 정책
-- =====================================================

-- 기존 정책 확인
SELECT 
  tablename,
  policyname,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'access_logs'
ORDER BY cmd, policyname;

-- SELECT: 관리자만 로그 조회 가능
DROP POLICY IF EXISTS "Admins can view access logs" ON public.access_logs;
CREATE POLICY "Admins can view access logs"
  ON public.access_logs
  FOR SELECT
  USING (
    (SELECT auth.uid()) IN (
      SELECT supabase_user_id 
      FROM users 
      WHERE user_type = 'ADMIN'
    )
  );

-- INSERT: 인증된 사용자가 자신의 로그 생성 가능
DROP POLICY IF EXISTS "Authenticated users can create logs" ON public.access_logs;
CREATE POLICY "Authenticated users can create logs"
  ON public.access_logs
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = supabase_user_id
  );

-- =====================================================
-- 2. agent_comments 테이블 RLS 정책
-- =====================================================

-- 기존 정책 확인
SELECT 
  tablename,
  policyname,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'agent_comments'
ORDER BY cmd, policyname;

-- SELECT: 모든 사용자가 댓글 조회 가능
DROP POLICY IF EXISTS "Anyone can view comments" ON public.agent_comments;
CREATE POLICY "Anyone can view comments"
  ON public.agent_comments
  FOR SELECT
  USING (true);

-- INSERT: 인증된 사용자가 댓글 작성 가능
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.agent_comments;
CREATE POLICY "Authenticated users can create comments"
  ON public.agent_comments
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = supabase_user_id
  );

-- UPDATE: 자신의 댓글만 수정 가능
DROP POLICY IF EXISTS "Users can update own comments" ON public.agent_comments;
CREATE POLICY "Users can update own comments"
  ON public.agent_comments
  FOR UPDATE
  USING ((SELECT auth.uid()) = supabase_user_id)
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- DELETE: 자신의 댓글 또는 관리자가 삭제 가능
DROP POLICY IF EXISTS "Users and admins can delete comments" ON public.agent_comments;
CREATE POLICY "Users and admins can delete comments"
  ON public.agent_comments
  FOR DELETE
  USING (
    (SELECT auth.uid()) = supabase_user_id
    OR
    (SELECT auth.uid()) IN (
      SELECT supabase_user_id 
      FROM users 
      WHERE user_type = 'ADMIN'
    )
  );

-- =====================================================
-- 3. 정책 추가 확인
-- =====================================================

-- access_logs 정책 확인
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'access_logs'
ORDER BY cmd, policyname;

-- 예상 결과: 2개 정책
-- 1. "Admins can view access logs" (SELECT)
-- 2. "Authenticated users can create logs" (INSERT)

-- agent_comments 정책 확인
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'agent_comments'
ORDER BY cmd, policyname;

-- 예상 결과: 4개 정책
-- 1. "Users and admins can delete comments" (DELETE)
-- 2. "Authenticated users can create comments" (INSERT)
-- 3. "Anyone can view comments" (SELECT)
-- 4. "Users can update own comments" (UPDATE)

-- =====================================================
-- 4. RLS 활성화 상태 확인
-- =====================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('access_logs', 'agent_comments');

-- 예상 결과:
-- access_logs: rls_enabled = true
-- agent_comments: rls_enabled = true

-- =====================================================
-- 5. 테스트 쿼리 (선택사항)
-- =====================================================

-- access_logs 조회 테스트 (관리자만 가능)
-- SELECT * FROM access_logs LIMIT 1;

-- agent_comments 조회 테스트 (누구나 가능)
-- SELECT * FROM agent_comments LIMIT 1;

-- =====================================================
-- 완료!
-- =====================================================

-- 다음 단계:
-- 1. 브라우저 완전 새로고침 (Ctrl + Shift + R)
-- 2. 로그아웃 → 재로그인
-- 3. 앱 기능 테스트

