-- ================================================
-- 가입자 럭키드로우 1장 무료 이벤트 배너 (공통코드)
-- ================================================
-- 메인 화면에 표시되는 이벤트 배너를 공통코드로 제어
-- 관리자 > 공통코드 관리에서 수정 가능

-- SYSTEM_CONFIG 마스터가 없으면 추가
INSERT INTO common_code_master (code_group, code_group_name, description, sort_order, use_yn, sta_ymd, end_ymd)
SELECT 'SYSTEM_CONFIG', '시스템 설정', '시스템 전반의 기능 노출 및 동작을 제어하는 설정', 999, 'Y', '20240101', '99991231'
WHERE NOT EXISTS (
  SELECT 1 FROM common_code_master WHERE code_group = 'SYSTEM_CONFIG'
);

-- LUCKY_DRAW_SIGNUP_EVENT: 메인 이벤트 배너 (콘텐츠 노출 관리에서 제어)
-- description: 'Y'=노출, 'N'=숨김
-- extra_value1: 배너에 표시할 내용 (콘텐츠)
INSERT INTO common_code_detail (code_group, code_value, code_name, description, extra_value1, sort_order, use_yn, sta_ymd, end_ymd)
VALUES (
  'SYSTEM_CONFIG', 
  'LUCKY_DRAW_SIGNUP_EVENT', 
  '메인 이벤트 배너', 
  'Y', 
  '3월 31일까지 가입자에게 럭키드로우 1장 무료 지급',
  10, 
  'Y', 
  '2025-01-01'::date, 
  '9999-12-31'::date
)
ON CONFLICT (code_group, code_value) DO UPDATE SET
  code_name = EXCLUDED.code_name,
  description = COALESCE(NULLIF(TRIM(common_code_detail.description), ''), EXCLUDED.description),
  extra_value1 = COALESCE(NULLIF(TRIM(common_code_detail.extra_value1), ''), EXCLUDED.extra_value1),
  updated_at = NOW();
