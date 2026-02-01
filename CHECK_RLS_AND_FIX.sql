-- =====================================================
-- RLS 상태 확인 및 완전 제거
-- =====================================================

-- 1. 현재 RLS 상태 확인
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 현재 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 3. 모든 RLS 완전 제거 (다시 실행)
-- =====================================================

-- 모든 테이블의 RLS 비활성화
ALTER TABLE IF EXISTS public.agent_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.access_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.favorite_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agent_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agent_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.common_code_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.common_code_detail DISABLE ROW LEVEL SECURITY;

-- 모든 정책 삭제 (동적으로)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- public 스키마의 모든 정책 삭제
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
                      r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy: %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
    
    -- storage 스키마의 모든 정책 삭제
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects CASCADE', r.policyname);
        RAISE NOTICE 'Dropped storage policy: %', r.policyname;
    END LOOP;
END $$;

-- =====================================================
-- 4. 다시 확인 (결과가 모두 false여야 함)
-- =====================================================

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 5. 정책 확인 (결과가 0건이어야 함)
-- =====================================================

SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname IN ('public', 'storage');

-- 성공 메시지
SELECT 'RLS 완전 제거 완료!' as message;
