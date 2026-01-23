-- 공통코드 마스터 테이블 생성
CREATE TABLE public.common_code_master (
  code_group VARCHAR(50) PRIMARY KEY,           -- 코드 그룹 (예: USER_TYPE, TRANSACTION_TYPE)
  code_group_name VARCHAR(100) NOT NULL,        -- 코드 그룹명 (예: 사용자 유형, 거래 유형)
  description TEXT,                              -- 설명
  sta_ymd DATE NOT NULL DEFAULT CURRENT_DATE,   -- 시작일자
  end_ymd DATE DEFAULT '9999-12-31',            -- 종료일자
  sort_order INT DEFAULT 0,                      -- 정렬 순서
  use_yn CHAR(1) DEFAULT 'Y',                   -- 사용 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_common_code_master_use_yn ON public.common_code_master(use_yn);
CREATE INDEX idx_common_code_master_sort_order ON public.common_code_master(sort_order);

-- RLS 활성화
ALTER TABLE public.common_code_master ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 조회 가능
CREATE POLICY "Common code master is viewable by everyone" 
  ON public.common_code_master FOR SELECT USING (true);

-- RLS 정책: 관리자만 수정 가능 (users 테이블의 user_type이 'ADMIN'인 경우)
CREATE POLICY "Admin can manage common code master" 
  ON public.common_code_master FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE supabase_user_id = auth.uid() 
      AND user_type = 'ADMIN'
    )
  );

-- 테이블 소유권 설정
ALTER TABLE public.common_code_master OWNER TO postgres;

-- 초기 데이터 삽입
INSERT INTO public.common_code_master (code_group, code_group_name, description, sta_ymd, end_ymd, sort_order) VALUES
('USER_TYPE', '사용자 유형', '시스템 사용자의 유형을 정의합니다.', '2025-01-01', '9999-12-31', 1),
('TRANSACTION_TYPE', '거래 유형', '부동산 거래 유형을 정의합니다.', '2025-01-01', '9999-12-31', 2),
('PRAISE_TAG', '칭찬 태그', '리뷰 작성 시 사용하는 칭찬 태그입니다.', '2025-01-01', '9999-12-31', 3),
('REGRET_TAG', '아쉬움 태그', '리뷰 작성 시 사용하는 아쉬움 태그입니다.', '2025-01-01', '9999-12-31', 4),
('DETAIL_EVALUATION', '상세 평가', '리뷰 작성 시 사용하는 상세 평가 항목입니다.', '2025-01-01', '9999-12-31', 5),
('USER_GRADE', '사용자 등급', '리뷰 작성 수에 따른 사용자 등급입니다.', '2025-01-01', '9999-12-31', 6);

-- 코멘트 추가
COMMENT ON TABLE public.common_code_master IS '공통코드 마스터 테이블';
COMMENT ON COLUMN public.common_code_master.code_group IS '코드 그룹 (PK)';
COMMENT ON COLUMN public.common_code_master.code_group_name IS '코드 그룹명';
COMMENT ON COLUMN public.common_code_master.description IS '설명';
COMMENT ON COLUMN public.common_code_master.sta_ymd IS '시작일자';
COMMENT ON COLUMN public.common_code_master.end_ymd IS '종료일자';
COMMENT ON COLUMN public.common_code_master.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.common_code_master.use_yn IS '사용 여부 (Y/N)';
