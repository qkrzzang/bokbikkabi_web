-- ================================================
-- 서베이 및 포인트 시스템 DB 스키마
-- ================================================

-- ================================================
-- 1. 포인트 시스템
-- ================================================

-- 1.1 사용자 포인트 테이블 (현재 보유 포인트)
CREATE TABLE IF NOT EXISTS user_points (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INT NOT NULL DEFAULT 0, -- 총 보유 포인트
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supabase_user_id)
);

-- 1.2 포인트 거래 내역 테이블 (포인트 적립/사용 내역)
CREATE TABLE IF NOT EXISTS point_transactions (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'ATTENDANCE', 'CONTRACT', 'SURVEY', 'REVIEW', 'REFERRAL' 등
  points INT NOT NULL, -- 적립/차감 포인트 (양수: 적립, 음수: 차감)
  description TEXT, -- 설명 (예: "출석 체크", "계약서 등록", "서베이 완료")
  reference_id BIGINT, -- 참조 ID (계약서 ID, 서베이 ID 등)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 포인트 정책은 공통 코드로 관리 (point_policies 테이블 제거)

-- ================================================
-- 2. 서베이 시스템
-- ================================================

-- 2.1 서베이 응답 테이블
CREATE TABLE IF NOT EXISTS survey_responses (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_code VARCHAR(50) NOT NULL, -- 공통 코드 (common_code_detail.code_value)
  response_value TEXT NOT NULL, -- 응답 값
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자별 질문별 중복 응답 방지를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_question 
  ON survey_responses(supabase_user_id, question_code);

-- 2.2 출석 체크 테이블
CREATE TABLE IF NOT EXISTS user_attendance (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supabase_user_id, attendance_date)
);

-- ================================================
-- 3. 인덱스 생성
-- ================================================

-- 포인트 거래 내역 조회 최적화
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created 
  ON point_transactions(supabase_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_transactions_type 
  ON point_transactions(transaction_type);

-- 출석 체크 조회 최적화
CREATE INDEX IF NOT EXISTS idx_user_attendance_user_date 
  ON user_attendance(supabase_user_id, attendance_date DESC);

-- ================================================
-- 4. 트리거 함수
-- ================================================

-- 4.1 포인트 거래 시 user_points 자동 업데이트
CREATE OR REPLACE FUNCTION update_user_points_on_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- user_points 레코드가 없으면 생성
  INSERT INTO user_points (supabase_user_id, total_points)
  VALUES (NEW.supabase_user_id, NEW.points)
  ON CONFLICT (supabase_user_id) 
  DO UPDATE SET 
    total_points = user_points.total_points + NEW.points,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- 4.2 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_user_points ON point_transactions;
CREATE TRIGGER trigger_update_user_points
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_on_transaction();

-- 4.3 updated_at 자동 업데이트 트리거 (기존 함수 재사용)
DROP TRIGGER IF EXISTS trigger_survey_responses_updated_at ON survey_responses;
CREATE TRIGGER trigger_survey_responses_updated_at
  BEFORE UPDATE ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_points_updated_at ON user_points;
CREATE TRIGGER trigger_user_points_updated_at
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- point_policies 테이블 제거로 인한 트리거 삭제

-- ================================================
-- 5. RLS (Row Level Security) 정책
-- ================================================

-- 5.1 user_points RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own points" ON user_points;
CREATE POLICY "Users can view own points" ON user_points
  FOR SELECT
  USING (supabase_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can manage user points" ON user_points;
CREATE POLICY "System can manage user points" ON user_points
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5.2 point_transactions RLS
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON point_transactions;
CREATE POLICY "Users can view own transactions" ON point_transactions
  FOR SELECT
  USING (supabase_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all transactions" ON point_transactions;
CREATE POLICY "Admins can view all transactions" ON point_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = (SELECT auth.uid()) 
      AND users.user_type = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "System can manage transactions" ON point_transactions;
CREATE POLICY "System can manage transactions" ON point_transactions
  FOR INSERT
  WITH CHECK (true);

-- 5.3 point_policies RLS - 공통 코드로 대체되어 제거

-- 5.4 survey_responses RLS
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own responses" ON survey_responses;
CREATE POLICY "Users can view own responses" ON survey_responses
  FOR SELECT
  USING (supabase_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own responses" ON survey_responses;
CREATE POLICY "Users can insert own responses" ON survey_responses
  FOR INSERT
  WITH CHECK (supabase_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own responses" ON survey_responses;
CREATE POLICY "Users can update own responses" ON survey_responses
  FOR UPDATE
  USING (supabase_user_id = (SELECT auth.uid()))
  WITH CHECK (supabase_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all responses" ON survey_responses;
CREATE POLICY "Admins can view all responses" ON survey_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = (SELECT auth.uid()) 
      AND users.user_type = 'ADMIN'
    )
  );

-- 5.5 user_attendance RLS
ALTER TABLE user_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own attendance" ON user_attendance;
CREATE POLICY "Users can view own attendance" ON user_attendance
  FOR SELECT
  USING (supabase_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own attendance" ON user_attendance;
CREATE POLICY "Users can insert own attendance" ON user_attendance
  FOR INSERT
  WITH CHECK (supabase_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all attendance" ON user_attendance;
CREATE POLICY "Admins can view all attendance" ON user_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = (SELECT auth.uid()) 
      AND users.user_type = 'ADMIN'
    )
  );

-- ================================================
-- 6. 헬퍼 함수들
-- ================================================

-- 6.1 포인트 적립 함수 (공통 코드 기반)
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_points INT;
  v_desc TEXT;
  v_transaction_id BIGINT;
BEGIN
  -- 공통 코드에서 포인트 정책 조회 (extra_value1에서 포인트 값 가져오기)
  SELECT 
    CAST(extra_value1 AS INT),
    description 
  INTO v_points, v_desc
  FROM common_code_detail
  WHERE code_group = 'POINT_POLICY' 
    AND code_value = p_transaction_type 
    AND use_yn = 'Y'
    AND CURRENT_DATE BETWEEN sta_ymd AND end_ymd;
  
  -- 정책이 없으면 0 포인트
  IF v_points IS NULL THEN
    RAISE NOTICE 'No active policy found for transaction_type: %. Setting points to 0.', p_transaction_type;
    v_points := 0;
    v_desc := p_transaction_type;
  END IF;
  
  -- 포인트 거래 내역 추가 (트리거가 user_points 자동 업데이트)
  INSERT INTO point_transactions (
    supabase_user_id, 
    transaction_type, 
    points, 
    description
  ) VALUES (
    p_user_id,
    p_transaction_type,
    v_points,
    COALESCE(p_description, v_desc)
  )
  RETURNING id INTO v_transaction_id;
  
  -- 결과 반환
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'points', v_points,
    'user_id', p_user_id
  );
END;
$$;

-- 6.2 출석 체크 및 포인트 지급 함수
CREATE OR REPLACE FUNCTION check_in_attendance(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_already_checked BOOLEAN;
  v_result JSONB;
BEGIN
  -- 오늘 이미 출석했는지 확인
  SELECT EXISTS(
    SELECT 1 FROM user_attendance 
    WHERE supabase_user_id = p_user_id 
    AND attendance_date = CURRENT_DATE
  ) INTO v_already_checked;
  
  IF v_already_checked THEN
    v_result := jsonb_build_object(
      'success', false,
      'message', '오늘 이미 출석 체크를 완료했습니다.',
      'points', 0
    );
  ELSE
    -- 출석 체크 기록
    INSERT INTO user_attendance (supabase_user_id, attendance_date)
    VALUES (p_user_id, CURRENT_DATE);
    
    -- 포인트 지급
    PERFORM award_points(p_user_id, 'ATTENDANCE', '출석 체크');
    
    DECLARE
      v_points INT;
    BEGIN
      -- 출석 포인트 조회 (extra_value1에서 포인트 값 가져오기)
      SELECT CAST(extra_value1 AS INT) INTO v_points
      FROM common_code_detail 
      WHERE code_group = 'POINT_POLICY' 
        AND code_value = 'ATTENDANCE' 
        AND use_yn = 'Y' 
        AND CURRENT_DATE BETWEEN sta_ymd AND end_ymd;
      
      v_result := jsonb_build_object(
        'success', true,
        'message', '출석 체크 완료! 포인트가 적립되었습니다.',
        'points', COALESCE(v_points, 10)
      );
    END;
  END IF;
  
  RETURN v_result;
END;
$$;

-- ================================================
-- 7. 공통 코드 초기 데이터
-- ================================================

-- 7.1 서베이 카테고리 추가
INSERT INTO common_code_master (code_group, code_group_name, description, use_yn, sta_ymd, end_ymd)
VALUES ('SURVEY', '서베이', '사용자 서베이 질문', 'Y', '20240101', '99991231')
ON CONFLICT (code_group) DO NOTHING;

-- 7.2 서베이 질문 초기 데이터
DO $$
DECLARE
  max_id INT;
  seq_name TEXT;
BEGIN
  -- common_code_detail 시퀀스 이름 찾기
  SELECT pg_get_serial_sequence('common_code_detail', 'id') INTO seq_name;
  
  -- 현재 테이블의 최대 id 확인
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM common_code_detail;
  
  -- 시퀀스를 최대 id + 1로 설정
  IF seq_name IS NOT NULL AND max_id > 0 THEN
    EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id + 1);
  END IF;
  
  -- SURVEY 질문들을 하나씩 INSERT (이미 존재하면 스킵)
  -- SURVEY 질문들을 하나씩 INSERT (이미 존재하면 스킵)
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'SURVEY', 'CURRENT_STATUS', 'Q1. 지금 당신 상황은?', '지금 집을 구하는 중,3개월 내 계획,최근 1년 내 계약해봄,정보만 모으는 중', 1, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'SURVEY' AND code_value = 'CURRENT_STATUS');
  
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'SURVEY', 'STRESS_POINT', 'Q2. 집을 구할 때 가장 스트레스받는 단계는?', '매물 탐색(허위 매물 판별 등),임장 및 집 상태 확인(수압/층간소음 등),계약 및 복비 협의(계약서 독소조항/중개수수료 등),대출 및 잔금 처리,부동산 정책', 2, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'SURVEY' AND code_value = 'STRESS_POINT');
  
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'SURVEY', 'WANTED_FEATURE', 'Q3. 복비까비가 제공하면 가장 먼저 쓰고 싶은 건?', '실제 계약자 후기 열람,적정 복비 계산/비교,계약서 자동 검토(위험 특약 체크),집주인/권리관계 위험 신호 체크(등기/체납 등),체크리스트(임장/계약)', 3, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'SURVEY' AND code_value = 'WANTED_FEATURE');
END $$;

-- 7.3 포인트 정책 카테고리 추가
INSERT INTO common_code_master (code_group, code_group_name, description, use_yn, sta_ymd, end_ymd)
VALUES ('POINT_POLICY', '포인트 정책', '액션별 포인트 지급 정책', 'Y', '20240101', '99991231')
ON CONFLICT (code_group) DO NOTHING;

-- 7.4 포인트 정책 초기 데이터
-- code_name에 포인트 숫자, description에 설명
DO $$
DECLARE
  max_id INT;
  seq_name TEXT;
BEGIN
  -- common_code_detail 시퀀스 이름 찾기
  SELECT pg_get_serial_sequence('common_code_detail', 'id') INTO seq_name;
  
  -- 현재 테이블의 최대 id 확인
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM common_code_detail;
  
  -- 시퀀스를 최대 id + 1로 설정
  IF seq_name IS NOT NULL AND max_id > 0 THEN
    EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id + 1);
  END IF;
  
  -- POINT_POLICY 정책들을 하나씩 INSERT (이미 존재하면 스킵)
  -- POINT_POLICY 정책들을 하나씩 INSERT (이미 존재하면 스킵)
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'POINT_POLICY', 'ATTENDANCE', '10', '매일 출석 체크', 1, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'ATTENDANCE');
  
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'POINT_POLICY', 'CONTRACT', '100', '계약서 등록', 2, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'CONTRACT');
  
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'POINT_POLICY', 'SURVEY', '50', '서베이 완료', 3, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'SURVEY');
  
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'POINT_POLICY', 'REVIEW', '200', '리뷰 작성', 4, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'REVIEW');
  
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'POINT_POLICY', 'FAVORITE', '5', '관심 부동산 등록', 5, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'FAVORITE');
  
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'POINT_POLICY', 'DAILY_LOGIN', '5', '일일 로그인', 6, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'DAILY_LOGIN');
  
  INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
  SELECT 'POINT_POLICY', 'AD_VIEW', '10', '광고 시청', 7, 'Y', '20240101', '99991231'
  WHERE NOT EXISTS (SELECT 1 FROM common_code_detail WHERE code_group = 'POINT_POLICY' AND code_value = 'AD_VIEW');
END $$;

-- ================================================
-- 완료
-- ================================================
COMMENT ON TABLE user_points IS '사용자별 포인트 보유 현황';
COMMENT ON TABLE point_transactions IS '포인트 거래 내역 (적립/차감)';
COMMENT ON TABLE survey_responses IS '사용자 서베이 응답';
COMMENT ON TABLE user_attendance IS '사용자 출석 체크 내역';

-- 참고: 포인트 정책은 common_code_detail 테이블의 POINT_POLICY로 관리됨

