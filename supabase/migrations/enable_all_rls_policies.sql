-- ========================================
-- 모든 테이블 RLS 활성화 및 정책 설정
-- Supabase Dashboard > SQL Editor에서 실행
-- ========================================

-- 1. users 테이블
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = supabase_user_id);

-- 2. access_logs 테이블
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage access logs" ON public.access_logs;
CREATE POLICY "Service role can manage access logs"
  ON public.access_logs FOR ALL
  USING (auth.role() = 'service_role');

-- 3. favorite_agents 테이블
ALTER TABLE public.favorite_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorite_agents;
CREATE POLICY "Users can view own favorites"
  ON public.favorite_agents FOR SELECT
  USING (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorite_agents;
CREATE POLICY "Users can insert own favorites"
  ON public.favorite_agents FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorite_agents;
CREATE POLICY "Users can delete own favorites"
  ON public.favorite_agents FOR DELETE
  USING (auth.uid() = supabase_user_id);

-- 4. agent_master 테이블
ALTER TABLE public.agent_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.agent_master;
CREATE POLICY "Enable read access for all users"
  ON public.agent_master FOR SELECT
  USING (true);

-- 5. common_code_master 테이블
ALTER TABLE public.common_code_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Common code master viewable by everyone" ON public.common_code_master;
CREATE POLICY "Common code master viewable by everyone"
  ON public.common_code_master FOR SELECT
  USING (true);

-- 6. common_code_detail 테이블
ALTER TABLE public.common_code_detail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Common code detail viewable by everyone" ON public.common_code_detail;
CREATE POLICY "Common code detail viewable by everyone"
  ON public.common_code_detail FOR SELECT
  USING (true);

-- 7. agent_reviews 테이블
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent reviews are viewable by everyone" ON public.agent_reviews;
CREATE POLICY "Agent reviews are viewable by everyone"
  ON public.agent_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own reviews" ON public.agent_reviews;
CREATE POLICY "Users can insert own reviews"
  ON public.agent_reviews FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.agent_reviews;
CREATE POLICY "Users can update own reviews"
  ON public.agent_reviews FOR UPDATE
  USING (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.agent_reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.agent_reviews FOR DELETE
  USING (auth.uid() = supabase_user_id);

-- 8. agent_comments 테이블
ALTER TABLE public.agent_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.agent_comments;
CREATE POLICY "Comments are viewable by everyone"
  ON public.agent_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.agent_comments;
CREATE POLICY "Users can insert own comments"
  ON public.agent_comments FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.agent_comments;
CREATE POLICY "Users can update own comments"
  ON public.agent_comments FOR UPDATE
  USING (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.agent_comments;
CREATE POLICY "Users can delete own comments"
  ON public.agent_comments FOR DELETE
  USING (auth.uid() = supabase_user_id);

-- ========================================
-- 정책 확인
-- ========================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'access_logs', 'favorite_agents', 'agent_master', 
                    'common_code_master', 'common_code_detail', 'agent_reviews', 'agent_comments')
ORDER BY tablename;

-- 정책 목록 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

