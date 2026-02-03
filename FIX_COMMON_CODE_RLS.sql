-- =====================================================
-- 공통코드 테이블 RLS 설정
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1. common_code_master 테이블
ALTER TABLE public.common_code_master ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Common code master viewable by everyone" ON public.common_code_master;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.common_code_master;

-- SELECT 정책: 모든 사용자가 조회 가능
CREATE POLICY "Common code master viewable by everyone"
  ON public.common_code_master 
  FOR SELECT
  USING (true);

-- INSERT 정책: 관리자만 추가 가능
CREATE POLICY "Admins can insert common code master"
  ON public.common_code_master 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = auth.uid()
      AND users.user_type = 'ADMIN'
    )
  );

-- UPDATE 정책: 관리자만 수정 가능
CREATE POLICY "Admins can update common code master"
  ON public.common_code_master 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = auth.uid()
      AND users.user_type = 'ADMIN'
    )
  );

-- DELETE 정책: 관리자만 삭제 가능
CREATE POLICY "Admins can delete common code master"
  ON public.common_code_master 
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = auth.uid()
      AND users.user_type = 'ADMIN'
    )
  );

-- 2. common_code_detail 테이블
ALTER TABLE public.common_code_detail ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Common code detail viewable by everyone" ON public.common_code_detail;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.common_code_detail;

-- SELECT 정책: 모든 사용자가 조회 가능
CREATE POLICY "Common code detail viewable by everyone"
  ON public.common_code_detail 
  FOR SELECT
  USING (true);

-- INSERT 정책: 관리자만 추가 가능
CREATE POLICY "Admins can insert common code detail"
  ON public.common_code_detail 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = auth.uid()
      AND users.user_type = 'ADMIN'
    )
  );

-- UPDATE 정책: 관리자만 수정 가능
CREATE POLICY "Admins can update common code detail"
  ON public.common_code_detail 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = auth.uid()
      AND users.user_type = 'ADMIN'
    )
  );

-- DELETE 정책: 관리자만 삭제 가능
CREATE POLICY "Admins can delete common code detail"
  ON public.common_code_detail 
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = auth.uid()
      AND users.user_type = 'ADMIN'
    )
  );

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- RLS 활성화 상태 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('common_code_master', 'common_code_detail');

-- 정책 목록 확인
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('common_code_master', 'common_code_detail')
ORDER BY tablename, cmd;

-- 데이터 조회 테스트
SELECT COUNT(*) as master_count FROM public.common_code_master;
SELECT COUNT(*) as detail_count FROM public.common_code_detail;

