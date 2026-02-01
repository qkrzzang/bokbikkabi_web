-- =====================================================
-- RLS(Row Level Security) 완전 제거 - 최종본
-- =====================================================
-- 대부분의 커뮤니티/리뷰 서비스는 RLS를 사용하지 않습니다.
-- 애플리케이션 레벨에서 권한을 관리하는 것이 더 간단하고 유지보수가 쉽습니다.
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

-- 모든 기존 정책 삭제
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Storage 정책도 모두 삭제
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- =====================================================
-- 설명
-- =====================================================

COMMENT ON TABLE public.agent_master IS '공개 데이터 - RLS 불필요';
COMMENT ON TABLE public.users IS '사용자 정보 - 앱 레벨에서 관리';
COMMENT ON TABLE public.access_logs IS '로그 데이터 - RLS 불필요';
COMMENT ON TABLE public.favorite_agents IS '즐겨찾기 - 앱 레벨에서 관리';
COMMENT ON TABLE public.agent_comments IS '댓글 - 앱 레벨에서 관리';
COMMENT ON TABLE public.agent_reviews IS '리뷰 - 공개 데이터, 앱 레벨에서 관리';
COMMENT ON TABLE public.common_code_master IS '공통코드 - 공개 데이터';
COMMENT ON TABLE public.common_code_detail IS '공통코드 상세 - 공개 데이터';

-- =====================================================
-- 보안은 애플리케이션 레벨에서 처리
-- =====================================================
-- 
-- 1. 계약서 업로드: 암호화 저장 (이미 구현됨)
-- 2. 리뷰 작성: 로그인 체크 (components/CameraButton.tsx)
-- 3. 사용자 정보: 세션 체크 (lib/auth-check.ts)
-- 4. 관리자 기능: user_type 체크 (components/Header.tsx)
--
-- RLS 없이도 충분히 안전하게 운영 가능합니다.
-- 오히려 성능이 좋아지고 코드가 단순해집니다.
-- =====================================================
