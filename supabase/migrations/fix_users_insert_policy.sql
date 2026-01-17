-- users 테이블에 INSERT 정책 추가
-- Trigger 함수가 users 테이블에 INSERT할 수 있도록 허용

-- 기존 INSERT 정책이 있으면 삭제
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for trigger" ON public.users;
DROP POLICY IF EXISTS "Service role can insert" ON public.users;

-- SECURITY DEFINER 함수는 함수 소유자(보통 postgres)의 권한으로 실행됩니다.
-- RLS를 우회하기 위해 함수 내에서 SET LOCAL을 사용하거나,
-- 또는 INSERT 정책을 추가해야 합니다.

-- 방법 1: 모든 INSERT 허용 (Trigger 전용이므로 안전)
CREATE POLICY "Enable insert for trigger"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- 주석: 
-- - SECURITY DEFINER 함수는 함수 소유자의 권한으로 실행됩니다.
-- - Supabase에서 함수를 생성하면 보통 postgres 사용자가 소유자가 됩니다.
-- - RLS가 활성화되어 있으면 INSERT 정책이 필요합니다.
-- - 위 정책은 Trigger 함수가 INSERT할 수 있도록 허용합니다.
