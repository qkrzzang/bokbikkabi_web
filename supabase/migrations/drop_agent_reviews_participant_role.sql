-- 리뷰 참여자 역할 컬럼 삭제
ALTER TABLE public.agent_reviews
DROP COLUMN IF EXISTS participant_role;
