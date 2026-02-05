-- =====================================================
-- review_helpful 테이블 생성
-- 리뷰 "도움돼요" 기능을 위한 테이블
-- =====================================================

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS public.review_helpful (
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

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id 
  ON public.review_helpful(review_id);

CREATE INDEX IF NOT EXISTS idx_review_helpful_user_id 
  ON public.review_helpful(supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_review_helpful_created_at 
  ON public.review_helpful(created_at DESC);

-- 3. RLS 활성화
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성

-- SELECT: 모든 사용자가 조회 가능 (도움돼요 개수를 보여주기 위해)
CREATE POLICY "Anyone can view helpful counts"
  ON public.review_helpful
  FOR SELECT
  USING (true);

-- INSERT: 인증된 사용자만 "도움돼요" 추가 가능
CREATE POLICY "Authenticated users can add helpful"
  ON public.review_helpful
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- DELETE: 사용자가 자신의 "도움돼요"만 취소 가능
CREATE POLICY "Users can remove their own helpful"
  ON public.review_helpful
  FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- 5. agent_reviews 테이블에 helpful_count 컬럼 추가 (캐싱용)
ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS helpful_count INT DEFAULT 0;

-- 6. helpful_count 업데이트 함수 생성
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

-- 7. 트리거 생성
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

-- 8. 기존 리뷰들의 helpful_count 초기화 (있다면)
UPDATE agent_reviews ar
SET helpful_count = (
  SELECT COUNT(*)
  FROM review_helpful rh
  WHERE rh.review_id = ar.id
);

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'review_helpful'
ORDER BY ordinal_position;

-- 제약 조건 확인
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.review_helpful'::regclass
ORDER BY conname;

-- RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'review_helpful'
ORDER BY cmd, policyname;

-- 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'review_helpful'
ORDER BY trigger_name;

-- =====================================================
-- 테스트 쿼리
-- =====================================================

-- 특정 리뷰의 도움돼요 개수 조회
SELECT 
  ar.id,
  ar.review_text,
  ar.helpful_count,
  COUNT(rh.id) as actual_count
FROM agent_reviews ar
LEFT JOIN review_helpful rh ON rh.review_id = ar.id
GROUP BY ar.id, ar.review_text, ar.helpful_count
LIMIT 10;

-- 현재 사용자가 특정 리뷰에 "도움돼요"를 눌렀는지 확인
SELECT EXISTS (
  SELECT 1 
  FROM review_helpful 
  WHERE review_id = 1  -- 테스트용 리뷰 ID
    AND supabase_user_id = auth.uid()
) as is_helpful;

