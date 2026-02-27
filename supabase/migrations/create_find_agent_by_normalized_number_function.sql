-- Drop existing function first (if exists)
DROP FUNCTION IF EXISTS find_agent_by_normalized_number(TEXT);

-- RPC Function: Compares agent_number after removing hyphens (-)
-- Used to match OCR-extracted registration numbers with DB records
CREATE OR REPLACE FUNCTION find_agent_by_normalized_number(search_number TEXT)
RETURNS TABLE (
  id BIGINT,
  agent_number VARCHAR(50),
  agent_name VARCHAR(100),
  road_address TEXT,
  lot_address TEXT,
  representative_name VARCHAR(50)
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.agent_number,
    am.agent_name,
    am.road_address,
    am.lot_address,
    am.representative_name
  FROM agent_master am
  WHERE REPLACE(am.agent_number, '-', '') = search_number
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION find_agent_by_normalized_number(TEXT) IS 
'Searches agent_number by removing hyphens. Used to compare OCR-extracted registration numbers with DB records.';