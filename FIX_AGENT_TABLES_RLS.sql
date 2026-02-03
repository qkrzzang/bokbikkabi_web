-- =====================================================
-- agent_master 및 agent_reviews 테이블 RLS 설정
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- =====================================================
-- 1. agent_master 테이블 (부동산 중개사무소 정보)
-- =====================================================

ALTER TABLE public.agent_master ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agent_master;
DROP POLICY IF EXISTS "Agent master viewable by everyone" ON public.agent_master;

-- SELECT: 모든 사용자가 조회 가능
CREATE POLICY "Agent master viewable by everyone"
  ON public.agent_master 
  FOR SELECT
  USING (true);

-- =====================================================
-- 2. agent_reviews 테이블 (리뷰/계약서 정보)
-- =====================================================

ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Agent reviews are viewable by everyone" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.agent_reviews;

-- SELECT: 모든 사용자가 조회 가능 (리뷰 공개)
CREATE POLICY "Agent reviews are viewable by everyone"
  ON public.agent_reviews 
  FOR SELECT
  USING (true);

-- INSERT: 인증된 사용자만 자신의 리뷰 작성 가능 (최적화)
CREATE POLICY "Users can insert own reviews"
  ON public.agent_reviews 
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- UPDATE: 사용자는 자신의 리뷰만 수정 가능 (최적화)
CREATE POLICY "Users can update own reviews"
  ON public.agent_reviews 
  FOR UPDATE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- DELETE: 사용자는 자신의 리뷰만 삭제 가능 (최적화)
CREATE POLICY "Users can delete own reviews"
  ON public.agent_reviews 
  FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- =====================================================
-- 3. 외래 키 제약조건 확인 및 생성
-- =====================================================

-- agent_reviews의 agent_id가 agent_master의 id를 참조하도록 설정
-- (이미 있으면 무시됨)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'agent_reviews_agent_id_fkey'
        AND table_name = 'agent_reviews'
    ) THEN
        ALTER TABLE public.agent_reviews 
        ADD CONSTRAINT agent_reviews_agent_id_fkey 
        FOREIGN KEY (agent_id) 
        REFERENCES public.agent_master(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 4. 확인 쿼리
-- =====================================================

-- RLS 활성화 상태 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('agent_master', 'agent_reviews');

-- 정책 목록 확인
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('agent_master', 'agent_reviews')
ORDER BY tablename, cmd;

-- 외래 키 확인
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'agent_reviews';

-- 데이터 테스트 쿼리
SELECT COUNT(*) as agent_master_count FROM public.agent_master;
SELECT COUNT(*) as agent_reviews_count FROM public.agent_reviews;

-- '미금' 검색 테스트
SELECT id, agent_name, road_address 
FROM public.agent_master 
WHERE agent_name ILIKE '%미금%' 
LIMIT 5;

