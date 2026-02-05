-- ================================================
-- 콘텐츠 노출 관리 설정 추가
-- ================================================
-- 작성일: 2026-02-05
-- 설명: 광고/서베이 등 콘텐츠 노출 여부를 관리하는 시스템 설정

-- 1. SYSTEM_CONFIG 마스터 코드 추가
INSERT INTO common_code_master (code_group, code_group_name, description, sort_order, use_yn, sta_ymd, end_ymd)
SELECT 'SYSTEM_CONFIG', '시스템 설정', '시스템 전반의 기능 노출 및 동작을 제어하는 설정', 999, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_master WHERE code_group = 'SYSTEM_CONFIG'
);

-- 2. 시퀀스 리셋 (중복 키 오류 방지)
DO $$
DECLARE
  max_id INT;
  seq_name TEXT;
BEGIN
  SELECT pg_get_serial_sequence('common_code_detail', 'id') INTO seq_name;
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM common_code_detail;
  IF seq_name IS NOT NULL AND max_id > 0 THEN
    -- max_id + 1을 다음 값으로 설정 (false는 다음 nextval()이 max_id+1을 반환하도록 함)
    EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id + 1);
  END IF;
END $$;

-- 3. 콘텐츠 노출 설정 추가
-- ADVERTISEMENT_VISIBLE: 광고 노출 여부
INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
SELECT 'SYSTEM_CONFIG', 'ADVERTISEMENT_VISIBLE', '광고 노출', 'Y:노출,N:숨김', 1, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_detail WHERE code_group = 'SYSTEM_CONFIG' AND code_value = 'ADVERTISEMENT_VISIBLE'
);

-- SURVEY_VISIBLE: 서베이 메뉴 노출 여부
INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
SELECT 'SYSTEM_CONFIG', 'SURVEY_VISIBLE', '서베이 메뉴 노출', 'Y:노출,N:숨김', 2, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_detail WHERE code_group = 'SYSTEM_CONFIG' AND code_value = 'SURVEY_VISIBLE'
);

-- 4. 시퀀스 다시 리셋
DO $$
DECLARE
  max_id INT;
  seq_name TEXT;
BEGIN
  SELECT pg_get_serial_sequence('common_code_detail', 'id') INTO seq_name;
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM common_code_detail;
  IF seq_name IS NOT NULL AND max_id > 0 THEN
    -- max_id + 1을 다음 값으로 설정
    EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id + 1);
  END IF;
END $$;

-- 5. 확인 쿼리
SELECT 
  code_group,
  code_value,
  code_name,
  description,
  use_yn
FROM common_code_detail
WHERE code_group = 'SYSTEM_CONFIG'
ORDER BY sort_order;

