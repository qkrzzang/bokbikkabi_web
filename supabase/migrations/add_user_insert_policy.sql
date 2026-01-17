-- users 테이블에 사용자가 자신의 레코드를 INSERT할 수 있도록 정책 추가
-- 프론트엔드에서 직접 Upsert할 수 있도록 허용

-- 기존 정책 확인 후 추가
-- 사용자가 자신의 레코드를 INSERT할 수 있도록 (supabase_user_id가 자신의 auth.uid()와 일치)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

-- 주석:
-- - 사용자가 자신의 supabase_user_id로 레코드를 INSERT할 수 있도록 허용
-- - Upsert 시 INSERT가 발생할 수 있으므로 이 정책이 필요합니다
-- - UPDATE는 기존 "Users can update own profile" 정책으로 처리됩니다
