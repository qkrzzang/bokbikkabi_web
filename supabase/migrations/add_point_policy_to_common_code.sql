-- ================================================
-- 포인트 정책을 공통 코드에 추가
-- ================================================
-- 작성일: 2026-02-06
-- 설명: POINT_POLICY 코드 그룹에 포인트 정책 추가
--       extra_value1: 포인트 값
--       extra_value2: 포인트 내역 표시 텍스트

-- POINT_POLICY 코드 그룹 추가 (common_code_master가 있다면)
INSERT INTO public.common_code_master (code_group, code_group_name, description)
VALUES ('POINT_POLICY', '포인트 정책', '사용자 행동에 따른 포인트 지급 정책')
ON CONFLICT (code_group) DO NOTHING;

-- 포인트 정책 데이터 추가 (extra_value1: 포인트 값, extra_value2: 포인트 내역 표시 텍스트)
INSERT INTO public.common_code_detail (
  code_group, 
  code_value, 
  code_name, 
  description, 
  extra_value1,
  extra_value2,
  sta_ymd, 
  end_ymd, 
  sort_order,
  use_yn
) VALUES
('POINT_POLICY', 'DAILY_LOGIN', '일일 로그인', '매일 로그인 시 포인트 지급', '5', '일일 로그인 보상', '2026-01-01', '9999-12-31', 1, 'Y'),
('POINT_POLICY', 'ATTENDANCE', '출석 체크', '출석 체크 시 포인트 지급', '10', '출석 체크 보상', '2026-01-01', '9999-12-31', 2, 'Y'),
('POINT_POLICY', 'FAVORITE', '관심 등록', '중개사 관심 등록 시 포인트 지급', '5', '관심 등록 보상', '2026-01-01', '9999-12-31', 3, 'Y'),
('POINT_POLICY', 'SURVEY', '설문 완료', '설문 조사 완료 시 포인트 지급', '50', '설문 완료 보상', '2026-01-01', '9999-12-31', 4, 'Y'),
('POINT_POLICY', 'REVIEW', '리뷰 작성', '리뷰 작성 시 포인트 지급', '200', '리뷰 작성 보상', '2026-01-01', '9999-12-31', 5, 'Y'),
('POINT_POLICY', 'CONTRACT', '계약 완료', '계약 완료 시 포인트 지급', '100', '계약 완료 보상', '2026-01-01', '9999-12-31', 6, 'Y'),
('POINT_POLICY', 'AD_VIEW', '광고 시청', '광고 시청 시 포인트 지급', '10', '광고 시청 보상', '2026-01-01', '9999-12-31', 7, 'Y')
ON CONFLICT (code_group, code_value) DO UPDATE SET
  code_name = EXCLUDED.code_name,
  description = EXCLUDED.description,
  extra_value1 = EXCLUDED.extra_value1,
  extra_value2 = EXCLUDED.extra_value2,
  sta_ymd = EXCLUDED.sta_ymd,
  end_ymd = EXCLUDED.end_ymd,
  sort_order = EXCLUDED.sort_order,
  use_yn = EXCLUDED.use_yn,
  updated_at = NOW();

-- 확인 쿼리
SELECT 
  code_group,
  code_value,
  code_name,
  description,
  extra_value1 AS points,
  extra_value2 AS display_text,
  sta_ymd,
  end_ymd,
  use_yn
FROM public.common_code_detail
WHERE code_group = 'POINT_POLICY'
ORDER BY sort_order;
