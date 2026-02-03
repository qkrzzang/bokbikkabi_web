-- =====================================================
-- RLS 정책 디버깅 및 재확인
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1. agent_reviews 테이블의 RLS 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'agent_reviews';

-- 2. agent_reviews의 현재 RLS 정책 목록
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'agent_reviews'
ORDER BY cmd, policyname;

-- 3. qkrzzang13@kakao.com의 supabase_user_id 확인
SELECT 
    id as supabase_user_id,
    email
FROM auth.users
WHERE email = 'qkrzzang13@kakao.com';

-- 4. 해당 사용자의 리뷰 목록 확인
SELECT 
    id,
    agent_id,
    supabase_user_id,
    created_at
FROM public.agent_reviews
WHERE supabase_user_id = (
    SELECT id FROM auth.users WHERE email = 'qkrzzang13@kakao.com'
)
ORDER BY created_at DESC;

-- 5. 정책이 없다면 다시 생성
-- (정책이 이미 있으면 오류가 발생하지만 무시 가능)

-- RLS 활성화
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Agent reviews are viewable by everyone" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.agent_reviews;

-- SELECT 정책: 모든 사용자가 모든 리뷰 조회 가능
CREATE POLICY "Agent reviews are viewable by everyone"
  ON public.agent_reviews 
  FOR SELECT
  USING (true);

-- INSERT 정책: 인증된 사용자가 자신의 리뷰만 작성 가능
CREATE POLICY "Users can insert own reviews"
  ON public.agent_reviews 
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- UPDATE 정책: 사용자가 자신의 리뷰만 수정 가능
CREATE POLICY "Users can update own reviews"
  ON public.agent_reviews 
  FOR UPDATE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- DELETE 정책: 사용자가 자신의 리뷰만 삭제 가능
CREATE POLICY "Users can delete own reviews"
  ON public.agent_reviews 
  FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- 6. 정책 재확인
SELECT 
    policyname,
    cmd,
    qual::text as using_clause
FROM pg_policies
WHERE tablename = 'agent_reviews'
ORDER BY cmd;

