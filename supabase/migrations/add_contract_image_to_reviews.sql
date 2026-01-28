-- agent_reviews 테이블에 계약서 이미지 저장 컬럼 추가
ALTER TABLE public.agent_reviews 
ADD COLUMN IF NOT EXISTS contract_image_url TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.agent_reviews.contract_image_url IS '계약서 이미지 URL (Supabase Storage)';


