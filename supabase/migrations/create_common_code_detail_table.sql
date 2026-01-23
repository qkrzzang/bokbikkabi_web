-- 공통코드 상세 테이블 생성
CREATE TABLE public.common_code_detail (
  id SERIAL PRIMARY KEY,
  code_group VARCHAR(50) NOT NULL REFERENCES public.common_code_master(code_group) ON DELETE CASCADE,
  code_value VARCHAR(100) NOT NULL,              -- 코드값 (예: ADMIN, USER, RENT, SALE)
  code_name VARCHAR(200) NOT NULL,               -- 코드명 (예: 관리자, 일반 사용자)
  description TEXT,                               -- 설명
  sta_ymd DATE NOT NULL DEFAULT CURRENT_DATE,    -- 시작일자
  end_ymd DATE DEFAULT '9999-12-31',             -- 종료일자
  sort_order INT DEFAULT 0,                       -- 정렬 순서
  use_yn CHAR(1) DEFAULT 'Y',                    -- 사용 여부
  extra_value1 VARCHAR(500),                      -- 추가 값1 (필요시 사용)
  extra_value2 VARCHAR(500),                      -- 추가 값2 (필요시 사용)
  extra_value3 VARCHAR(500),                      -- 추가 값3 (필요시 사용)
  extra_value4 VARCHAR(500),                      -- 추가 값4 (필요시 사용)
  extra_value5 VARCHAR(500),                      -- 추가 값5 (필요시 사용)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code_group, code_value)                  -- 코드 그룹 + 코드값 유니크
);

-- 인덱스 생성
CREATE INDEX idx_common_code_detail_code_group ON public.common_code_detail(code_group);
CREATE INDEX idx_common_code_detail_use_yn ON public.common_code_detail(use_yn);
CREATE INDEX idx_common_code_detail_sort_order ON public.common_code_detail(sort_order);

-- RLS 활성화
ALTER TABLE public.common_code_detail ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 조회 가능
CREATE POLICY "Common code detail is viewable by everyone" 
  ON public.common_code_detail FOR SELECT USING (true);

-- RLS 정책: 관리자만 수정 가능
CREATE POLICY "Admin can manage common code detail" 
  ON public.common_code_detail FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = auth.uid() 
      AND user_type = 'ADMIN'
    )
  );

-- 테이블 소유권 설정
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
('REGRET_TAG', 'ATTITUDE_CHANGE', '예약 후 태도 변화', '예약 후 태도가 변함', '2025-01-01', '9999-12-31', 7),
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

-- 코멘트 추가
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
