-- ================================================
-- 일일 로그인 중복 지급 문제 해결
-- ================================================
-- 문제: created_at이 UTC로 저장되는데, 비교 시 timezone 변환이 제대로 안 됨
-- 해결: created_at을 KST로 변환한 후 날짜 비교

CREATE OR REPLACE FUNCTION check_and_award_daily_login(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_kst_today DATE;
  v_exists BOOLEAN;
  v_points INT;
  v_transaction_id BIGINT;
BEGIN
  -- 동시 호출 방지: 유저별 advisory lock (트랜잭션 종료 시 자동 해제)
  PERFORM pg_advisory_xact_lock(hashtext('daily_login_' || p_user_id::TEXT));

  -- 한국 시간(KST) 기준 오늘 날짜 계산
  v_kst_today := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
  
  -- 오늘 이미 지급되었는지 확인 (created_at을 KST로 변환하여 날짜 비교)
  SELECT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE supabase_user_id = p_user_id
    AND transaction_type = 'DAILY_LOGIN'
    AND (created_at AT TIME ZONE 'Asia/Seoul')::DATE = v_kst_today
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', '이미 오늘 로그인 포인트를 받았습니다.',
      'today', v_kst_today
    );
  END IF;

  -- 포인트 정책 조회 (DAILY_LOGIN)
  SELECT CAST(extra_value1 AS INT) INTO v_points
  FROM common_code_detail
  WHERE code_group = 'POINT_POLICY' 
    AND code_value = 'DAILY_LOGIN'
    AND use_yn = 'Y'
    AND CURRENT_DATE BETWEEN sta_ymd::DATE AND end_ymd::DATE;
  
  IF v_points IS NULL THEN
    v_points := 5; -- 기본값
  END IF;

  -- 포인트 지급
  INSERT INTO point_transactions (supabase_user_id, transaction_type, points, description)
  VALUES (p_user_id, 'DAILY_LOGIN', v_points, '일일 로그인 보상')
  RETURNING id INTO v_transaction_id;

  -- 트리거에 의해 user_points는 자동 업데이트됨

  RETURN jsonb_build_object(
    'success', true, 
    'points', v_points, 
    'transaction_id', v_transaction_id, 
    'message', '일일 로그인 포인트 지급 완료',
    'today', v_kst_today
  );
END;
$$;

-- 함수 사용 예시 및 테스트
-- SELECT check_and_award_daily_login(auth.uid());
