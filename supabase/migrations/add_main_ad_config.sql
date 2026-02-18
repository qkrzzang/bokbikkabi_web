-- ================================================
-- 메인 광고(쿠팡 파트너스) 노출 설정 추가
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

-- MAIN_AD_VISIBLE: 메인 광고 노출 여부 + 위치
-- description 형식: "Y:노출,BOTTOM,ALL" / "Y:노출,TOP,MOBILE" / "N:숨김"
-- 위치: TOP(검색바 위) / BOTTOM(풋터 위)
-- 디바이스: MOBILE(웹 모바일) / PC / ALL(웹+PC)
INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
SELECT 'SYSTEM_CONFIG', 'MAIN_AD_VISIBLE', '메인 광고 노출', 'Y:노출,BOTTOM,ALL', 3, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_detail WHERE code_group = 'SYSTEM_CONFIG' AND code_value = 'MAIN_AD_VISIBLE'
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
