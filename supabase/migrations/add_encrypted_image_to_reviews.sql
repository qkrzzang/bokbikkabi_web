-- agent_reviews 테이블에 암호화된 크롭 이미지 컬럼 추가
-- encrypted: AES-256-CBC 암호화된 이미지 (base64)
-- iv: 암호화에 사용된 초기화 벡터 (hex)

ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS contract_image_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS contract_image_iv TEXT;

-- 컬럼 설명
COMMENT ON COLUMN public.agent_reviews.contract_image_encrypted IS '크롭된 계약서 이미지 (AES-256-CBC 암호화, base64)';
COMMENT ON COLUMN public.agent_reviews.contract_image_iv IS '이미지 암호화 IV (hex)';

-- 이미지가 있는 리뷰를 빠르게 조회하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_reviews_has_image 
  ON public.agent_reviews ((contract_image_encrypted IS NOT NULL));
