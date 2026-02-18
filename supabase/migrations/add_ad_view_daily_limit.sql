-- ================================================
-- 광고 시청 일일 횟수 제한 공통 코드 추가
-- ================================================

DO $$
DECLARE
  max_id INT;
  seq_name TEXT;
BEGIN
  SELECT pg_get_serial_sequence('common_code_detail', 'id') INTO seq_name;
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM common_code_detail;
  IF seq_name IS NOT NULL AND max_id > 0 THEN
    EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id + 1);
  END IF;
END $$;

-- AD_VIEW_DAILY_LIMIT: 광고 시청 일일 최대 횟수
-- code_name에 숫자로 저장 (기본 3회)
INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
SELECT 'SYSTEM_CONFIG', 'AD_VIEW_DAILY_LIMIT', '3', '광고 시청 일일 최대 횟수 (기본: 3회)', 4, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_detail WHERE code_group = 'SYSTEM_CONFIG' AND code_value = 'AD_VIEW_DAILY_LIMIT'
);

DO $$
DECLARE
  max_id INT;
  seq_name TEXT;
BEGIN
  SELECT pg_get_serial_sequence('common_code_detail', 'id') INTO seq_name;
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM common_code_detail;
  IF seq_name IS NOT NULL AND max_id > 0 THEN
    EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id + 1);
  END IF;
END $$;
