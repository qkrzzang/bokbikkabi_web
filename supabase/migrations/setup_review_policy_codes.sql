-- Review policy configuration in common_code_detail
-- Set review limits: Daily, Monthly, and Total per user

INSERT INTO common_code_detail (
  code_group,
  code_value,
  code_name,
  extra_value1,
  description,
  sort_order,
  use_yn
) VALUES
  ('REVIEW_POLICY', 'DAILY_LIMIT', 'Daily Review Limit', '1', 'Maximum reviews per day', 1, 'Y'),
  ('REVIEW_POLICY', 'MONTHLY_LIMIT', 'Monthly Review Limit', '3', 'Maximum reviews per month', 2, 'Y'),
  ('REVIEW_POLICY', 'USER_LIMIT', 'Total User Review Limit', '10', 'Maximum total reviews per user', 3, 'Y')
ON CONFLICT (code_group, code_value) 
DO UPDATE SET
  extra_value1 = EXCLUDED.extra_value1,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE common_code_detail IS 'Common code detail table. REVIEW_POLICY group manages review submission limits.';