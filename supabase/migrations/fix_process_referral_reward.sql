-- ================================================
-- 리퍼럴(추천인) 보상 지급 함수 수정 (Race Condition 방지)
-- ================================================
-- 작성일: 2026-02-20
-- 설명: 
--   1. 'FOR UPDATE'를 사용하여 피추천인(referee) 행을 잠금(Lock)하여 동시성 문제를 해결합니다.
--   2. 이중 보상 지급을 방지합니다.

CREATE OR REPLACE FUNCTION process_referral_reward(
  p_referee_id UUID,
  p_signup_ip TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_referrer_id UUID;
  v_already_rewarded BOOLEAN;
  v_monthly_count INT;
  v_referrer_points INT;
  v_referee_points INT;
  v_ip_count INT;
  v_referee_email TEXT;
  v_email_reward_count INT;
BEGIN
  -- 1. 피추천인의 추천인 및 이메일 조회 (FOR UPDATE로 행 잠금)
  --    동시에 같은 유저에 대한 요청이 오면 여기서 대기하게 됨.
  SELECT referred_by, referral_rewarded, email
  INTO v_referrer_id, v_already_rewarded, v_referee_email
  FROM users
  WHERE supabase_user_id = p_referee_id
  FOR UPDATE;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'no_referrer');
  END IF;

  -- 2. 이미 보상 받았는지 확인 (잠금 획득 후 최신 상태 확인)
  IF v_already_rewarded THEN
    RETURN json_build_object('success', false, 'reason', 'already_rewarded');
  END IF;

  IF v_referrer_id = p_referee_id THEN
    RETURN json_build_object('success', false, 'reason', 'self_referral');
  END IF;

  -- 3. 이메일 기반 중복 보상 차단
  IF v_referee_email IS NOT NULL AND v_referee_email <> '' THEN
    SELECT COUNT(*) INTO v_email_reward_count
    FROM referral_rewards
    WHERE referee_email = v_referee_email;

    IF v_email_reward_count > 0 THEN
      RETURN json_build_object('success', false, 'reason', 'email_already_rewarded');
    END IF;
  END IF;

  -- 4. 추천인의 이번 달 보상 횟수 체크 (최대 10명)
  --    참고: 추천인 행은 잠그지 않으므로 극한의 동시성 상황에서 10명을 초과할 수 있으나,
  --    Deadlock 방지를 위해 허용함.
  SELECT COUNT(*) INTO v_monthly_count
  FROM referral_rewards
  WHERE referrer_id = v_referrer_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month';

  IF v_monthly_count >= 10 THEN
    RETURN json_build_object('success', false, 'reason', 'monthly_limit_reached', 'count', v_monthly_count);
  END IF;

  -- 5. 동일 IP 중복 방지
  IF p_signup_ip IS NOT NULL AND p_signup_ip <> '' THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM referral_rewards
    WHERE referrer_id = v_referrer_id
      AND signup_ip = p_signup_ip;

    IF v_ip_count >= 2 THEN
      RETURN json_build_object('success', false, 'reason', 'duplicate_ip');
    END IF;
  END IF;

  -- 6. 포인트 정책 조회
  SELECT CAST(extra_value1 AS INT) INTO v_referrer_points
  FROM common_code_detail
  WHERE code_group = 'POINT_POLICY' AND code_value = 'REFERRAL_REWARD'
    AND use_yn = 'Y' AND CURRENT_DATE BETWEEN sta_ymd AND end_ymd;

  SELECT CAST(extra_value1 AS INT) INTO v_referee_points
  FROM common_code_detail
  WHERE code_group = 'POINT_POLICY' AND code_value = 'REFERRAL_BONUS'
    AND use_yn = 'Y' AND CURRENT_DATE BETWEEN sta_ymd AND end_ymd;

  v_referrer_points := COALESCE(v_referrer_points, 1000);
  v_referee_points := COALESCE(v_referee_points, 500);

  -- 7. 보상 지급 및 기록
  INSERT INTO point_transactions (supabase_user_id, transaction_type, points, description)
  VALUES (v_referrer_id, 'REFERRAL_REWARD', v_referrer_points, '추천인 보상 (피추천인 첫 리뷰 작성)');

  INSERT INTO point_transactions (supabase_user_id, transaction_type, points, description)
  VALUES (p_referee_id, 'REFERRAL_BONUS', v_referee_points, '추천 가입 보너스 (첫 리뷰 작성)');

  INSERT INTO referral_rewards (referrer_id, referee_id, referrer_points, referee_points, signup_ip, referee_email)
  VALUES (v_referrer_id, p_referee_id, v_referrer_points, v_referee_points, p_signup_ip, v_referee_email);

  UPDATE users SET referral_rewarded = TRUE WHERE supabase_user_id = p_referee_id;

  RETURN json_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referrer_points', v_referrer_points,
    'referee_points', v_referee_points
  );
END;
$$;
