-- =====================================================
-- review_helpful 테이블 review_id 타입 수정
-- 오류: foreign key constraint "review_helpful_review_id_fkey" cannot be implemented
-- DETAIL: Key columns "review_id" and "id" are of incompatible types: bigint and uuid
-- 
-- 원인: review_helpful.review_id가 BIGINT로 생성되었으나
--       agent_reviews.id는 UUID 타입임
-- =====================================================

-- 기존 테이블이 있으면 삭제 후 재생성 (데이터가 없는 경우 안전)
DROP TABLE IF EXISTS public.review_helpful CASCADE;

-- 테이블 재생성 (review_id를 UUID로 올바르게 설정)
CREATE TABLE public.review_helpful (
  id BIGSERIAL PRIMARY KEY,
  review_id UUID NOT NULL,
  supabase_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- 외래 키 제약 조건
  CONSTRAINT review_helpful_review_id_fkey 
    FOREIGN KEY (review_id) 
    REFERENCES public.agent_reviews(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT review_helpful_user_id_fkey 
    FOREIGN KEY (supabase_user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  
  -- 같은 사용자가 같은 리뷰에 중복으로 "도움돼요"를 누를 수 없도록
  CONSTRAINT unique_user_review 
    UNIQUE (review_id, supabase_user_id)
);

-- 인덱스 생성
CREATE INDEX idx_review_helpful_review_id 
  ON public.review_helpful(review_id);

CREATE INDEX idx_review_helpful_user_id 
  ON public.review_helpful(supabase_user_id);

CREATE INDEX idx_review_helpful_created_at 
  ON public.review_helpful(created_at DESC);

-- RLS 활성화
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Anyone can view helpful counts"
  ON public.review_helpful
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add helpful"
  ON public.review_helpful
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

CREATE POLICY "Users can remove their own helpful"
  ON public.review_helpful
  FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- helpful_count 컬럼 (이미 있으면 무시)
ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS helpful_count INT DEFAULT 0;

-- 트리거 함수 재생성
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE agent_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE agent_reviews
    SET helpful_count = GREATEST(helpful_count - 1, 0)
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_helpful_count_insert ON public.review_helpful;
CREATE TRIGGER trigger_update_helpful_count_insert
  AFTER INSERT ON public.review_helpful
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

DROP TRIGGER IF EXISTS trigger_update_helpful_count_delete ON public.review_helpful;
CREATE TRIGGER trigger_update_helpful_count_delete
  AFTER DELETE ON public.review_helpful
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- 기존 리뷰들의 helpful_count 초기화
UPDATE agent_reviews ar
SET helpful_count = (
  SELECT COUNT(*)
  FROM review_helpful rh
  WHERE rh.review_id = ar.id
);
