-- access_logs 테이블의 RLS 정책 수정
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own access logs" ON access_logs;
DROP POLICY IF EXISTS "Service role can do all" ON access_logs;

-- SELECT 정책: 사용자는 자신의 접속 이력만 조회 가능
CREATE POLICY "Users can view own access logs"
  ON access_logs FOR SELECT
  USING (auth.uid() = supabase_user_id OR auth.role() = 'service_role');

-- INSERT 정책: 인증된 사용자는 자신의 접속 이력을 기록할 수 있음, 서비스 역할은 모든 INSERT 가능
CREATE POLICY "Users can insert own access logs"
  ON access_logs FOR INSERT
  WITH CHECK (
    auth.uid() = supabase_user_id OR 
    auth.role() = 'service_role' OR
    supabase_user_id IS NULL -- 로그인하지 않은 사용자도 로그 기록 가능
  );

-- UPDATE 정책: 서비스 역할만 수정 가능
CREATE POLICY "Service role can update access logs"
  ON access_logs FOR UPDATE
  USING (auth.role() = 'service_role');

-- DELETE 정책: 서비스 역할만 삭제 가능
CREATE POLICY "Service role can delete access logs"
  ON access_logs FOR DELETE
  USING (auth.role() = 'service_role');
