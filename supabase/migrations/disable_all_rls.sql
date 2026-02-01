-- =====================================================
-- RLS(Row Level Security) 전체 비활성화
-- =====================================================
-- 주의: 이 작업은 모든 테이블의 보안 정책을 제거합니다.
-- 프로덕션 환경에서는 신중하게 사용하세요.
-- =====================================================

-- 1. agent_master 테이블 RLS 비활성화
ALTER TABLE public.agent_master DISABLE ROW LEVEL SECURITY;

-- agent_master의 모든 정책 삭제
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agent_master;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.agent_master;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.agent_master;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.agent_master;

-- 2. users 테이블 RLS 비활성화
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- users의 모든 정책 삭제
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Enable read for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;

-- 3. access_logs 테이블 RLS 비활성화
ALTER TABLE public.access_logs DISABLE ROW LEVEL SECURITY;

-- access_logs의 모든 정책 삭제
DROP POLICY IF EXISTS "Enable insert for all users" ON public.access_logs;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.access_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.access_logs;

-- 4. favorite_agents 테이블 RLS 비활성화
ALTER TABLE public.favorite_agents DISABLE ROW LEVEL SECURITY;

-- favorite_agents의 모든 정책 삭제
DROP POLICY IF EXISTS "Users can read their own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorite_agents;

-- 5. agent_comments 테이블 RLS 비활성화
ALTER TABLE public.agent_comments DISABLE ROW LEVEL SECURITY;

-- agent_comments의 모든 정책 삭제
DROP POLICY IF EXISTS "Enable read for all users" ON public.agent_comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.agent_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.agent_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.agent_comments;

-- 6. agent_reviews 테이블 RLS 비활성화
ALTER TABLE public.agent_reviews DISABLE ROW LEVEL SECURITY;

-- agent_reviews의 모든 정책 삭제
DROP POLICY IF EXISTS "Enable read for all users" ON public.agent_reviews;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.agent_reviews;

-- 7. common_code_master 테이블 RLS 비활성화
ALTER TABLE public.common_code_master DISABLE ROW LEVEL SECURITY;

-- common_code_master의 모든 정책 삭제
DROP POLICY IF EXISTS "Enable read for all users" ON public.common_code_master;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.common_code_master;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.common_code_master;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.common_code_master;

-- 8. common_code_detail 테이블 RLS 비활성화
ALTER TABLE public.common_code_detail DISABLE ROW LEVEL SECURITY;

-- common_code_detail의 모든 정책 삭제
DROP POLICY IF EXISTS "Enable read for all users" ON public.common_code_detail;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.common_code_detail;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.common_code_detail;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.common_code_detail;

-- =====================================================
-- Storage Bucket 정책 삭제 (contracts)
-- =====================================================

-- contracts 버킷의 모든 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to contracts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from contracts bucket" ON storage.objects;

-- =====================================================
-- 확인 쿼리 (실행하지 않음, 참고용)
-- =====================================================

-- RLS 상태 확인:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public';

-- 정책 확인:
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

COMMENT ON TABLE public.agent_master IS 'RLS 비활성화됨 - 모든 사용자가 접근 가능';
COMMENT ON TABLE public.users IS 'RLS 비활성화됨 - 모든 사용자가 접근 가능';
COMMENT ON TABLE public.access_logs IS 'RLS 비활성화됨 - 모든 사용자가 접근 가능';
COMMENT ON TABLE public.favorite_agents IS 'RLS 비활성화됨 - 모든 사용자가 접근 가능';
COMMENT ON TABLE public.agent_comments IS 'RLS 비활성화됨 - 모든 사용자가 접근 가능';
COMMENT ON TABLE public.agent_reviews IS 'RLS 비활성화됨 - 모든 사용자가 접근 가능';
COMMENT ON TABLE public.common_code_master IS 'RLS 비활성화됨 - 모든 사용자가 접근 가능';
COMMENT ON TABLE public.common_code_detail IS 'RLS 비활성화됨 - 모든 사용자가 접근 가능';
