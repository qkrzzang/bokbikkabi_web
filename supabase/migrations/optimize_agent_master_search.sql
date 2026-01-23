-- agent_master 테이블 검색 성능 최적화
-- ILIKE 검색을 위한 trigram 인덱스 추가

-- pg_trgm 확장 활성화 (부분 문자열 검색 최적화)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- agent_name에 대한 trigram 인덱스 생성
-- 이 인덱스는 ILIKE '%검색어%' 패턴 검색 성능을 크게 향상시킵니다
DROP INDEX IF EXISTS idx_agent_master_agent_name_trgm;
CREATE INDEX idx_agent_master_agent_name_trgm ON agent_master USING gin (agent_name gin_trgm_ops);

-- agent_number에 대한 trigram 인덱스도 추가
DROP INDEX IF EXISTS idx_agent_master_agent_number_trgm;
CREATE INDEX idx_agent_master_agent_number_trgm ON agent_master USING gin (agent_number gin_trgm_ops);

-- 기존 B-tree 인덱스는 유지 (정확 일치 검색용)
-- idx_agent_master_agent_name
-- idx_agent_master_agent_number

-- 코멘트 추가
COMMENT ON INDEX idx_agent_master_agent_name_trgm IS 'agent_name ILIKE 검색 성능 최적화를 위한 trigram 인덱스';
COMMENT ON INDEX idx_agent_master_agent_number_trgm IS 'agent_number ILIKE 검색 성능 최적화를 위한 trigram 인덱스';
