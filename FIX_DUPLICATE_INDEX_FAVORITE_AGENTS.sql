-- =====================================================
-- favorite_agents 테이블 중복 인덱스 제거
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1. 현재 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'favorite_agents'
ORDER BY indexname;

-- 2. 중복 인덱스 삭제
-- unique_user_agent와 uq_favorite_agents_user_agent 중 하나 제거
-- 더 짧고 명확한 unique_user_agent를 유지하고 나머지 삭제

DROP INDEX IF EXISTS public.uq_favorite_agents_user_agent;

-- 3. 결과 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'favorite_agents'
ORDER BY indexname;

-- =====================================================
-- 예상 결과
-- =====================================================
-- 삭제 후 남아있어야 할 인덱스:
-- 1. favorite_agents_pkey (기본 키)
-- 2. unique_user_agent (중복 방지)
-- 3. idx_favorite_agents_user_id (성능 최적화)
-- 4. idx_favorite_agents_agent_id (성능 최적화)
-- 5. idx_favorite_agents_created_at (성능 최적화)

