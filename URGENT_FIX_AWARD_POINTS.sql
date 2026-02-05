-- ================================================
-- 긴급 수정: award_points 함수 날짜 비교 오류 해결
-- ================================================
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- 주의: add_point_policy_to_common_code.sql을 먼저 실행해야 합니다!

-- 1. 기존 함수 삭제
DROP FUNCTION IF EXISTS award_points(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS award_points(UUID, VARCHAR, TEXT, BIGINT);

-- 2. award_points 함수 재생성 (올바른 DATE 비교 사용)
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_points INT;
  v_transaction_id BIGINT;
BEGIN
  -- 공통 코드에서 포인트 정책 조회 (extra_value1에서 포인트 값 가져오기)
  SELECT CAST(extra_value1 AS INT) INTO v_points
  FROM common_code_detail
  WHERE code_group = 'POINT_POLICY' 
    AND code_value = p_transaction_type 
    AND use_yn = 'Y'
    AND CURRENT_DATE BETWEEN sta_ymd AND end_ymd;

  -- 정책이 없으면 0 포인트 (또는 로그 남기기)
  IF v_points IS NULL THEN
    RAISE NOTICE 'No active policy found for transaction_type: %. Setting points to 0.', p_transaction_type;
    v_points := 0;
  END IF;

  -- 포인트 거래 기록 삽입
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

-- 3. 함수가 정상적으로 생성되었는지 확인
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'award_points';

-- 4. 테스트 (필요시 주석 해제)
-- SELECT award_points(
--   auth.uid(),
--   'DAILY_LOGIN',
--   '로그인 테스트'
-- );
