-- ================================================
-- 신규가입자 응모권 1장 무료 지급 함수
-- ================================================
-- 조건: 2026-04-15까지 가입한 신규가입자
-- 중복 지급 방지: ticket_transactions에 SIGNUP_BONUS 이력이 있으면 스킵
-- 응모권 이력: transaction_type = 'SIGNUP_BONUS'로 기록

CREATE OR REPLACE FUNCTION award_signup_ticket(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing RECORD;
  v_tx_id BIGINT;
BEGIN
  -- 이벤트 기간 체크 (4/15까지)
  IF CURRENT_DATE > '2026-04-15'::DATE THEN
    RETURN json_build_object('success', false, 'reason', 'event_ended');
  END IF;

  -- 중복 지급 방지: 이미 SIGNUP_BONUS를 받았는지 확인
  SELECT id INTO v_existing
  FROM ticket_transactions
  WHERE supabase_user_id = p_user_id
    AND transaction_type = 'SIGNUP_BONUS'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'reason', 'already_awarded');
  END IF;

  -- 응모권 1장 지급 (트리거로 user_tickets 자동 업데이트)
  INSERT INTO ticket_transactions (
    supabase_user_id, transaction_type, tickets, description
  ) VALUES (
    p_user_id, 'SIGNUP_BONUS', 1, '신규가입 이벤트 응모권 1장 무료 지급 (~4/15)'
  ) RETURNING id INTO v_tx_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'tickets', 1,
    'message', '신규가입 축하! 응모권 1장이 지급되었습니다.'
  );
END;
$$;
