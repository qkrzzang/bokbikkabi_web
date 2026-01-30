-- RLS 정책 확인 및 수정 스크립트
-- Supabase Dashboard > SQL Editor에서 실행

-- ========================================
-- 1. 현재 RLS 정책 확인
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('agent_master', 'agent_reviews', 'users')
ORDER BY tablename, policyname;

-- ========================================
-- 2. agent_master 테이블 RLS 확인 및 수정
-- ========================================

-- RLS 활성화 상태 확인
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'agent_master';

-- RLS 활성화 (이미 활성화되어 있어도 안전)
ALTER TABLE agent_master ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Enable read access for all users" ON agent_master;

-- 모든 사용자(인증/비인증)에게 SELECT 권한 부여
CREATE POLICY "Enable read access for all users" ON agent_master
  FOR SELECT
  USING (true);

-- ========================================
-- 3. agent_reviews 테이블 RLS 확인 및 수정
-- ========================================

-- RLS 활성화
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Agent reviews are viewable by everyone" ON public.agent_reviews;

-- 모든 사용자에게 SELECT 권한 부여
CREATE POLICY "Agent reviews are viewable by everyone"
  ON public.agent_reviews
  FOR SELECT
  USING (true);

-- ========================================
-- 4. 정책 적용 확인
-- ========================================

-- 다시 정책 확인
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('agent_master', 'agent_reviews')
ORDER BY tablename, policyname;

-- ========================================
-- 5. anon 역할로 테스트 (웹 앱과 동일한 권한)
-- ========================================

-- 현재 역할 확인
SELECT current_user, session_user;

-- anon 역할로 전환하여 테스트
SET ROLE anon;

-- agent_master 조회 테스트
SELECT COUNT(*) as total_agents FROM agent_master;
SELECT id, agent_name FROM agent_master LIMIT 3;

-- agent_reviews 조회 테스트
SELECT COUNT(*) as total_reviews FROM agent_reviews;

-- 원래 역할로 복귀
RESET ROLE;

-- ========================================
-- 결과 해석
-- ========================================
-- 위 테스트에서 오류가 발생하면 RLS 정책이 제대로 설정되지 않은 것입니다.
-- "permission denied" 오류 → RLS 정책 재설정 필요
-- 정상 조회 → RLS 정책 정상, 다른 원인 확인 필요

