-- ================================================
-- 포인트 시스템 RLS 정리 및 보안 강화
-- ================================================
-- 작성일: 2026-02-05
-- 설명: 
-- 1. point_audit_log 테이블 삭제 (불필요)
-- 2. 기존 RLS 정책 정리
-- 3. 새로운 보안 강화 정책 적용

-- ================================================
-- 1. point_audit_log 테이블 삭제 (사용하지 않음)
-- ================================================
DROP TABLE IF EXISTS point_audit_log CASCADE;

-- ================================================
-- 2. point_transactions RLS 정책 정리 및 재생성
-- ================================================

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "System can manage transactions" ON point_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON point_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON point_transactions;

-- RLS 활성화 확인
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- 새 정책: 사용자는 자신의 거래 내역만 조회
CREATE POLICY "Users can view own transactions" ON point_transactions
  FOR SELECT
  USING (supabase_user_id = (SELECT auth.uid()));

-- 새 정책: 관리자는 모든 거래 내역 조회
CREATE POLICY "Admins can view all transactions" ON point_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = (SELECT auth.uid()) 
      AND users.user_type = 'ADMIN'
    )
  );

-- INSERT/UPDATE/DELETE는 정책 없음 (SECURITY DEFINER 함수만 가능)

-- ================================================
-- 3. user_points RLS 정책 정리 및 재생성
-- ================================================

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "System can manage user points" ON user_points;
DROP POLICY IF EXISTS "Users can view own points" ON user_points;
DROP POLICY IF EXISTS "Admins can view all points" ON user_points;

-- RLS 활성화 확인
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- 새 정책: 사용자는 자신의 포인트만 조회
CREATE POLICY "Users can view own points" ON user_points
  FOR SELECT
  USING (supabase_user_id = (SELECT auth.uid()));

-- 새 정책: 관리자는 모든 포인트 조회
CREATE POLICY "Admins can view all points" ON user_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = (SELECT auth.uid()) 
      AND users.user_type = 'ADMIN'
    )
  );

-- INSERT/UPDATE/DELETE는 정책 없음 (트리거와 SECURITY DEFINER 함수만 가능)

-- ================================================
-- 4. award_points 함수에 SECURITY DEFINER 확인
-- ================================================

CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER  -- 함수 소유자 권한으로 실행 (RLS 우회)
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_points INT;
  v_transaction_id BIGINT;
BEGIN
  -- 포인트 정책에서 포인트 값 조회 (extra_value1에서 포인트 값 가져오기)
  SELECT CAST(extra_value1 AS INT) INTO v_points
  FROM common_code_detail
  WHERE code_group = 'POINT_POLICY' 
    AND code_value = p_transaction_type 
    AND use_yn = 'Y'
    AND CURRENT_DATE BETWEEN sta_ymd AND end_ymd;

  -- 정책이 없으면 0 포인트
  IF v_points IS NULL THEN
    RAISE NOTICE 'No active policy found for transaction_type: %. Setting points to 0.', p_transaction_type;
    v_points := 0;
  END IF;

  -- 포인트 거래 기록 삽입
  -- 참고: point_type 컬럼이 transaction_type으로 변경되었음
  INSERT INTO point_transactions (supabase_user_id, transaction_type, points, description)
  VALUES (p_user_id, p_transaction_type, v_points, COALESCE(p_description, p_transaction_type))
  RETURNING id INTO v_transaction_id;

  -- 결과 반환
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'points', v_points,
    'user_id', p_user_id
  );
END;
$$;

-- ================================================
-- 5. 트리거 함수에 SECURITY DEFINER 확인
-- ================================================
-- 주의: 이 트리거는 create_survey_and_point_system.sql에서 이미 생성되었으므로
--       여기서는 재생성하지 않습니다. (중복 방지)

-- ================================================
-- 6. 확인 쿼리
-- ================================================

-- 6.1 RLS 활성화 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('point_transactions', 'user_points')
ORDER BY tablename;

-- 6.2 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  SUBSTRING(qual::text, 1, 50) AS using_clause,
  SUBSTRING(with_check::text, 1, 50) AS with_check_clause
FROM pg_policies
WHERE tablename IN ('point_transactions', 'user_points')
ORDER BY tablename, policyname;

-- 6.3 함수 보안 타입 확인
SELECT 
  p.proname AS function_name,
  CASE p.prosecdef 
    WHEN true THEN 'DEFINER ✅'
    ELSE 'INVOKER ❌'
  END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('award_points', 'update_user_points')
ORDER BY p.proname;

-- 6.4 point_audit_log 테이블 존재 여부 확인 (삭제되었어야 함)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'point_audit_log')
    THEN '❌ point_audit_log가 아직 존재합니다'
    ELSE '✅ point_audit_log가 정상적으로 삭제되었습니다'
  END AS audit_log_status;


