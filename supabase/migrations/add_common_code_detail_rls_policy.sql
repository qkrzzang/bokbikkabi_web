-- Enable RLS on common_code_detail table if not already enabled
ALTER TABLE common_code_detail ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Allow public read access to common_code_detail" ON common_code_detail;

-- Allow all authenticated users to read common_code_detail
-- This is a lookup/reference table that should be readable by all users
CREATE POLICY "Allow public read access to common_code_detail"
ON common_code_detail
FOR SELECT
TO authenticated
USING (true);
