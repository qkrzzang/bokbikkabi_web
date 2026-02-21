-- ================================================
-- 사용자별 럭키드로우 데이터 통합 조회 함수
-- 3개의 개별 쿼리(tickets, entries, transactions)를 1회 DB 호출로 통합
-- ================================================

DROP FUNCTION IF EXISTS get_user_lucky_draw_data(UUID);

CREATE OR REPLACE FUNCTION get_user_lucky_draw_data(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_tickets INT;
  v_entries JSON;
  v_transactions JSON;
BEGIN
  -- 1) 보유 응모권
  SELECT COALESCE(ut.total_tickets, 0)
    INTO v_tickets
    FROM user_tickets ut
   WHERE ut.supabase_user_id = p_user_id;

  IF NOT FOUND THEN
    v_tickets := 0;
  END IF;

  -- 2) 응모 내역
  SELECT COALESCE(json_agg(row_to_json(e)), '[]'::JSON)
    INTO v_entries
    FROM (
      SELECT le.id, le.lucky_draw_id, le.supabase_user_id,
             le.ticket_transaction_id, le.entries_count,
             le.is_winner, le.created_at
        FROM lucky_draw_entries le
       WHERE le.supabase_user_id = p_user_id
       ORDER BY le.created_at DESC
    ) e;

  -- 3) 응모권 거래 이력 (최근 50건)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    INTO v_transactions
    FROM (
      SELECT tt.id, tt.supabase_user_id, tt.transaction_type,
             tt.tickets, tt.points_spent, tt.lucky_draw_id,
             tt.description, tt.created_at
        FROM ticket_transactions tt
       WHERE tt.supabase_user_id = p_user_id
       ORDER BY tt.created_at DESC
       LIMIT 50
    ) t;

  RETURN json_build_object(
    'tickets', v_tickets,
    'entries', v_entries,
    'transactions', v_transactions
  );
END;
$$;
