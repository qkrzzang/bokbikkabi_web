-- =====================================================
-- RLS(Row Level Security) 최적화된 정책으로 재활성화
-- =====================================================
-- auth.uid() 함수 호출 최적화: (SELECT auth.uid()) 사용
-- 이렇게 하면 한 번 호출한 결과를 재사용하여 성능 개선
-- =====================================================

-- 1. users 테이블 RLS 활성화 및 정책 생성
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 조회 가능 (최적화)
CREATE POLICY "Users can read their own data"
  ON public.users
  FOR SELECT
  USING ((SELECT auth.uid()) = supabase_user_id);

-- 사용자는 자신의 데이터만 삽입 가능 (최적화)
CREATE POLICY "Users can insert their own data"
  ON public.users
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- 사용자는 자신의 데이터만 수정 가능 (최적화)
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING ((SELECT auth.uid()) = supabase_user_id)
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- 2. access_logs 테이블 RLS 활성화 및 정책 생성
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 로그 삽입 가능 (비로그인 사용자 포함)
CREATE POLICY "Enable insert for all users"
  ON public.access_logs
  FOR INSERT
  WITH CHECK (true);

-- 로그인한 사용자는 자신의 로그만 조회 가능 (최적화)
CREATE POLICY "Users can read their own logs"
  ON public.access_logs
  FOR SELECT
  USING (
    supabase_user_id IS NULL -- 비로그인 사용자 로그는 모두 조회 가능
    OR (SELECT auth.uid()) = supabase_user_id -- 로그인 사용자는 자신의 로그만
  );

-- 3. favorite_agents 테이블 RLS 활성화 및 정책 생성
ALTER TABLE public.favorite_agents ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 즐겨찾기만 조회 가능 (최적화)
CREATE POLICY "Users can read their own favorites"
  ON public.favorite_agents
  FOR SELECT
  USING ((SELECT auth.uid()) = supabase_user_id);

-- 사용자는 자신의 즐겨찾기만 추가 가능 (최적화)
CREATE POLICY "Users can insert their own favorites"
  ON public.favorite_agents
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- 사용자는 자신의 즐겨찾기만 삭제 가능 (최적화)
CREATE POLICY "Users can delete their own favorites"
  ON public.favorite_agents
  FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- 4. agent_comments 테이블 RLS 활성화 및 정책 생성
ALTER TABLE public.agent_comments ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 댓글 조회 가능
CREATE POLICY "Enable read for all users"
  ON public.agent_comments
  FOR SELECT
  USING (true);

-- 로그인한 사용자만 댓글 작성 가능 (최적화)
CREATE POLICY "Enable insert for authenticated users"
  ON public.agent_comments
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 사용자는 자신의 댓글만 수정 가능 (최적화)
CREATE POLICY "Users can update their own comments"
  ON public.agent_comments
  FOR UPDATE
  USING (
    supabase_user_id IS NOT NULL 
    AND (SELECT auth.uid()) = supabase_user_id
  )
  WITH CHECK (
    supabase_user_id IS NOT NULL 
    AND (SELECT auth.uid()) = supabase_user_id
  );

-- 사용자는 자신의 댓글만 삭제 가능 (최적화)
CREATE POLICY "Users can delete their own comments"
  ON public.agent_comments
  FOR DELETE
  USING (
    supabase_user_id IS NOT NULL 
    AND (SELECT auth.uid()) = supabase_user_id
  );

-- 5. agent_reviews 테이블 RLS 활성화 및 정책 생성
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 리뷰 조회 가능
CREATE POLICY "Enable read for all users"
  ON public.agent_reviews
  FOR SELECT
  USING (true);

-- 로그인한 사용자만 리뷰 작성 가능 (최적화)
CREATE POLICY "Enable insert for authenticated users"
  ON public.agent_reviews
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 사용자는 자신의 리뷰만 수정 가능 (최적화)
CREATE POLICY "Users can update their own reviews"
  ON public.agent_reviews
  FOR UPDATE
  USING (
    supabase_user_id IS NOT NULL 
    AND (SELECT auth.uid()) = supabase_user_id
  )
  WITH CHECK (
    supabase_user_id IS NOT NULL 
    AND (SELECT auth.uid()) = supabase_user_id
  );

-- 사용자는 자신의 리뷰만 삭제 가능 (최적화)
CREATE POLICY "Users can delete their own reviews"
  ON public.agent_reviews
  FOR DELETE
  USING (
    supabase_user_id IS NOT NULL 
    AND (SELECT auth.uid()) = supabase_user_id
  );

-- 6. agent_master 테이블 RLS 활성화 및 정책 생성
ALTER TABLE public.agent_master ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 중개사무소 정보 조회 가능
CREATE POLICY "Enable read access for all users"
  ON public.agent_master
  FOR SELECT
  USING (true);

-- 관리자만 중개사무소 정보 수정 가능 (최적화)
CREATE POLICY "Enable update for admin users only"
  ON public.agent_master
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = (SELECT auth.uid()) 
      AND user_type = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = (SELECT auth.uid()) 
      AND user_type = 'ADMIN'
    )
  );

-- 7. common_code_master 테이블 RLS 활성화 및 정책 생성
ALTER TABLE public.common_code_master ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 공통코드 마스터 조회 가능
CREATE POLICY "Enable read for all users"
  ON public.common_code_master
  FOR SELECT
  USING (true);

-- 관리자만 공통코드 마스터 수정 가능 (최적화)
CREATE POLICY "Enable write for admin users only"
  ON public.common_code_master
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = (SELECT auth.uid()) 
      AND user_type = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = (SELECT auth.uid()) 
      AND user_type = 'ADMIN'
    )
  );

-- 8. common_code_detail 테이블 RLS 활성화 및 정책 생성
ALTER TABLE public.common_code_detail ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 공통코드 상세 조회 가능
CREATE POLICY "Enable read for all users"
  ON public.common_code_detail
  FOR SELECT
  USING (true);

-- 관리자만 공통코드 상세 수정 가능 (최적화)
CREATE POLICY "Enable write for admin users only"
  ON public.common_code_detail
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = (SELECT auth.uid()) 
      AND user_type = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = (SELECT auth.uid()) 
      AND user_type = 'ADMIN'
    )
  );

-- =====================================================
-- Storage Bucket 정책 (contracts)
-- =====================================================

-- 로그인한 사용자는 자신의 계약서 업로드 가능 (최적화)
CREATE POLICY "Allow authenticated uploads to contracts bucket"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND (SELECT auth.uid()) IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- 로그인한 사용자는 자신의 계약서만 조회 가능 (최적화)
CREATE POLICY "Allow authenticated reads from contracts bucket"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND (SELECT auth.uid()) IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- 로그인한 사용자는 자신의 계약서만 수정 가능 (최적화)
CREATE POLICY "Allow authenticated updates to contracts bucket"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'contracts'
    AND (SELECT auth.uid()) IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'contracts'
    AND (SELECT auth.uid()) IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- 로그인한 사용자는 자신의 계약서만 삭제 가능 (최적화)
CREATE POLICY "Allow authenticated deletes from contracts bucket"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'contracts'
    AND (SELECT auth.uid()) IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- =====================================================
-- 성능 개선 요약
-- =====================================================

COMMENT ON TABLE public.users IS 'RLS 활성화 (최적화됨) - auth.uid() 호출 최소화';
COMMENT ON TABLE public.access_logs IS 'RLS 활성화 (최적화됨) - auth.uid() 호출 최소화';
COMMENT ON TABLE public.favorite_agents IS 'RLS 활성화 (최적화됨) - auth.uid() 호출 최소화';
COMMENT ON TABLE public.agent_comments IS 'RLS 활성화 (최적화됨) - auth.uid() 호출 최소화';
COMMENT ON TABLE public.agent_reviews IS 'RLS 활성화 (최적화됨) - auth.uid() 호출 최소화';
COMMENT ON TABLE public.agent_master IS 'RLS 활성화 (최적화됨) - 모든 사용자 조회 가능, 관리자만 수정';
COMMENT ON TABLE public.common_code_master IS 'RLS 활성화 (최적화됨) - 모든 사용자 조회 가능, 관리자만 수정';
COMMENT ON TABLE public.common_code_detail IS 'RLS 활성화 (최적화됨) - 모든 사용자 조회 가능, 관리자만 수정';

-- 최적화 전: auth.uid() = user_id (매번 함수 호출)
-- 최적화 후: (SELECT auth.uid()) = user_id (한 번 호출한 결과를 재사용)
-- 
-- 성능 개선 효과:
-- - 함수 호출 횟수 감소
-- - 쿼리 플래너가 결과를 캐시
-- - 복잡한 조건에서 더 효율적
