-- Enable RLS on agent_reviews table if not already enabled
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON agent_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON agent_reviews;

-- Allow users to view their own reviews
CREATE POLICY "Users can view their own reviews"
ON agent_reviews
FOR SELECT
USING (auth.uid() = supabase_user_id);

-- Allow users to insert their own reviews
CREATE POLICY "Users can insert their own reviews"
ON agent_reviews
FOR INSERT
WITH CHECK (auth.uid() = supabase_user_id);

-- Allow users to update their own reviews
CREATE POLICY "Users can update their own reviews"
ON agent_reviews
FOR UPDATE
USING (auth.uid() = supabase_user_id)
WITH CHECK (auth.uid() = supabase_user_id);
