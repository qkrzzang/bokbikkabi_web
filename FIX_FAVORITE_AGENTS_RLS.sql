-- =====================================================
-- favorite_agents 테이블 RLS 정책 수정
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1. RLS 활성화
ALTER TABLE public.favorite_agents ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can read their own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorite_agents;

-- 3. 새로운 정책 생성 (최적화된 버전)

-- SELECT 정책: 사용자가 자신의 관심 목록만 조회
CREATE POLICY "Users can read their own favorites"
  ON public.favorite_agents
  FOR SELECT
  USING ((SELECT auth.uid()) = supabase_user_id);

-- INSERT 정책: 사용자가 자신의 관심 등록
CREATE POLICY "Users can insert their own favorites"
  ON public.favorite_agents
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- DELETE 정책: 사용자가 자신의 관심 해제
CREATE POLICY "Users can delete their own favorites"
  ON public.favorite_agents
  FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- RLS 활성화 확인
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'favorite_agents';

-- 정책 목록 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'favorite_agents'
ORDER BY cmd, policyname;

-- 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'favorite_agents'
ORDER BY indexname;

-- 제약조건 확인
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.favorite_agents'::regclass
ORDER BY conname;

-- =====================================================
-- 테스트 쿼리 (실제 앱에서 실행되는 쿼리와 동일)
-- =====================================================

-- 1. 관심 등록 여부 확인 (로그인한 사용자로 실행)
-- 결과: 데이터가 있으면 1건, 없으면 0건
SELECT id
FROM public.favorite_agents
WHERE supabase_user_id = auth.uid()
AND agent_id = 128093;

-- 2. 관심 등록 (로그인한 사용자로 실행)
-- 성공해야 함
INSERT INTO public.favorite_agents (supabase_user_id, agent_id)
VALUES (auth.uid(), 128093);

-- 3. 관심 해제 (로그인한 사용자로 실행)
-- 성공해야 함
DELETE FROM public.favorite_agents
WHERE supabase_user_id = auth.uid()
AND agent_id = 128093;

-- =====================================================
-- 문제 해결을 위한 추가 체크
-- =====================================================

-- agent_master 테이블에 해당 ID가 존재하는지 확인
SELECT id, agent_name
FROM public.agent_master
WHERE id = 128093;

-- 외래 키 제약조건 확인
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'favorite_agents';

