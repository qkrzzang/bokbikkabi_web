-- 특수문자를 제거하고 유사도로 검색하는 함수
-- 공백, 하이픈, 괄호 등을 제거한 후 비교
CREATE OR REPLACE FUNCTION search_agents_by_name(search_term TEXT)
RETURNS TABLE (
  id BIGINT,
  agent_name VARCHAR(255),
  road_address TEXT,
  lot_address TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.agent_name,
    am.road_address,
    am.lot_address
  FROM agent_master am
  WHERE 
    -- 특수문자 제거 후 비교 (공백, 하이픈, 괄호, 대괄호, 중괄호 제거)
    regexp_replace(am.agent_name, '[\s\-()[\]{}]', '', 'g') ILIKE '%' || search_term || '%'
  ORDER BY am.agent_name
  LIMIT 50;
END;
$$;

-- 함수에 대한 설명
COMMENT ON FUNCTION search_agents_by_name(TEXT) IS '특수문자를 제거하고 중개사 이름으로 검색';