-- =====================================================
-- 등록번호 정규화 비교 함수 (공백/하이픈 제거 후 비교)
-- 클라이언트에서 supabase.rpc('search_agent_by_number', { input_number: '...' }) 로 호출
-- =====================================================
CREATE OR REPLACE FUNCTION public.search_agent_by_number(input_number TEXT)
RETURNS TABLE (
  id BIGINT,
  agent_number TEXT,
  agent_name TEXT,
  road_address TEXT,
  lot_address TEXT,
  representative_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    agent_number,
    agent_name,
    road_address,
    lot_address,
    representative_name
  FROM public.agent_master
  WHERE replace(replace(agent_number, '-', ''), ' ', '')
      = replace(replace(input_number, '-', ''), ' ', '')
  LIMIT 1;
$$;
