-- ================================================
-- 리퍼럴(추천인) 보상 자동 지급 트리거
-- ================================================
-- 작성일: 2026-02-20
-- 설명: 
--   1. 리뷰(agent_reviews)가 INSERT될 때 자동으로 실행됩니다.
--   2. 해당 유저가 추천인 코드로 가입했고, 아직 보상을 받지 않았다면
--   3. process_referral_reward 함수를 호출하여 보상을 지급합니다.
--   4. 이를 통해 클라이언트 API 조작을 통한 어뷰징을 원천 차단합니다.

-- 1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION trigger_referral_reward_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_rewarded BOOLEAN;
  v_reward_result JSON;
BEGIN
  -- 1. 해당 유저가 이미 리퍼럴 보상을 받았는지 확인
  SELECT referral_rewarded INTO v_referral_rewarded
  FROM users
  WHERE supabase_user_id = NEW.supabase_user_id;

  -- 2. 보상을 받지 않은 경우에만 시도
  IF v_referral_rewarded IS FALSE THEN
    -- process_referral_reward 함수 호출 (권한은 Security Definer로 처리됨)
    -- p_signup_ip는 리뷰 작성 시점의 IP를 알 수 없으므로 NULL로 처리하거나, 
    -- users 테이블에 가입 IP가 있다면 그것을 사용해야 함. 
    -- 여기서는 NULL로 넘기되, process_referral_reward 내부에서 IP 체크가 필수라면 
    -- 로직 조정이 필요할 수 있음. 현재는 NULL 허용됨.
    
    SELECT process_referral_reward(NEW.supabase_user_id, NULL) INTO v_reward_result;
    
    -- 로그 남기기 (선택 사항)
    RAISE NOTICE 'Referral reward trigger executed for user %: %', NEW.supabase_user_id, v_reward_result;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. 트리거 생성
DROP TRIGGER IF EXISTS on_review_insert_reward ON agent_reviews;

CREATE TRIGGER on_review_insert_reward
  AFTER INSERT ON agent_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_referral_reward_func();
