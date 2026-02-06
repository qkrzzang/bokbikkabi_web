-- Fix Duplicate Index Warning
-- Remove idx_agent_comments_agent (duplicate of idx_agent_comments_agent_created)

DROP INDEX IF EXISTS public.idx_agent_comments_agent;
