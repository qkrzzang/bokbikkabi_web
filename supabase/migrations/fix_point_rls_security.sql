-- ================================================
-- 포인트 시스템 RLS 보안 강화
-- ================================================
-- 작성일: 2026-02-05
-- 설명: point_transactions와 user_points의 RLS 정책을 강화하여
--       일반 사용자는 조회만 가능하고, 데이터 변경은 award_points 함수를 통해서만 가능하도록 수정

-- ================================================
-- 1. point_transactions RLS 정책 수정
-- ================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "System can manage transactions" ON point_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON point_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON point_transactions;

-- 새 정책 생성
-- 1.1 사용자는 자신의 거래 내역만 조회 가능
CREATE POLICY "Users can view own transactions" ON point_transactions
  FOR SELECT
  USING (supabase_user_id = (SELECT auth.uid()));

-- 1.2 관리자는 모든 거래 내역 조회 가능
CREATE POLICY "Admins can view all transactions" ON point_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = (SELECT auth.uid()) 
      AND users.user_type = 'ADMIN'
    )
  );

-- 1.3 INSERT/UPDATE/DELETE는 함수를 통해서만 가능
-- (SECURITY DEFINER 함수가 RLS를 우회하므로 별도 정책 불필요)

-- ================================================
-- 2. user_points RLS 정책 수정
-- ================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "System can manage user points" ON user_points;
DROP POLICY IF EXISTS "Users can view own points" ON user_points;
DROP POLICY IF EXISTS "Admins can view all points" ON user_points;

-- 새 정책 생성
-- 2.1 사용자는 자신의 포인트만 조회 가능
CREATE POLICY "Users can view own points" ON user_points
  FOR SELECT
  USING (supabase_user_id = (SELECT auth.uid()));

-- 2.2 관리자는 모든 포인트 조회 가능
CREATE POLICY "Admins can view all points" ON user_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = (SELECT auth.uid()) 
      AND users.user_type = 'ADMIN'
    )
  );

-- 2.3 INSERT/UPDATE/DELETE는 함수를 통해서만 가능
-- (트리거와 SECURITY DEFINER 함수가 RLS를 우회)

-- ================================================
-- 3. award_points 함수에 SECURITY DEFINER 확인/추가
-- ================================================

-- 함수 재생성 (SECURITY DEFINER 명시)
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
  -- 포인트 정책에서 포인트 값 조회
  SELECT CAST(code_name AS INT) INTO v_points
  FROM common_code_detail
  WHERE code_group = 'POINT_POLICY' 
    AND code_value = p_transaction_type 
    AND use_yn = 'Y'
    AND TO_CHAR(CURRENT_DATE, 'YYYYMMDD') BETWEEN sta_ymd AND end_ymd;

  -- 정책이 없으면 기본값 사용
  IF v_points IS NULL THEN
    CASE p_transaction_type
      WHEN 'ATTENDANCE' THEN v_points := 10;
      WHEN 'CONTRACT' THEN v_points := 100;
      WHEN 'SURVEY' THEN v_points := 50;
      WHEN 'REVIEW' THEN v_points := 200;
      WHEN 'FAVORITE' THEN v_points := 5;
      WHEN 'DAILY_LOGIN' THEN v_points := 5;
      WHEN 'AD_VIEW' THEN v_points := 10;
      ELSE v_points := 0;
    END CASE;
  END IF;

  -- 포인트 거래 기록 삽입
  INSERT INTO point_transactions (supabase_user_id, transaction_type, points, description)
  VALUES (p_user_id, p_transaction_type, v_points, COALESCE(p_description, p_transaction_type))
  RETURNING id INTO v_transaction_id;

  -- user_points 테이블 업데이트 (트리거가 자동 처리하지만 명시적으로도 가능)
  -- 트리거가 처리하므로 여기서는 생략

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
-- 4. 트리거 함수에 SECURITY DEFINER 확인/추가
-- ================================================
-- 주의: 이 트리거는 create_survey_and_point_system.sql에서 이미 생성되었으므로
--       여기서는 재생성하지 않습니다. (중복 방지)

-- ================================================
-- 5. 확인 쿼리
-- ================================================

-- RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('point_transactions', 'user_points')
ORDER BY tablename, policyname;

-- 함수의 SECURITY 설정 확인
SELECT 
  p.proname AS function_name,
  CASE p.prosecdef 
    WHEN true THEN 'DEFINER'
    ELSE 'INVOKER'
  END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('award_points', 'update_user_points')
ORDER BY p.proname;


