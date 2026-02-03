-- =====================================================
-- RLS 성능 경고 해결 SQL
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- =====================================================
-- 1. users 테이블 정책 최적화
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- SELECT: 모든 사용자 조회 가능
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users 
  FOR SELECT
  USING (true);

-- INSERT: 인증된 사용자는 자신의 프로필 생성 (최적화)
CREATE POLICY "Users can insert own profile"
  ON public.users 
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- UPDATE: 사용자는 자신의 프로필만 수정 (최적화)
CREATE POLICY "Users can update own profile"
  ON public.users 
  FOR UPDATE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- =====================================================
-- 2. partnership_inquiries 테이블 정책 최적화
-- =====================================================

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view their own inquiries" ON public.partnership_inquiries;
DROP POLICY IF EXISTS "Authenticated users can create inquiries" ON public.partnership_inquiries;
DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.partnership_inquiries;
DROP POLICY IF EXISTS "Admins can update inquiries" ON public.partnership_inquiries;

-- SELECT: 사용자는 본인 문의 OR 관리자는 모든 문의 (통합 정책)
CREATE POLICY "Users can view own inquiries or admins can view all"
  ON public.partnership_inquiries 
  FOR SELECT
  USING (
    (SELECT auth.uid()) = supabase_user_id
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- INSERT: 인증된 사용자만 문의 작성 가능 (최적화)
CREATE POLICY "Authenticated users can create inquiries"
  ON public.partnership_inquiries 
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- UPDATE: 관리자만 문의 수정 가능 (최적화)
CREATE POLICY "Admins can update inquiries"
  ON public.partnership_inquiries 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- =====================================================
-- 3. common_code_master 테이블 정책 최적화
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Common code master viewable by everyone" ON public.common_code_master;
DROP POLICY IF EXISTS "Admins can insert common code master" ON public.common_code_master;
DROP POLICY IF EXISTS "Admins can update common code master" ON public.common_code_master;
DROP POLICY IF EXISTS "Admins can delete common code master" ON public.common_code_master;

-- SELECT: 모든 사용자 조회 가능
CREATE POLICY "Common code master viewable by everyone"
  ON public.common_code_master 
  FOR SELECT
  USING (true);

-- INSERT: 관리자만 추가 가능 (최적화)
CREATE POLICY "Admins can insert common code master"
  ON public.common_code_master 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- UPDATE: 관리자만 수정 가능 (최적화)
CREATE POLICY "Admins can update common code master"
  ON public.common_code_master 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- DELETE: 관리자만 삭제 가능 (최적화)
CREATE POLICY "Admins can delete common code master"
  ON public.common_code_master 
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- =====================================================
-- 4. common_code_detail 테이블 정책 최적화
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Common code detail viewable by everyone" ON public.common_code_detail;
DROP POLICY IF EXISTS "Admins can insert common code detail" ON public.common_code_detail;
DROP POLICY IF EXISTS "Admins can update common code detail" ON public.common_code_detail;
DROP POLICY IF EXISTS "Admins can delete common code detail" ON public.common_code_detail;

-- SELECT: 모든 사용자 조회 가능
CREATE POLICY "Common code detail viewable by everyone"
  ON public.common_code_detail 
  FOR SELECT
  USING (true);

-- INSERT: 관리자만 추가 가능 (최적화)
CREATE POLICY "Admins can insert common code detail"
  ON public.common_code_detail 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- UPDATE: 관리자만 수정 가능 (최적화)
CREATE POLICY "Admins can update common code detail"
  ON public.common_code_detail 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- DELETE: 관리자만 삭제 가능 (최적화)
CREATE POLICY "Admins can delete common code detail"
  ON public.common_code_detail 
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- 정책 목록 확인
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('users', 'partnership_inquiries', 'common_code_master', 'common_code_detail')
ORDER BY tablename, cmd;

