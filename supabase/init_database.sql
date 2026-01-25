-- ============================================================
-- 복비까비 데이터베이스 초기화 스크립트
-- 새로운 Supabase 프로젝트에서 실행하세요.
-- ============================================================

-- ============================================================
-- 1. Extension 활성화
-- ============================================================

-- pg_trgm: 부분 문자열 검색 최적화 (ILIKE 성능 향상)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. 공통 함수
-- ============================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 접속 로그 자동 삭제 함수 (90일 이상)
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM access_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. 테이블 생성
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 사용자 테이블 (users)
-- ------------------------------------------------------------
CREATE TABLE public.users (
  supabase_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  provider VARCHAR(50),
  provider_user_id VARCHAR(255),
  nickname VARCHAR(100),
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  user_type VARCHAR(50),
  user_grade VARCHAR(50) DEFAULT 'IMJANG'
);

-- 인덱스
CREATE INDEX idx_users_supabase_user_id ON public.users(supabase_user_id);
CREATE INDEX idx_users_email ON public.users(email);

-- 코멘트
COMMENT ON TABLE public.users IS '사용자 정보 테이블';
COMMENT ON COLUMN public.users.user_grade IS '사용자 등급 (IMJANG, INJU, MYUNGDANG, GOD)';

-- 소유권
ALTER TABLE public.users OWNER TO postgres;

-- ------------------------------------------------------------
-- 3.2 중개사무소 마스터 테이블 (agent_master)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_master (
    id BIGSERIAL PRIMARY KEY,
    agent_name VARCHAR(255) NOT NULL,
    agent_number VARCHAR(50) NOT NULL UNIQUE,
    agent_type VARCHAR(50),
    road_address TEXT,
    lot_address TEXT,
    phone_number VARCHAR(20),
    registration_date DATE,
    insurance_joined BOOLEAN DEFAULT FALSE,
    representative_name VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    assistant_count INTEGER DEFAULT 0,
    agent_count INTEGER DEFAULT 0,
    website_url VARCHAR(500),
    data_reference_date DATE,
    provider_code VARCHAR(50),
    provider_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_agent_master_agent_number ON public.agent_master(agent_number);
CREATE INDEX idx_agent_master_agent_name ON public.agent_master(agent_name);
CREATE INDEX idx_agent_master_location ON public.agent_master(latitude, longitude);
CREATE INDEX idx_agent_master_provider_code ON public.agent_master(provider_code);

-- trigram 인덱스 (ILIKE 검색 성능 최적화)
CREATE INDEX idx_agent_master_agent_name_trgm ON public.agent_master USING gin (agent_name gin_trgm_ops);
CREATE INDEX idx_agent_master_agent_number_trgm ON public.agent_master USING gin (agent_number gin_trgm_ops);

-- 트리거
CREATE TRIGGER update_agent_master_updated_at
    BEFORE UPDATE ON public.agent_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE public.agent_master IS '공인중개사 정보 Master 테이블';
COMMENT ON COLUMN public.agent_master.id IS '고유 ID';
COMMENT ON COLUMN public.agent_master.agent_name IS '중개사무소명';
COMMENT ON COLUMN public.agent_master.agent_number IS '개설등록번호';
COMMENT ON COLUMN public.agent_master.agent_type IS '개업공인중개사종별구분';
COMMENT ON COLUMN public.agent_master.road_address IS '소재지도로명주소';
COMMENT ON COLUMN public.agent_master.lot_address IS '소재지지번주소';
COMMENT ON COLUMN public.agent_master.phone_number IS '전화번호';
COMMENT ON COLUMN public.agent_master.registration_date IS '개설등록일자';
COMMENT ON COLUMN public.agent_master.insurance_joined IS '공제가입유무';
COMMENT ON COLUMN public.agent_master.representative_name IS '대표자명';
COMMENT ON COLUMN public.agent_master.latitude IS '위도';
COMMENT ON COLUMN public.agent_master.longitude IS '경도';
COMMENT ON COLUMN public.agent_master.assistant_count IS '중개보조원수';
COMMENT ON COLUMN public.agent_master.agent_count IS '소속공인중개사수';
COMMENT ON COLUMN public.agent_master.website_url IS '홈페이지주소';
COMMENT ON COLUMN public.agent_master.data_reference_date IS '데이터기준일자';
COMMENT ON COLUMN public.agent_master.provider_code IS '제공기관코드';
COMMENT ON COLUMN public.agent_master.provider_name IS '제공기관명';
COMMENT ON COLUMN public.agent_master.created_at IS '생성일시';
COMMENT ON COLUMN public.agent_master.updated_at IS '수정일시';

-- ------------------------------------------------------------
-- 3.3 공통코드 마스터 테이블 (common_code_master)
-- ------------------------------------------------------------
CREATE TABLE public.common_code_master (
  code_group VARCHAR(50) PRIMARY KEY,
  code_group_name VARCHAR(100) NOT NULL,
  description TEXT,
  sta_ymd DATE NOT NULL DEFAULT CURRENT_DATE,
  end_ymd DATE DEFAULT '9999-12-31',
  sort_order INT DEFAULT 0,
  use_yn CHAR(1) DEFAULT 'Y',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_common_code_master_use_yn ON public.common_code_master(use_yn);
CREATE INDEX idx_common_code_master_sort_order ON public.common_code_master(sort_order);

-- 코멘트
COMMENT ON TABLE public.common_code_master IS '공통코드 마스터 테이블';
COMMENT ON COLUMN public.common_code_master.code_group IS '코드 그룹 (PK)';
COMMENT ON COLUMN public.common_code_master.code_group_name IS '코드 그룹명';
COMMENT ON COLUMN public.common_code_master.description IS '설명';
COMMENT ON COLUMN public.common_code_master.sta_ymd IS '시작일자';
COMMENT ON COLUMN public.common_code_master.end_ymd IS '종료일자';
COMMENT ON COLUMN public.common_code_master.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.common_code_master.use_yn IS '사용 여부 (Y/N)';

-- 소유권
ALTER TABLE public.common_code_master OWNER TO postgres;

-- 초기 데이터
INSERT INTO public.common_code_master (code_group, code_group_name, description, sta_ymd, end_ymd, sort_order) VALUES
('USER_TYPE', '사용자 유형', '시스템 사용자의 유형을 정의합니다.', '2025-01-01', '9999-12-31', 1),
('TRANSACTION_TYPE', '거래 유형', '부동산 거래 유형을 정의합니다.', '2025-01-01', '9999-12-31', 2),
('PRAISE_TAG', '칭찬 태그', '리뷰 작성 시 사용하는 칭찬 태그입니다.', '2025-01-01', '9999-12-31', 3),
('REGRET_TAG', '아쉬움 태그', '리뷰 작성 시 사용하는 아쉬움 태그입니다.', '2025-01-01', '9999-12-31', 4),
('DETAIL_EVALUATION', '상세 평가', '리뷰 작성 시 사용하는 상세 평가 항목입니다.', '2025-01-01', '9999-12-31', 5),
('USER_GRADE', '사용자 등급', '리뷰 작성 수에 따른 사용자 등급입니다.', '2025-01-01', '9999-12-31', 6);

-- ------------------------------------------------------------
-- 3.4 공통코드 상세 테이블 (common_code_detail)
-- ------------------------------------------------------------
CREATE TABLE public.common_code_detail (
  id SERIAL PRIMARY KEY,
  code_group VARCHAR(50) NOT NULL REFERENCES public.common_code_master(code_group) ON DELETE CASCADE,
  code_value VARCHAR(100) NOT NULL,
  code_name VARCHAR(200) NOT NULL,
  description TEXT,
  sta_ymd DATE NOT NULL DEFAULT CURRENT_DATE,
  end_ymd DATE DEFAULT '9999-12-31',
  sort_order INT DEFAULT 0,
  use_yn CHAR(1) DEFAULT 'Y',
  extra_value1 VARCHAR(500),
  extra_value2 VARCHAR(500),
  extra_value3 VARCHAR(500),
  extra_value4 VARCHAR(500),
  extra_value5 VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code_group, code_value)
);

-- 인덱스
CREATE INDEX idx_common_code_detail_code_group ON public.common_code_detail(code_group);
CREATE INDEX idx_common_code_detail_use_yn ON public.common_code_detail(use_yn);
CREATE INDEX idx_common_code_detail_sort_order ON public.common_code_detail(sort_order);

-- 코멘트
COMMENT ON TABLE public.common_code_detail IS '공통코드 상세 테이블';
COMMENT ON COLUMN public.common_code_detail.id IS '자동 증가 ID';
COMMENT ON COLUMN public.common_code_detail.code_group IS '코드 그룹 (FK)';
COMMENT ON COLUMN public.common_code_detail.code_value IS '코드값';
COMMENT ON COLUMN public.common_code_detail.code_name IS '코드명';
COMMENT ON COLUMN public.common_code_detail.description IS '설명';
COMMENT ON COLUMN public.common_code_detail.sta_ymd IS '시작일자';
COMMENT ON COLUMN public.common_code_detail.end_ymd IS '종료일자';
COMMENT ON COLUMN public.common_code_detail.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.common_code_detail.use_yn IS '사용 여부 (Y/N)';
COMMENT ON COLUMN public.common_code_detail.extra_value1 IS '추가 값1';
COMMENT ON COLUMN public.common_code_detail.extra_value2 IS '추가 값2';
COMMENT ON COLUMN public.common_code_detail.extra_value3 IS '추가 값3';
COMMENT ON COLUMN public.common_code_detail.extra_value4 IS '추가 값4';
COMMENT ON COLUMN public.common_code_detail.extra_value5 IS '추가 값5';

-- 소유권
ALTER TABLE public.common_code_detail OWNER TO postgres;

-- 초기 데이터 삽입
-- 사용자 유형 (USER_TYPE)
INSERT INTO public.common_code_detail (code_group, code_value, code_name, description, sta_ymd, end_ymd, sort_order) VALUES
('USER_TYPE', 'ADMIN', '관리자', '시스템 관리자 권한을 가진 사용자', '2025-01-01', '9999-12-31', 1),
('USER_TYPE', 'USER', '일반 사용자', '일반 서비스 이용자', '2025-01-01', '9999-12-31', 2);

-- 거래 유형 (TRANSACTION_TYPE)
INSERT INTO public.common_code_detail (code_group, code_value, code_name, description, sta_ymd, end_ymd, sort_order) VALUES
('TRANSACTION_TYPE', 'RENT', '전월세', '전세 또는 월세 거래', '2025-01-01', '9999-12-31', 1),
('TRANSACTION_TYPE', 'SALE', '매매', '매매 거래', '2025-01-01', '9999-12-31', 2);

-- 칭찬 태그 (PRAISE_TAG)
INSERT INTO public.common_code_detail (code_group, code_value, code_name, description, sta_ymd, end_ymd, sort_order) VALUES
('PRAISE_TAG', 'KIND_EXPLANATION', '친절하고 상세한 설명', '친절하고 상세하게 설명해주심', '2025-01-01', '9999-12-31', 1),
('PRAISE_TAG', 'FAST_RESPONSE', '빠른 응답', '문의에 빠르게 응답해주심', '2025-01-01', '9999-12-31', 2),
('PRAISE_TAG', 'ACCURATE_INFO', '정확한 정보 제공', '정확한 정보를 제공해주심', '2025-01-01', '9999-12-31', 3),
('PRAISE_TAG', 'GOOD_RECOMMEND', '좋은 매물 추천', '좋은 매물을 추천해주심', '2025-01-01', '9999-12-31', 4),
('PRAISE_TAG', 'NEGO_HELP', '협상 도움', '협상에 도움을 주심', '2025-01-01', '9999-12-31', 5),
('PRAISE_TAG', 'EXPERT_ADVICE', '전문적인 조언', '전문적인 조언을 해주심', '2025-01-01', '9999-12-31', 6),
('PRAISE_TAG', 'HONEST_CONS', '단점도 솔직히', '단점도 솔직하게 말해주심', '2025-01-01', '9999-12-31', 7),
('PRAISE_TAG', 'CAREFUL_DOCS', '서류 처리 꼼꼼', '서류 처리를 꼼꼼히 해주심', '2025-01-01', '9999-12-31', 8),
('PRAISE_TAG', 'KIND_AFTER', '입주 후에도 친절', '입주 후에도 친절하게 응대해주심', '2025-01-01', '9999-12-31', 9);

-- 아쉬움 태그 (REGRET_TAG)
INSERT INTO public.common_code_detail (code_group, code_value, code_name, description, sta_ymd, end_ymd, sort_order) VALUES
('REGRET_TAG', 'SLOW_RESPONSE', '응답이 느림', '문의 응답이 느림', '2025-01-01', '9999-12-31', 1),
('REGRET_TAG', 'LACK_INFO', '정보 부족', '정보가 부족함', '2025-01-01', '9999-12-31', 2),
('REGRET_TAG', 'LACK_EXPLAIN', '매물 설명 부족', '매물 설명이 부족함', '2025-01-01', '9999-12-31', 3),
('REGRET_TAG', 'POOR_NEGO', '협상 미흡', '협상이 미흡함', '2025-01-01', '9999-12-31', 4),
('REGRET_TAG', 'LACK_EXPERT', '전문성 부족', '전문성이 부족함', '2025-01-01', '9999-12-31', 5),
('REGRET_TAG', 'UNKIND', '친절하지 않음', '친절하지 않음', '2025-01-01', '9999-12-31', 6),
('REGRET_TAG', 'ATTITUDE_CHANGE', '계약 후 태도 변화', '계약 후 태도가 변함', '2025-01-01', '9999-12-31', 7),
('REGRET_TAG', 'RUDE', '무례한 언행', '무례한 언행을 함', '2025-01-01', '9999-12-31', 8),
('REGRET_TAG', 'LATE', '약속 시간 미준수', '약속 시간을 지키지 않음', '2025-01-01', '9999-12-31', 9);

-- 상세 평가 (DETAIL_EVALUATION)
INSERT INTO public.common_code_detail (code_group, code_value, code_name, description, sta_ymd, end_ymd, sort_order) VALUES
('DETAIL_EVALUATION', 'FEE_SATISFACTION', '수수료 만족도', '중개 수수료에 대한 만족도', '2025-01-01', '9999-12-31', 1),
('DETAIL_EVALUATION', 'EXPERTISE', '전문성/지식', '중개사의 전문성과 지식 수준', '2025-01-01', '9999-12-31', 2),
('DETAIL_EVALUATION', 'KINDNESS', '친절도', '중개사의 친절도', '2025-01-01', '9999-12-31', 3),
('DETAIL_EVALUATION', 'COMMUNICATION', '소통/응대', '중개사의 소통 및 응대 능력', '2025-01-01', '9999-12-31', 4);

-- 사용자 등급 (USER_GRADE)
INSERT INTO public.common_code_detail (code_group, code_value, code_name, description, extra_value1, sta_ymd, end_ymd, sort_order) VALUES
('USER_GRADE', 'IMJANG', '임장까비', '좋은 집 어디 없나 - 신규 가입자', '0', '2025-01-01', '9999-12-31', 1),
('USER_GRADE', 'INJU', '인주까비', '첫 도장 꾹! - 리뷰 1~3건', '1-3', '2025-01-01', '9999-12-31', 2),
('USER_GRADE', 'MYUNGDANG', '명당까비', '여기가 명당이로구나! - 리뷰 4~9건', '4-9', '2025-01-01', '9999-12-31', 3),
('USER_GRADE', 'GOD', '갓까비', '부동산의 신 - 리뷰 10건 이상', '10+', '2025-01-01', '9999-12-31', 4);

-- ------------------------------------------------------------
-- 3.5 중개사무소 리뷰 테이블 (agent_reviews)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agent_master(id) ON DELETE CASCADE,
  supabase_user_id UUID REFERENCES public.users(supabase_user_id) ON DELETE SET NULL,
  transaction_tag TEXT,
  agent_address TEXT,
  agent_name TEXT,
  confience_score TEXT,
  contract_type TEXT,
  doc_title TEXT,
  reason TEXT,
  participant_role TEXT,
  praise_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  regret_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  fee_satisfaction SMALLINT,
  expertise SMALLINT,
  kindness SMALLINT,
  property_reliability SMALLINT,
  response_speed SMALLINT,
  review_text TEXT,
  contract_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent
  ON public.agent_reviews(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_reviews_user
  ON public.agent_reviews(supabase_user_id, created_at DESC);

-- 트리거
CREATE TRIGGER update_agent_reviews_updated_at
  BEFORE UPDATE ON public.agent_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE public.agent_reviews IS '중개사무소 리뷰 테이블';
COMMENT ON COLUMN public.agent_reviews.agent_id IS '중개사무소 ID';
COMMENT ON COLUMN public.agent_reviews.supabase_user_id IS '작성자 사용자 ID';
COMMENT ON COLUMN public.agent_reviews.transaction_tag IS '거래 태그';
COMMENT ON COLUMN public.agent_reviews.agent_address IS 'OCR 추출 주소';
COMMENT ON COLUMN public.agent_reviews.agent_name IS 'OCR 추출 중개사무소명';
COMMENT ON COLUMN public.agent_reviews.confience_score IS 'OCR 신뢰도';
COMMENT ON COLUMN public.agent_reviews.contract_type IS 'OCR 계약 유형';
COMMENT ON COLUMN public.agent_reviews.doc_title IS 'OCR 문서명';
COMMENT ON COLUMN public.agent_reviews.reason IS 'OCR 사유';
COMMENT ON COLUMN public.agent_reviews.participant_role IS '리뷰 작성자 역할 (매수/매도/임차/임대)';
COMMENT ON COLUMN public.agent_reviews.praise_tags IS '칭찬 태그';
COMMENT ON COLUMN public.agent_reviews.regret_tags IS '아쉬움 태그';
COMMENT ON COLUMN public.agent_reviews.fee_satisfaction IS '수수료 만족도';
COMMENT ON COLUMN public.agent_reviews.expertise IS '전문성/지식';
COMMENT ON COLUMN public.agent_reviews.kindness IS '친절/태도';
COMMENT ON COLUMN public.agent_reviews.property_reliability IS '매물 신뢰도';
COMMENT ON COLUMN public.agent_reviews.response_speed IS '응답 속도';
COMMENT ON COLUMN public.agent_reviews.review_text IS '리뷰 내용';
COMMENT ON COLUMN public.agent_reviews.contract_date IS '계약일자';

-- ------------------------------------------------------------
-- 3.6 중개사무소 댓글 테이블 (agent_comments)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agent_master(id) ON DELETE CASCADE,
  supabase_user_id UUID REFERENCES public.users(supabase_user_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_comments_agent
  ON public.agent_comments(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_comments_user
  ON public.agent_comments(supabase_user_id, created_at DESC);

-- ------------------------------------------------------------
-- 3.7 관심 중개사무소 테이블 (favorite_agents)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorite_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL REFERENCES public.users(supabase_user_id) ON DELETE CASCADE,
  agent_id BIGINT NOT NULL REFERENCES public.agent_master(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 & 제약조건
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_agents_user_agent
  ON public.favorite_agents(supabase_user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_favorite_agents_user
  ON public.favorite_agents(supabase_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorite_agents_agent
  ON public.favorite_agents(agent_id, created_at DESC);

-- ------------------------------------------------------------
-- 3.8 접속 로그 테이블 (access_logs)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID REFERENCES public.users(supabase_user_id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255),
  status_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_access_logs_supabase_user_id ON public.access_logs(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON public.access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON public.access_logs(ip_address);

-- ============================================================
-- 4. RLS (Row Level Security) 정책
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 users 테이블 RLS
-- ------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE USING (auth.uid() = supabase_user_id);

CREATE POLICY "Service role insert" 
  ON public.users FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------
-- 4.2 agent_master 테이블 RLS
-- ------------------------------------------------------------
ALTER TABLE public.agent_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" 
  ON public.agent_master FOR SELECT USING (true);

-- ------------------------------------------------------------
-- 4.3 common_code_master 테이블 RLS
-- ------------------------------------------------------------
ALTER TABLE public.common_code_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Common code master is viewable by everyone" 
  ON public.common_code_master FOR SELECT USING (true);

CREATE POLICY "Admin can manage common code master" 
  ON public.common_code_master FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = auth.uid() 
      AND user_type = 'ADMIN'
    )
  );

-- ------------------------------------------------------------
-- 4.4 common_code_detail 테이블 RLS
-- ------------------------------------------------------------
ALTER TABLE public.common_code_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Common code detail is viewable by everyone" 
  ON public.common_code_detail FOR SELECT USING (true);

CREATE POLICY "Admin can manage common code detail" 
  ON public.common_code_detail FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = auth.uid() 
      AND user_type = 'ADMIN'
    )
  );

-- ------------------------------------------------------------
-- 4.5 agent_reviews 테이블 RLS
-- ------------------------------------------------------------
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent reviews are viewable by everyone"
  ON public.agent_reviews FOR SELECT USING (true);

CREATE POLICY "Users can insert own reviews"
  ON public.agent_reviews FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

CREATE POLICY "Users can update own reviews"
  ON public.agent_reviews FOR UPDATE
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.agent_reviews FOR DELETE
  USING (auth.uid() = supabase_user_id);

-- ------------------------------------------------------------
-- 4.6 agent_comments 테이블 RLS
-- ------------------------------------------------------------
ALTER TABLE public.agent_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent comments are viewable by everyone"
  ON public.agent_comments FOR SELECT USING (true);

CREATE POLICY "Users can insert own comments"
  ON public.agent_comments FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

CREATE POLICY "Users can update own comments"
  ON public.agent_comments FOR UPDATE
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can delete own comments"
  ON public.agent_comments FOR DELETE
  USING (auth.uid() = supabase_user_id);

-- ------------------------------------------------------------
-- 4.7 favorite_agents 테이블 RLS
-- ------------------------------------------------------------
ALTER TABLE public.favorite_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.favorite_agents FOR SELECT
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.favorite_agents FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorite_agents FOR DELETE
  USING (auth.uid() = supabase_user_id);

-- ------------------------------------------------------------
-- 4.8 access_logs 테이블 RLS
-- ------------------------------------------------------------
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access logs"
  ON public.access_logs FOR SELECT
  USING (auth.uid() = supabase_user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own access logs"
  ON public.access_logs FOR INSERT
  WITH CHECK (
    auth.uid() = supabase_user_id OR 
    auth.role() = 'service_role' OR
    supabase_user_id IS NULL
  );

CREATE POLICY "Service role can update access logs"
  ON public.access_logs FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete access logs"
  ON public.access_logs FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================
-- 5. 트리거
-- ============================================================

-- ------------------------------------------------------------
-- 5.1 신규 사용자 자동 등록 트리거
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_provider text;
  v_name text;
  v_avatar text;
BEGIN
  -- [로그] 시작 확인
  RAISE LOG '[Trigger Start] Trying to insert user: %', new.id;

  -- 데이터 추출
  v_provider := COALESCE(new.raw_app_meta_data->>'provider', 'unknown');
  
  v_name := COALESCE(
    new.raw_user_meta_data->'properties'->>'nickname', -- 카카오
    new.raw_user_meta_data->>'name', -- 구글
    new.raw_user_meta_data->>'full_name',
    '익명'
  );
  
  v_avatar := COALESCE(
    new.raw_user_meta_data->'properties'->>'profile_image', -- 카카오
    new.raw_user_meta_data->>'avatar_url' -- 구글
  );

  -- INSERT (user_grade 기본값 포함)
  INSERT INTO public.users (
    supabase_user_id,
    email,
    nickname,
    profile_image_url,
    provider,
    provider_user_id,
    user_grade
  )
  VALUES (
    new.id,
    new.email,
    v_name,
    v_avatar,
    v_provider,
    new.raw_user_meta_data->>'sub',
    'IMJANG'
  )
  ON CONFLICT (supabase_user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    nickname = EXCLUDED.nickname,
    last_login_at = NOW(),
    updated_at = NOW();

  RAISE LOG '[Trigger Success] Inserted supabase_user_id: %', new.id;
  RETURN new;

EXCEPTION WHEN OTHERS THEN
  -- 에러 내용을 로그에 자세히 남김
  RAISE LOG '[Trigger Error] Message: %, Detail: %', SQLERRM, SQLSTATE;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 함수 소유자
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 완료 메시지
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 복비까비 데이터베이스 초기화 완료!';
  RAISE NOTICE '📊 생성된 테이블:';
  RAISE NOTICE '  - users (사용자)';
  RAISE NOTICE '  - agent_master (중개사무소)';
  RAISE NOTICE '  - common_code_master (공통코드 마스터)';
  RAISE NOTICE '  - common_code_detail (공통코드 상세)';
  RAISE NOTICE '  - agent_reviews (리뷰)';
  RAISE NOTICE '  - agent_comments (댓글)';
  RAISE NOTICE '  - favorite_agents (관심 중개사무소)';
  RAISE NOTICE '  - access_logs (접속 로그)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 RLS 정책 적용 완료';
  RAISE NOTICE '⚡ 인덱스 최적화 완료 (trigram 포함)';
  RAISE NOTICE '🔄 트리거 설정 완료';
END $$;
