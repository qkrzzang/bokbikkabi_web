-- ========================================
-- Function Search Path 보안 경고 수정
-- Supabase Dashboard > SQL Editor에서 실행
-- ========================================

-- 1. search_agents_by_name 함수 재생성 (search_path 설정)
DROP FUNCTION IF EXISTS search_agents_by_name(TEXT);

CREATE OR REPLACE FUNCTION search_agents_by_name(search_term TEXT)
RETURNS TABLE (
  id BIGINT,
  agent_name VARCHAR(255),
  road_address TEXT,
  lot_address TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- search_path 명시
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

COMMENT ON FUNCTION search_agents_by_name(TEXT) IS '특수문자를 제거하고 중개사 이름으로 검색';

-- 2. update_updated_at_column 함수 재생성 (search_path 설정)
-- CASCADE를 사용하여 의존하는 트리거도 함께 삭제
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- search_path 명시
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column() IS 'updated_at 컬럼 자동 업데이트 트리거 함수';

-- 트리거 재생성
DROP TRIGGER IF EXISTS update_agent_reviews_updated_at ON public.agent_reviews;
CREATE TRIGGER update_agent_reviews_updated_at
  BEFORE UPDATE ON public.agent_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_master_updated_at ON agent_master;
CREATE TRIGGER update_agent_master_updated_at
  BEFORE UPDATE ON agent_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. cleanup_old_access_logs 함수가 있다면 재생성 (있을 경우만)
-- 이 함수가 어디에 정의되어 있는지 확인 필요
-- 만약 없다면 이 부분은 무시됩니다

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_access_logs'
  ) THEN
    -- 함수 재생성
    EXECUTE '
      CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $func$
      BEGIN
        DELETE FROM access_logs 
        WHERE created_at < NOW() - INTERVAL ''90 days'';
      END;
      $func$;
    ';
  END IF;
END $$;

-- ========================================
-- 함수 확인
-- ========================================
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  array_to_string(p.proconfig, ', ') as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('search_agents_by_name', 'update_updated_at_column', 'cleanup_old_access_logs')
ORDER BY p.proname;

