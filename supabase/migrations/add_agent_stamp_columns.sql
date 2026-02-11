-- =====================================================
-- agent_reviews 테이블에 도장 검증 컬럼 추가
-- =====================================================

-- 중개사 도장 존재 여부
ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS agent_stamp BOOLEAN DEFAULT NULL;

-- 도장 검증 신뢰도 (0~100)
ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS agent_stamp_confidence INT DEFAULT NULL;
