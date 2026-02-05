-- =====================================================
-- Unused Index 정리 SQL
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- =====================================================
-- 1단계: 인덱스 사용 통계 확인 (실행 권장)
-- =====================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as rows_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, tablename, indexname;

-- =====================================================
-- 2단계: 안전한 삭제 - 중복 인덱스만 제거 (권장)
-- =====================================================

-- 중복 인덱스 확인
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'favorite_agents' 
AND indexname IN ('idx_favorite_agents_user', 'idx_favorite_agents_agent');

-- 중복 인덱스 삭제
DROP INDEX IF EXISTS public.idx_favorite_agents_user;
DROP INDEX IF EXISTS public.idx_favorite_agents_agent;

-- 결과 확인
SELECT indexname FROM pg_indexes 
WHERE tablename = 'favorite_agents'
ORDER BY indexname;

-- =====================================================
-- 3단계: 선택적 삭제 - 신중하게 판단 후 실행
-- =====================================================

-- Option A: access_logs 인덱스 삭제 (로그 분석을 하지 않는다면)
-- 먼저 확인: access_logs를 실제로 조회하는지?
SELECT COUNT(*) as total_logs FROM access_logs;

-- 조회하지 않는다면 삭제 (주석 해제 후 실행)
-- DROP INDEX IF EXISTS public.idx_access_logs_supabase_user_id;
-- DROP INDEX IF EXISTS public.idx_access_logs_created_at;
-- DROP INDEX IF EXISTS public.idx_access_logs_action;
-- DROP INDEX IF EXISTS public.idx_access_logs_ip_address;

-- Option B: agent_comments 인덱스 삭제 (댓글 기능을 사용하지 않는다면)
-- 먼저 확인: agent_comments를 사용하는지?
SELECT COUNT(*) as total_comments FROM agent_comments;

-- 사용하지 않는다면 삭제 (주석 해제 후 실행)
-- DROP INDEX IF EXISTS public.idx_agent_comments_agent;
-- DROP INDEX IF EXISTS public.idx_agent_comments_user;

-- Option C: agent_master location 인덱스 삭제 (위치 검색을 하지 않는다면)
-- 먼저 확인: location 컬럼이 있는지?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_master' AND column_name = 'location';

-- 위치 검색을 하지 않는다면 삭제 (주석 해제 후 실행)
-- DROP INDEX IF EXISTS public.idx_agent_master_location;

-- =====================================================
-- 4단계: 삭제 후 통계 재확인
-- =====================================================

-- 남아있는 unused 인덱스 확인
SELECT 
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
ORDER BY tablename, indexname;

-- 전체 인덱스 크기 확인
SELECT 
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- =====================================================
-- 5단계: 절대 삭제하면 안 되는 인덱스 확인
-- =====================================================

-- 이 인덱스들은 앱에서 사용 중입니다!
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
AND (
  -- favorite_agents (사용 중)
  (tablename = 'favorite_agents' AND indexname IN (
    'idx_favorite_agents_user_id',
    'idx_favorite_agents_agent_id', 
    'idx_favorite_agents_created_at',
    'unique_user_agent'
  ))
  OR
  -- review_helpful (사용 중)
  (tablename = 'review_helpful' AND indexname IN (
    'idx_review_helpful_review_id',
    'idx_review_helpful_user_id',
    'idx_review_helpful_created_at'
  ))
  OR
  -- common_code (곧 사용)
  (tablename IN ('common_code_master', 'common_code_detail'))
  OR
  -- users (곧 사용)
  (tablename = 'users' AND indexname = 'idx_users_email')
)
ORDER BY tablename, indexname;

-- =====================================================
-- 참고: 인덱스 재생성 (혹시 실수로 삭제했다면)
-- =====================================================

-- favorite_agents 인덱스 재생성 (필요시)
-- CREATE INDEX IF NOT EXISTS idx_favorite_agents_user_id 
--   ON public.favorite_agents(supabase_user_id);
-- CREATE INDEX IF NOT EXISTS idx_favorite_agents_agent_id 
--   ON public.favorite_agents(agent_id);
-- CREATE INDEX IF NOT EXISTS idx_favorite_agents_created_at 
--   ON public.favorite_agents(created_at DESC);

-- review_helpful 인덱스 재생성 (필요시)
-- CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id 
--   ON public.review_helpful(review_id);
-- CREATE INDEX IF NOT EXISTS idx_review_helpful_user_id 
--   ON public.review_helpful(supabase_user_id);
-- CREATE INDEX IF NOT EXISTS idx_review_helpful_created_at 
--   ON public.review_helpful(created_at DESC);

