-- ================================================
-- 럭키드로우 경품 콘텐츠 공통코드 관리
-- ================================================
-- 작성일: 2026-02-19
-- 설명: 럭키드로우 경품을 common_code로 관리
--   code_group: LUCKY_DRAW_PRIZE
--   code_value: 고유 식별자 (PRIZE_001 등)
--   code_name: 경품명
--   description: 경품 설명
--   extra_value1: 필요 응모권 수
--   extra_value2: 당첨 인원
--   extra_value3: 마감일 (YYYYMMDD)
--   extra_value4: 상태 (ACTIVE / UPCOMING / COMPLETED)
--   use_yn: 사용 여부
--   sta_ymd / end_ymd: 노출 기간

-- 1. 공통코드 마스터 추가
INSERT INTO common_code_master (code_group, code_group_name, description, use_yn, sta_ymd, end_ymd)
VALUES ('LUCKY_DRAW_PRIZE', '럭키드로우 경품', '럭키드로우 경품 콘텐츠 관리', 'Y', '20240101', '99991231')
ON CONFLICT (code_group) DO NOTHING;

-- 2. lucky_draw_entries FK 변경 (lucky_draw_events → common_code_detail.id)
ALTER TABLE lucky_draw_entries DROP CONSTRAINT IF EXISTS lucky_draw_entries_lucky_draw_id_fkey;
ALTER TABLE lucky_draw_winners DROP CONSTRAINT IF EXISTS lucky_draw_winners_lucky_draw_id_fkey;

-- 3. enter_lucky_draw 함수 업데이트 (common_code_detail 기반)
CREATE OR REPLACE FUNCTION enter_lucky_draw(
  p_user_id UUID,
  p_lucky_draw_id BIGINT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_event RECORD;
  v_current_tickets INT;
  v_existing_entry RECORD;
  v_ticket_tx_id BIGINT;
  v_entry_id BIGINT;
  v_tickets_required INT;
  v_today TEXT;
  v_new_count INT;
BEGIN
  v_today := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  SELECT * INTO v_event
  FROM common_code_detail
  WHERE id = p_lucky_draw_id
    AND code_group = 'LUCKY_DRAW_PRIZE'
    AND use_yn = 'Y';

  IF v_event IS NULL THEN
    RETURN json_build_object('success', false, 'error', '존재하지 않는 이벤트입니다.');
  END IF;

  IF COALESCE(v_event.extra_value4, 'ACTIVE') <> 'ACTIVE' THEN
    RETURN json_build_object('success', false, 'error', '현재 응모할 수 없는 이벤트입니다.');
  END IF;

  IF v_today > COALESCE(v_event.extra_value3, '99991231') THEN
    RETURN json_build_object('success', false, 'error', '응모 기간이 종료되었습니다.');
  END IF;

  v_tickets_required := COALESCE(CAST(v_event.extra_value1 AS INT), 1);

  SELECT COALESCE(total_tickets, 0) INTO v_current_tickets
  FROM user_tickets
  WHERE supabase_user_id = p_user_id;

  IF v_current_tickets < v_tickets_required THEN
    RETURN json_build_object(
      'success', false,
      'error', '응모권이 부족합니다. (필요: ' || v_tickets_required || '장, 보유: ' || v_current_tickets || '장)'
    );
  END IF;

  INSERT INTO ticket_transactions (supabase_user_id, transaction_type, tickets, lucky_draw_id, description)
  VALUES (p_user_id, 'USE', -v_tickets_required, p_lucky_draw_id,
          '럭키드로우 응모: ' || v_event.code_name)
  RETURNING id INTO v_ticket_tx_id;

  -- 기존 응모가 있으면 entries_count 증가, 없으면 신규 삽입
  SELECT * INTO v_existing_entry
  FROM lucky_draw_entries
  WHERE lucky_draw_id = p_lucky_draw_id AND supabase_user_id = p_user_id;

  IF v_existing_entry IS NOT NULL THEN
    UPDATE lucky_draw_entries
    SET entries_count = entries_count + v_tickets_required,
        ticket_transaction_id = v_ticket_tx_id
    WHERE id = v_existing_entry.id
    RETURNING id, entries_count INTO v_entry_id, v_new_count;
  ELSE
    INSERT INTO lucky_draw_entries (lucky_draw_id, supabase_user_id, ticket_transaction_id, entries_count)
    VALUES (p_lucky_draw_id, p_user_id, v_ticket_tx_id, v_tickets_required)
    RETURNING id, entries_count INTO v_entry_id, v_new_count;
  END IF;

  RETURN json_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'tickets_used', v_tickets_required,
    'total_entries', v_new_count,
    'event_title', v_event.code_name
  );
END;
$$;

-- 4. 샘플 경품 데이터
INSERT INTO common_code_detail (
  code_group, code_value, code_name, description,
  extra_value1, extra_value2, extra_value3, extra_value4,
  sort_order, use_yn, sta_ymd, end_ymd
)
SELECT 'LUCKY_DRAW_PRIZE', 'PRIZE_001', '스타벅스 아메리카노',
  '매월 추첨으로 스타벅스 아메리카노 기프티콘을 드립니다!',
  '1', '3', '20260331', 'ACTIVE',
  1, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_detail
  WHERE code_group = 'LUCKY_DRAW_PRIZE' AND code_value = 'PRIZE_001'
);
