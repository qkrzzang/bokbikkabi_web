-- =====================================================
-- 403 Forbidden 오류 해결 SQL
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1. 기존 정책 모두 삭제 (중복 방지)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for trigger" ON public.users;
DROP POLICY IF EXISTS "Service role can insert" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- 2. SELECT 정책: 모든 사용자가 조회 가능
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users 
  FOR SELECT
  USING (true);

-- 3. INSERT 정책: 인증된 사용자는 자신의 프로필 생성 가능
CREATE POLICY "Users can insert own profile"
  ON public.users 
  FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

-- 4. UPDATE 정책: 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.users 
  FOR UPDATE
  USING (auth.uid() = supabase_user_id);

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- RLS 활성화 상태 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- 정책 목록 확인
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

