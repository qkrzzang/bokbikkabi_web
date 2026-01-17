-- 접속 이력 테이블 생성
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID REFERENCES public.users(supabase_user_id) ON DELETE SET NULL, -- Supabase auth.users의 id (사용자 삭제 후에도 이력 유지)
  ip_address VARCHAR(45), -- IPv6 지원
  user_agent TEXT,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100),
  os VARCHAR(100),
  action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'page_view', 'api_call' 등
  endpoint VARCHAR(255), -- 접근한 엔드포인트 또는 페이지
  status_code INTEGER, -- HTTP 상태 코드
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_access_logs_supabase_user_id ON access_logs(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address);

-- 파티셔닝 (선택사항 - 대용량 데이터를 위한 월별 파티셔닝)
-- CREATE TABLE access_logs_2024_01 PARTITION OF access_logs
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- RLS (Row Level Security) 활성화
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 접속 이력만 조회 가능
CREATE POLICY "Users can view own access logs"
  ON access_logs FOR SELECT
  USING (auth.uid() = supabase_user_id);

-- 정책: 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role can do all"
  ON access_logs FOR ALL
  USING (auth.role() = 'service_role');

-- 접속 이력 자동 삭제 함수 (90일 이상 된 로그 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM access_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
