-- =====================================================
-- Optimize Database Performance
-- =====================================================
-- 1. Add missing indexes for foreign keys
-- 2. Remove unused indexes
-- =====================================================

-- =====================================================
-- Part 1: Add Missing Foreign Key Indexes
-- =====================================================
-- Foreign keys without indexes can cause slow JOINs and lookups

-- Index for access_logs.supabase_user_id
-- Used for: Looking up all access logs for a specific user
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id 
ON public.access_logs(supabase_user_id) 
WHERE supabase_user_id IS NOT NULL;

-- Index for agent_comments.supabase_user_id
-- Used for: Looking up all comments by a specific user
CREATE INDEX IF NOT EXISTS idx_agent_comments_user_id 
ON public.agent_comments(supabase_user_id) 
WHERE supabase_user_id IS NOT NULL;

-- Index for favorite_agents.agent_id
-- Used for: Looking up all users who favorited a specific agent
CREATE INDEX IF NOT EXISTS idx_favorite_agents_agent_id 
ON public.favorite_agents(agent_id);

-- Index for review_helpful.supabase_user_id
-- Used for: Looking up all helpful reviews by a specific user
CREATE INDEX IF NOT EXISTS idx_review_helpful_supabase_user_id
ON public.review_helpful(supabase_user_id) 
WHERE supabase_user_id IS NOT NULL;

-- =====================================================
-- Part 2: Remove Unused Indexes
-- =====================================================
-- These indexes are never used and waste storage/write performance

-- Remove unused index on access_logs
DROP INDEX IF EXISTS public.idx_access_logs_created_at_action;

-- Remove unused index on agent_comments
DROP INDEX IF EXISTS public.idx_agent_comments_agent_created;

-- Remove unused index on agent_master
DROP INDEX IF EXISTS public.idx_agent_master_location;

-- Remove unused index on common_code_master
DROP INDEX IF EXISTS public.idx_common_code_master_use_yn;

-- Remove unused index on common_code_detail
DROP INDEX IF EXISTS public.idx_common_code_detail_use_yn;

-- Remove old unused index on review_helpful (if exists)
DROP INDEX IF EXISTS public.idx_review_helpful_user_id;

-- =====================================================
-- Part 3: Add Comments for Documentation
-- =====================================================

COMMENT ON INDEX idx_access_logs_user_id IS 
  'Speeds up user access log lookups - partial index for non-null user_ids';

COMMENT ON INDEX idx_agent_comments_user_id IS 
  'Speeds up user comment lookups - partial index for non-null user_ids';

COMMENT ON INDEX idx_favorite_agents_agent_id IS 
  'Speeds up favorite count queries for agents';

COMMENT ON INDEX idx_review_helpful_supabase_user_id IS 
  'Speeds up user helpful review lookups - partial index for non-null user_ids';

-- =====================================================
-- Summary:
-- =====================================================
-- ✅ Added 4 missing foreign key indexes:
--    - access_logs.supabase_user_id (partial index)
--    - agent_comments.supabase_user_id (partial index)
--    - favorite_agents.agent_id
--    - review_helpful.supabase_user_id (partial index)
-- 
-- ✅ Removed 6 unused indexes:
--    - idx_access_logs_created_at_action
--    - idx_agent_comments_agent_created
--    - idx_agent_master_location
--    - idx_common_code_master_use_yn
--    - idx_common_code_detail_use_yn
--    - idx_review_helpful_user_id (old version)
--
-- 📈 Performance Impact:
--    - Faster JOINs on foreign keys
--    - Faster user-specific queries
--    - Reduced storage usage
--    - Faster INSERT/UPDATE operations (fewer indexes to maintain)
--
-- ⚠️ Note about "unused index" warnings:
--    Newly created indexes may show as "unused" until they are 
--    actually used by queries. This is normal and expected.
--    Keep these indexes - they will be used when relevant queries run.
--
-- ⚠️ Note: Auth DB connection strategy should be changed from
--    absolute (10) to percentage-based in Supabase Dashboard
--    Settings > Database > Connection pooling
-- =====================================================
