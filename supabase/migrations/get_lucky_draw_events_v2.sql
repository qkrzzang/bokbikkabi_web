-- ================================================
-- Lucky Draw 이벤트 목록 및 응모 수 조회 최적화 함수 (v3 Final Fix)
-- ================================================
-- 3차 수정: 반환 타입을 엄격하게 맞추기 위해 TEXT로 통일하고 캐스팅 명시

DROP FUNCTION IF EXISTS get_lucky_draw_events_v2();

CREATE OR REPLACE FUNCTION get_lucky_draw_events_v2()
RETURNS TABLE (
  id INT,
  code_value TEXT,
  title TEXT,
  description TEXT,
  prize_name TEXT,
  tickets_required INT,
  max_winners INT,
  end_date TEXT,
  draw_date TEXT,
  status TEXT,
  total_entries BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.code_value::TEXT,
    c.code_name::TEXT AS title,
    c.description::TEXT,
    c.code_name::TEXT AS prize_name,
    COALESCE(NULLIF(regexp_replace(c.extra_value1, '[^0-9]', '', 'g'), ''), '1')::INT AS tickets_required,
    COALESCE(NULLIF(regexp_replace(c.extra_value2, '[^0-9]', '', 'g'), ''), '1')::INT AS max_winners,
    -- 날짜 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
    CASE 
      WHEN c.extra_value3 IS NOT NULL AND LENGTH(c.extra_value3) = 8 THEN
        (SUBSTRING(c.extra_value3, 1, 4) || '-' || SUBSTRING(c.extra_value3, 5, 2) || '-' || SUBSTRING(c.extra_value3, 7, 2))::TEXT
      ELSE '9999-12-31'::TEXT
    END AS end_date,
    CASE 
      WHEN c.extra_value4 IS NOT NULL AND LENGTH(c.extra_value4) = 8 THEN
        (SUBSTRING(c.extra_value4, 1, 4) || '-' || SUBSTRING(c.extra_value4, 5, 2) || '-' || SUBSTRING(c.extra_value4, 7, 2))::TEXT
      ELSE NULL::TEXT
    END AS draw_date,
    COALESCE(c.extra_value5, 'ACTIVE')::TEXT AS status,
    COALESCE((
      SELECT SUM(e.entries_count)
      FROM lucky_draw_entries e
      WHERE e.lucky_draw_id = c.id
    ), 0)::BIGINT AS total_entries
  FROM common_code_detail c
  WHERE c.code_group = 'LUCKY_DRAW_PRIZE'
    AND c.use_yn = 'Y'
    AND CURRENT_DATE BETWEEN c.sta_ymd AND c.end_ymd
  ORDER BY c.sort_order ASC;
END;
$$;
