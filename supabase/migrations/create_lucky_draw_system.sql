-- ================================================
-- 럭키드로우 이벤트 시스템
-- ================================================

-- ================================================
-- 1. 응모권 테이블 (사용자 보유 응모권 수)
-- ================================================
CREATE TABLE IF NOT EXISTS user_tickets (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_tickets INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supabase_user_id)
);

-- ================================================
-- 2. 응모권 거래 내역
-- ================================================
CREATE TABLE IF NOT EXISTS ticket_transactions (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL, -- 'PURCHASE' (포인트→응모권), 'USE' (이벤트 응모), 'REFUND' (환불)
  tickets INT NOT NULL,                  -- 양수: 획득, 음수: 사용
  points_spent INT DEFAULT 0,            -- 사용된 포인트 (PURCHASE 시)
  lucky_draw_id BIGINT,                  -- USE 시 참조하는 이벤트 ID
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 3. 럭키드로우 이벤트 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS lucky_draw_events (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  prize_name VARCHAR(200) NOT NULL,       -- 경품명
  prize_image_url TEXT,                   -- 경품 이미지 URL
  tickets_required INT NOT NULL DEFAULT 1,-- 응모에 필요한 응모권 수
  max_entries_per_user INT DEFAULT 1,     -- 사용자당 최대 응모 횟수 (NULL이면 무제한)
  max_winners INT DEFAULT 1,              -- 최대 당첨자 수
  total_entries INT NOT NULL DEFAULT 0,   -- 현재 총 응모 수
  status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING', -- 'UPCOMING', 'ACTIVE', 'DRAWING', 'COMPLETED', 'CANCELLED'
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  draw_date TIMESTAMP WITH TIME ZONE,    -- 추첨일
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 4. 이벤트 응모 내역
-- ================================================
CREATE TABLE IF NOT EXISTS lucky_draw_entries (
  id BIGSERIAL PRIMARY KEY,
  lucky_draw_id BIGINT NOT NULL REFERENCES lucky_draw_events(id) ON DELETE CASCADE,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_transaction_id BIGINT REFERENCES ticket_transactions(id),
  entries_count INT NOT NULL DEFAULT 1,   -- 이번 응모에 사용한 응모권 수
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 동일 이벤트 중복 응모 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_lucky_draw_entries_unique
  ON lucky_draw_entries(lucky_draw_id, supabase_user_id);

-- ================================================
-- 5. 당첨 결과 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS lucky_draw_winners (
  id BIGSERIAL PRIMARY KEY,
  lucky_draw_id BIGINT NOT NULL REFERENCES lucky_draw_events(id) ON DELETE CASCADE,
  entry_id BIGINT NOT NULL REFERENCES lucky_draw_entries(id),
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_name VARCHAR(200),
  is_claimed BOOLEAN DEFAULT FALSE,       -- 수령 여부
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 6. 인덱스
-- ================================================
CREATE INDEX IF NOT EXISTS idx_ticket_transactions_user
  ON ticket_transactions(supabase_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lucky_draw_events_status
  ON lucky_draw_events(status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_lucky_draw_entries_event
  ON lucky_draw_entries(lucky_draw_id);

CREATE INDEX IF NOT EXISTS idx_lucky_draw_entries_user
  ON lucky_draw_entries(supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_lucky_draw_winners_user
  ON lucky_draw_winners(supabase_user_id);

-- ================================================
-- 7. 트리거: ticket_transactions 삽입 시 user_tickets 자동 업데이트
-- ================================================
CREATE OR REPLACE FUNCTION update_user_tickets_on_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_tickets (supabase_user_id, total_tickets)
  VALUES (NEW.supabase_user_id, NEW.tickets)
  ON CONFLICT (supabase_user_id)
  DO UPDATE SET
    total_tickets = user_tickets.total_tickets + NEW.tickets,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_user_tickets ON ticket_transactions;
CREATE TRIGGER trigger_update_user_tickets
  AFTER INSERT ON ticket_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tickets_on_transaction();

-- ================================================
-- 8. 트리거: lucky_draw_entries 삽입 시 total_entries 자동 증가
-- ================================================
CREATE OR REPLACE FUNCTION update_lucky_draw_total_entries()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE lucky_draw_events
  SET total_entries = total_entries + NEW.entries_count,
      updated_at = NOW()
  WHERE id = NEW.lucky_draw_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_lucky_draw_entries ON lucky_draw_entries;
CREATE TRIGGER trigger_update_lucky_draw_entries
  AFTER INSERT ON lucky_draw_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_lucky_draw_total_entries();

-- ================================================
-- 9. 포인트 → 응모권 변환 함수 (비용은 공통코드에서 조회)
-- ================================================
CREATE OR REPLACE FUNCTION purchase_ticket(
  p_user_id UUID,
  p_quantity INT DEFAULT 1
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_cost_per_ticket INT;
  v_total_cost INT;
  v_current_points INT;
  v_ticket_tx_id BIGINT;
  v_point_tx_id BIGINT;
BEGIN
  -- 공통코드에서 응모권 1장당 필요 포인트 조회
  SELECT CAST(extra_value1 AS INT) INTO v_cost_per_ticket
  FROM common_code_detail
  WHERE code_group = 'LUCKY_DRAW_CONFIG'
    AND code_value = 'TICKET_COST'
    AND use_yn = 'Y'
    AND CURRENT_DATE BETWEEN sta_ymd AND end_ymd;

  IF v_cost_per_ticket IS NULL THEN
    v_cost_per_ticket := 500; -- 기본값
  END IF;

  v_total_cost := v_cost_per_ticket * p_quantity;

  -- 현재 포인트 조회
  SELECT total_points INTO v_current_points
  FROM user_points
  WHERE supabase_user_id = p_user_id;

  IF v_current_points IS NULL OR v_current_points < v_total_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', '포인트가 부족합니다. (필요: ' || v_total_cost || 'P, 보유: ' || COALESCE(v_current_points, 0) || 'P)',
      'cost_per_ticket', v_cost_per_ticket
    );
  END IF;

  -- 포인트 차감 (point_transactions 삽입 → 트리거로 user_points 자동 차감)
  INSERT INTO point_transactions (supabase_user_id, transaction_type, points, description)
  VALUES (p_user_id, 'TICKET_PURCHASE', -v_total_cost, '응모권 ' || p_quantity || '장 구매')
  RETURNING id INTO v_point_tx_id;

  -- 응모권 지급 (ticket_transactions 삽입 → 트리거로 user_tickets 자동 증가)
  INSERT INTO ticket_transactions (supabase_user_id, transaction_type, tickets, points_spent, description)
  VALUES (p_user_id, 'PURCHASE', p_quantity, v_total_cost, '응모권 ' || p_quantity || '장 구매 (' || TO_CHAR(v_total_cost, 'FM999,999') || 'P)')
  RETURNING id INTO v_ticket_tx_id;

  RETURN json_build_object(
    'success', true,
    'tickets_purchased', p_quantity,
    'points_spent', v_total_cost,
    'cost_per_ticket', v_cost_per_ticket,
    'ticket_transaction_id', v_ticket_tx_id,
    'point_transaction_id', v_point_tx_id
  );
END;
$$;

-- ================================================
-- 10. 럭키드로우 응모 함수
-- ================================================
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
BEGIN
  -- 이벤트 조회
  SELECT * INTO v_event
  FROM lucky_draw_events
  WHERE id = p_lucky_draw_id;

  IF v_event IS NULL THEN
    RETURN json_build_object('success', false, 'error', '존재하지 않는 이벤트입니다.');
  END IF;

  IF v_event.status <> 'ACTIVE' THEN
    RETURN json_build_object('success', false, 'error', '현재 응모할 수 없는 이벤트입니다.');
  END IF;

  IF NOW() < v_event.start_date OR NOW() > v_event.end_date THEN
    RETURN json_build_object('success', false, 'error', '응모 기간이 아닙니다.');
  END IF;

  -- 중복 응모 체크
  SELECT * INTO v_existing_entry
  FROM lucky_draw_entries
  WHERE lucky_draw_id = p_lucky_draw_id AND supabase_user_id = p_user_id;

  IF v_existing_entry IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', '이미 응모한 이벤트입니다.');
  END IF;

  -- 응모권 잔액 확인
  SELECT COALESCE(total_tickets, 0) INTO v_current_tickets
  FROM user_tickets
  WHERE supabase_user_id = p_user_id;

  IF v_current_tickets < v_event.tickets_required THEN
    RETURN json_build_object(
      'success', false,
      'error', '응모권이 부족합니다. (필요: ' || v_event.tickets_required || '장, 보유: ' || v_current_tickets || '장)'
    );
  END IF;

  -- 응모권 차감
  INSERT INTO ticket_transactions (supabase_user_id, transaction_type, tickets, lucky_draw_id, description)
  VALUES (p_user_id, 'USE', -v_event.tickets_required, p_lucky_draw_id,
          '럭키드로우 응모: ' || v_event.title)
  RETURNING id INTO v_ticket_tx_id;

  -- 응모 기록
  INSERT INTO lucky_draw_entries (lucky_draw_id, supabase_user_id, ticket_transaction_id, entries_count)
  VALUES (p_lucky_draw_id, p_user_id, v_ticket_tx_id, v_event.tickets_required)
  RETURNING id INTO v_entry_id;

  RETURN json_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'tickets_used', v_event.tickets_required,
    'event_title', v_event.title
  );
END;
$$;

-- ================================================
-- 11. RLS 정책 (쓰기는 service_role 전용)
-- ================================================

-- user_tickets
ALTER TABLE user_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tickets" ON user_tickets;
CREATE POLICY "Users can view own tickets" ON user_tickets
  FOR SELECT USING (supabase_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "System can manage tickets" ON user_tickets;
CREATE POLICY "System can manage tickets" ON user_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ticket_transactions
ALTER TABLE ticket_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own ticket_tx" ON ticket_transactions;
CREATE POLICY "Users can view own ticket_tx" ON ticket_transactions
  FOR SELECT USING (supabase_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "System can manage ticket_tx" ON ticket_transactions;
CREATE POLICY "System can manage ticket_tx" ON ticket_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- lucky_draw_events (모두 조회 가능)
ALTER TABLE lucky_draw_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view events" ON lucky_draw_events;
CREATE POLICY "Everyone can view events" ON lucky_draw_events
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "System can manage events" ON lucky_draw_events;
CREATE POLICY "System can manage events" ON lucky_draw_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- lucky_draw_entries
ALTER TABLE lucky_draw_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own entries" ON lucky_draw_entries;
CREATE POLICY "Users can view own entries" ON lucky_draw_entries
  FOR SELECT USING (supabase_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "System can manage entries" ON lucky_draw_entries;
CREATE POLICY "System can manage entries" ON lucky_draw_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- lucky_draw_winners
ALTER TABLE lucky_draw_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wins" ON lucky_draw_winners;
CREATE POLICY "Users can view own wins" ON lucky_draw_winners
  FOR SELECT USING (supabase_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Everyone can view winners" ON lucky_draw_winners;
CREATE POLICY "Everyone can view winners" ON lucky_draw_winners
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "System can manage winners" ON lucky_draw_winners;
CREATE POLICY "System can manage winners" ON lucky_draw_winners
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- 12. 공통코드 등록
-- ================================================

-- 12-0. common_code_master에 LUCKY_DRAW_CONFIG 그룹 등록
INSERT INTO public.common_code_master (code_group, code_group_name, description, sta_ymd, end_ymd, sort_order)
VALUES ('LUCKY_DRAW_CONFIG', '럭키드로우 설정', '럭키드로우 이벤트 관련 설정 코드', '2026-01-01', '9999-12-31', 20)
ON CONFLICT (code_group) DO NOTHING;

-- 12-1. 포인트 정책: 응모권 구매 차감
INSERT INTO common_code_detail
  (code_group, code_value, code_name, description, extra_value1, extra_value2, sta_ymd, end_ymd, sort_order, use_yn)
VALUES
  ('POINT_POLICY', 'TICKET_PURCHASE', '응모권 구매', '포인트로 럭키드로우 응모권 구매', '-1000', '응모권 구매', '2026-01-01', '9999-12-31', 10, 'Y')
ON CONFLICT (code_group, code_value) DO UPDATE SET
  code_name = EXCLUDED.code_name,
  description = EXCLUDED.description,
  extra_value1 = EXCLUDED.extra_value1,
  extra_value2 = EXCLUDED.extra_value2,
  use_yn = EXCLUDED.use_yn;

-- 12-2. 럭키드로우 설정: 응모권 1장당 필요 포인트 (extra_value1 = 포인트)
INSERT INTO common_code_detail
  (code_group, code_value, code_name, description, extra_value1, extra_value2, sta_ymd, end_ymd, sort_order, use_yn)
VALUES
  ('LUCKY_DRAW_CONFIG', 'TICKET_COST', '응모권 단가', '응모권 1장당 필요한 포인트', '500', 'P', '2026-01-01', '9999-12-31', 1, 'Y')
ON CONFLICT (code_group, code_value) DO UPDATE SET
  code_name = EXCLUDED.code_name,
  description = EXCLUDED.description,
  extra_value1 = EXCLUDED.extra_value1,
  use_yn = EXCLUDED.use_yn;

-- 12-3. 럭키드로우 메뉴 노출 여부 (description: 'Y'=노출, 'N'=숨김)
INSERT INTO common_code_detail
  (code_group, code_value, code_name, description, extra_value1, extra_value2, sta_ymd, end_ymd, sort_order, use_yn)
VALUES
  ('SYSTEM_CONFIG', 'LUCKY_DRAW_VISIBLE', '럭키드로우 노출', 'Y', NULL, NULL, '2026-01-01', '9999-12-31', 3, 'Y')
ON CONFLICT (code_group, code_value) DO UPDATE SET
  code_name = EXCLUDED.code_name,
  description = EXCLUDED.description,
  use_yn = EXCLUDED.use_yn;

-- ================================================
-- 13. 샘플 럭키드로우 이벤트 (테스트용)
-- ================================================
INSERT INTO lucky_draw_events (title, description, prize_name, tickets_required, max_entries_per_user, max_winners, status, start_date, end_date, draw_date)
VALUES (
  '2월 럭키드로우',
  '복비까비 첫 번째 럭키드로우 이벤트! 응모권 1장으로 참여하세요.',
  '스타벅스 아메리카노 Tall',
  1,
  1,
  3,
  'ACTIVE',
  '2026-02-01 00:00:00+09',
  '2026-02-28 23:59:59+09',
  '2026-03-01 12:00:00+09'
);

COMMENT ON TABLE user_tickets IS '사용자 응모권 보유 현황';
COMMENT ON TABLE ticket_transactions IS '응모권 거래 내역 (구매/사용/환불)';
COMMENT ON TABLE lucky_draw_events IS '럭키드로우 이벤트 목록';
COMMENT ON TABLE lucky_draw_entries IS '럭키드로우 응모 내역';
COMMENT ON TABLE lucky_draw_winners IS '럭키드로우 당첨 결과';
