-- agent_master 테이블에 RLS 활성화 및 SELECT 권한 부여
-- 모든 사용자(인증/비인증)가 agent_master 테이블을 조회할 수 있도록 설정

-- RLS 활성화
ALTER TABLE agent_master ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 SELECT 권한 부여
CREATE POLICY "Enable read access for all users" ON agent_master
  FOR SELECT
  USING (true);

-- 코멘트 추가
COMMENT ON POLICY "Enable read access for all users" ON agent_master IS '모든 사용자가 중개사 정보를 조회할 수 있습니다';
