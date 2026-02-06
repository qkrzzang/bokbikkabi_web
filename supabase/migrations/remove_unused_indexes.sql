-- Remove Unused Indexes
-- These indexes have never been used and are safe to remove

-- 1. users table
DROP INDEX IF EXISTS public.idx_users_email;

-- 2. access_logs table (keep only the compound index)
DROP INDEX IF EXISTS public.idx_access_logs_supabase_user_id;
DROP INDEX IF EXISTS public.idx_access_logs_created_at;

-- Note: idx_access_logs_created_at_action compound index is kept

-- 3. agent_comments table
DROP INDEX IF EXISTS public.idx_agent_comments_user;

-- Note: idx_agent_comments_agent_created compound index is kept

-- 4. partnership_inquiries table
DROP INDEX IF EXISTS public.idx_partnership_inquiries_user_id;
DROP INDEX IF EXISTS public.idx_partnership_inquiries_status;

-- 5. favorite_agents table
DROP INDEX IF EXISTS public.idx_favorite_agents_user_id;
DROP INDEX IF EXISTS public.idx_favorite_agents_agent_id;

-- 6. Keep these indexes as they will be used in future features:
-- - idx_agent_master_location (for location-based search)
-- - idx_common_code_master_use_yn (for active code filtering)
-- - idx_common_code_detail_use_yn (for active detail code filtering)
-- - idx_review_helpful_review_id (for review aggregation)
-- - idx_review_helpful_user_id (for user's helpful history)