-- 리뷰 OCR 참고 정보 컬럼 추가
ALTER TABLE public.agent_reviews
ADD COLUMN IF NOT EXISTS agent_address TEXT,
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS confience_score TEXT,
ADD COLUMN IF NOT EXISTS contract_type TEXT,
ADD COLUMN IF NOT EXISTS doc_title TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT;

COMMENT ON COLUMN public.agent_reviews.agent_address IS 'OCR 추출 주소';
COMMENT ON COLUMN public.agent_reviews.agent_name IS 'OCR 추출 중개사무소명';
COMMENT ON COLUMN public.agent_reviews.confience_score IS 'OCR 신뢰도';
COMMENT ON COLUMN public.agent_reviews.contract_type IS 'OCR 계약 유형';
COMMENT ON COLUMN public.agent_reviews.doc_title IS 'OCR 문서명';
COMMENT ON COLUMN public.agent_reviews.reason IS 'OCR 사유';
