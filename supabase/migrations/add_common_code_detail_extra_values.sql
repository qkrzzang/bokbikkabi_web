-- 공통코드 상세 테이블 추가 값 컬럼 확장
ALTER TABLE public.common_code_detail
ADD COLUMN IF NOT EXISTS extra_value3 VARCHAR(500),
ADD COLUMN IF NOT EXISTS extra_value4 VARCHAR(500),
ADD COLUMN IF NOT EXISTS extra_value5 VARCHAR(500);

COMMENT ON COLUMN public.common_code_detail.extra_value3 IS '추가 값3';
COMMENT ON COLUMN public.common_code_detail.extra_value4 IS '추가 값4';
COMMENT ON COLUMN public.common_code_detail.extra_value5 IS '추가 값5';
