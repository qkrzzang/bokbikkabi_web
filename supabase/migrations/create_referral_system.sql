-- ================================================
-- 리퍼럴(추천인) 시스템
-- ================================================
-- 작성일: 2026-02-19
-- 설명: URL ?ref=USER_ID 기반 추천인 시스템
--   - 신규 가입자의 첫 리뷰 작성 시 추천인에게 1,000P 지급
--   - 추천인 월 최대 10명 제한
--   - 동일 IP 중복 방지

-- ================================================
-- 1. users 테이블에 referred_by 컬럼 추가
-- ================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(supabase_user_id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_rewarded BOOLEAN DEFAULT FALSE;

-- ================================================
-- 2. 리퍼럴 보상 추적 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS referral_rewards (
  id BIGSERIAL PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.users(supabase_user_id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES public.users(supabase_user_id) ON DELETE CASCADE,
  referrer_points INT NOT NULL DEFAULT 0,
  referee_points INT NOT NULL DEFAULT 0,
  signup_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_created ON referral_rewards(created_at);

-- RLS
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral rewards" ON referral_rewards
  FOR SELECT USING (
    referrer_id = auth.uid() OR referee_id = auth.uid()
  );

CREATE POLICY "Service role can manage referral rewards" ON referral_rewards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- 3. 공통코드: 리퍼럴 포인트 정책
-- ================================================
INSERT INTO common_code_detail (
  code_group, code_value, code_name, description, extra_value1, extra_value2, sort_order, use_yn, sta_ymd, end_ymd
)
SELECT 'POINT_POLICY', 'REFERRAL_REWARD', '1000', '추천인 보상 (피추천인 첫 리뷰 작성 시)', '1000', '추천인 보상', 9, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'REFERRAL_REWARD'
);

INSERT INTO common_code_detail (
  code_group, code_value, code_name, description, extra_value1, extra_value2, sort_order, use_yn, sta_ymd, end_ymd
)
SELECT 'POINT_POLICY', 'REFERRAL_BONUS', '500', '피추천인 보너스 (첫 리뷰 작성 시)', '500', '피추천인 보너스', 10, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'REFERRAL_BONUS'
);

-- ================================================
-- 4. 리퍼럴 보상 지급 함수
-- ================================================
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
  -- 피추천인의 추천인 및 이메일 조회
  SELECT referred_by, referral_rewarded, email
  INTO v_referrer_id, v_already_rewarded, v_referee_email
  FROM users
  WHERE supabase_user_id = p_referee_id;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'no_referrer');
  END IF;

  IF v_already_rewarded THEN
    RETURN json_build_object('success', false, 'reason', 'already_rewarded');
  END IF;

  IF v_referrer_id = p_referee_id THEN
    RETURN json_build_object('success', false, 'reason', 'self_referral');
  END IF;

  -- 이메일 기반 중복 보상 차단 (탈퇴-재가입 어뷰징 방지)
  IF v_referee_email IS NOT NULL AND v_referee_email <> '' THEN
    SELECT COUNT(*) INTO v_email_reward_count
    FROM referral_rewards
    WHERE referee_email = v_referee_email;

    IF v_email_reward_count > 0 THEN
      RETURN json_build_object('success', false, 'reason', 'email_already_rewarded');
    END IF;
  END IF;

  -- 추천인의 이번 달 보상 횟수 체크 (최대 10명)
  SELECT COUNT(*) INTO v_monthly_count
  FROM referral_rewards
  WHERE referrer_id = v_referrer_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month';

  IF v_monthly_count >= 10 THEN
    RETURN json_build_object('success', false, 'reason', 'monthly_limit_reached', 'count', v_monthly_count);
  END IF;

  -- 동일 IP 중복 방지 (같은 IP에서 이미 추천 보상이 2건 이상이면 차단)
  IF p_signup_ip IS NOT NULL AND p_signup_ip <> '' THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM referral_rewards
    WHERE referrer_id = v_referrer_id
      AND signup_ip = p_signup_ip;

    IF v_ip_count >= 2 THEN
      RETURN json_build_object('success', false, 'reason', 'duplicate_ip');
    END IF;
  END IF;

  -- 포인트 정책 조회
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

  -- 추천인 포인트 지급
  INSERT INTO point_transactions (supabase_user_id, transaction_type, points, description)
  VALUES (v_referrer_id, 'REFERRAL_REWARD', v_referrer_points, '추천인 보상 (피추천인 첫 리뷰 작성)');

  -- 피추천인 보너스 지급
  INSERT INTO point_transactions (supabase_user_id, transaction_type, points, description)
  VALUES (p_referee_id, 'REFERRAL_BONUS', v_referee_points, '추천 가입 보너스 (첫 리뷰 작성)');

  -- 보상 기록 (referee_email 포함)
  INSERT INTO referral_rewards (referrer_id, referee_id, referrer_points, referee_points, signup_ip, referee_email)
  VALUES (v_referrer_id, p_referee_id, v_referrer_points, v_referee_points, p_signup_ip, v_referee_email);

  -- 보상 완료 플래그
  UPDATE users SET referral_rewarded = TRUE WHERE supabase_user_id = p_referee_id;

  RETURN json_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referrer_points', v_referrer_points,
    'referee_points', v_referee_points
  );
END;
$$;
