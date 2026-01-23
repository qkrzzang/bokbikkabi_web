-- 리뷰 참여자 역할 컬럼 추가 (매수/매도/임차/임대)
ALTER TABLE public.agent_reviews
ADD COLUMN IF NOT EXISTS participant_role TEXT;

COMMENT ON COLUMN public.agent_reviews.participant_role IS '리뷰 작성자 역할 (매수/매도/임차/임대)';
