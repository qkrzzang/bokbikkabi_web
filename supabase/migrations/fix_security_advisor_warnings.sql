-- =====================================================
-- Security Advisor Warnings 수정
-- =====================================================

-- 1. update_updated_at_column 함수 보안 강화
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION update_updated_at_column() IS 'updated_at 컬럼을 자동으로 업데이트하는 트리거 함수 (SECURITY DEFINER)';

-- 2. cleanup_old_access_logs 함수 보안 강화
DROP FUNCTION IF EXISTS cleanup_old_access_logs() CASCADE;

CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.access_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION cleanup_old_access_logs() IS '90일 이상 된 접속 로그를 자동 삭제하는 함수 (SECURITY DEFINER)';

-- 3. search_agents_by_name 함수 보안 강화
DROP FUNCTION IF EXISTS search_agents_by_name(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION search_agents_by_name(search_term TEXT)
RETURNS TABLE (
  id BIGINT,
  agent_name VARCHAR(255),
  road_address TEXT,
  lot_address TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.agent_name,
    am.road_address,
    am.lot_address
  FROM public.agent_master am
  WHERE 
    -- 특수문자 제거 후 비교 (공백, 하이픈, 괄호, 대괄호, 중괄호 제거)
    regexp_replace(am.agent_name, '[\s\-()[\]{}]', '', 'g') ILIKE '%' || search_term || '%'
  ORDER BY am.agent_name
  LIMIT 50;
END;
$$;

COMMENT ON FUNCTION search_agents_by_name(TEXT) IS '특수문자를 제거하고 중개사 이름으로 검색 (SECURITY DEFINER)';

-- 4. 모든 트리거 재생성 (함수가 변경되었으므로)

-- agent_master 트리거
DROP TRIGGER IF EXISTS update_agent_master_updated_at ON public.agent_master;
CREATE TRIGGER update_agent_master_updated_at
    BEFORE UPDATE ON public.agent_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- agent_reviews 트리거
DROP TRIGGER IF EXISTS update_agent_reviews_updated_at ON public.agent_reviews;
CREATE TRIGGER update_agent_reviews_updated_at
  BEFORE UPDATE ON public.agent_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- common_code_master 트리거
DROP TRIGGER IF EXISTS update_common_code_master_updated_at ON public.common_code_master;
CREATE TRIGGER update_common_code_master_updated_at
  BEFORE UPDATE ON public.common_code_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- common_code_detail 트리거
DROP TRIGGER IF EXISTS update_common_code_detail_updated_at ON public.common_code_detail;
CREATE TRIGGER update_common_code_detail_updated_at
  BEFORE UPDATE ON public.common_code_detail
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- users 트리거
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 설명
-- =====================================================

-- SECURITY DEFINER:
--   함수가 정의된 사용자(소유자)의 권한으로 실행됩니다.
--   이렇게 하면 함수 호출자의 권한과 무관하게 안전하게 실행됩니다.

-- SET search_path = public, pg_temp:
--   함수 실행 시 명시적인 스키마 경로를 설정하여
--   악의적인 스키마 주입 공격을 방지합니다.

COMMENT ON SCHEMA public IS 'Security Advisor warnings 수정됨';
