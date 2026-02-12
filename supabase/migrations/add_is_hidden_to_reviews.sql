-- agent_reviews 테이블에 숨김 처리 컬럼 추가
ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 숨김 처리 관련 컬럼 (숨긴 관리자, 숨긴 시간)
ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS hidden_by UUID;

-- is_hidden 인덱스 (숨기지 않은 리뷰 빠르게 조회)
CREATE INDEX IF NOT EXISTS idx_agent_reviews_is_hidden
  ON public.agent_reviews (is_hidden);

-- 복합 인덱스 (agent_id + is_hidden) - 중개사별 공개 리뷰 조회 최적화
CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent_hidden
  ON public.agent_reviews (agent_id, is_hidden);
