-- 광고/제휴/오류 문의에 이미지 첨부 기능 추가 (AES-256-CBC 암호화 저장)
ALTER TABLE public.partnership_inquiries
  ADD COLUMN IF NOT EXISTS image_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS image_iv TEXT;

COMMENT ON COLUMN public.partnership_inquiries.image_encrypted IS '첨부 이미지 AES-256-CBC 암호화 데이터 (base64)';
COMMENT ON COLUMN public.partnership_inquiries.image_iv IS '첨부 이미지 암호화 IV (hex)';
