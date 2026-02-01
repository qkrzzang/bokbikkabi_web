-- =====================================================
-- agent_reviews 테이블에서 contract_image_url 컬럼 제거
-- =====================================================
-- 계약서 파일 저장 기능을 제거하므로 해당 컬럼도 삭제

ALTER TABLE public.agent_reviews DROP COLUMN IF EXISTS contract_image_url;

COMMENT ON TABLE public.agent_reviews IS '리뷰 테이블 - 계약서 이미지 저장 기능 제거됨';
