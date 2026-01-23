-- 리뷰 계약일자 컬럼 추가
ALTER TABLE public.agent_reviews
ADD COLUMN IF NOT EXISTS contract_date TEXT;

COMMENT ON COLUMN public.agent_reviews.contract_date IS '계약일자';
