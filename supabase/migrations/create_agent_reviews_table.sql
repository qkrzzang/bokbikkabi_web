-- 중개사무소 리뷰 테이블 생성
CREATE TABLE IF NOT EXISTS public.agent_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agent_master(id) ON DELETE CASCADE,
  supabase_user_id UUID REFERENCES public.users(supabase_user_id) ON DELETE SET NULL,
  transaction_tag TEXT, -- 예: #임자, 임대, 매수, 매도
  agent_address TEXT, -- OCR 추출 주소(참고용)
  agent_name TEXT, -- OCR 추출 중개사무소명(참고용)
  confience_score TEXT, -- OCR 신뢰도(참고용)
  contract_type TEXT, -- OCR 계약 유형(참고용)
  doc_title TEXT, -- OCR 문서명(참고용)
  reason TEXT, -- OCR 사유(참고용)
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent
  ON public.agent_reviews(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_reviews_user
  ON public.agent_reviews(supabase_user_id, created_at DESC);

-- updated_at 트리거
CREATE TRIGGER update_agent_reviews_updated_at
  BEFORE UPDATE ON public.agent_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- 정책: 리뷰는 모두 조회 가능
CREATE POLICY "Agent reviews are viewable by everyone"
  ON public.agent_reviews
  FOR SELECT
  USING (true);

-- 정책: 로그인 사용자는 본인 user_id로만 작성 가능
CREATE POLICY "Users can insert own reviews"
  ON public.agent_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

-- 정책: 본인 리뷰만 수정/삭제 가능
CREATE POLICY "Users can update own reviews"
  ON public.agent_reviews
  FOR UPDATE
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.agent_reviews
  FOR DELETE
  USING (auth.uid() = supabase_user_id);

-- 코멘트 추가
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
COMMENT ON COLUMN public.agent_reviews.praise_tags IS '칭찬 태그';
COMMENT ON COLUMN public.agent_reviews.regret_tags IS '아쉬움 태그';
COMMENT ON COLUMN public.agent_reviews.fee_satisfaction IS '수수료 만족도';
COMMENT ON COLUMN public.agent_reviews.expertise IS '전문성/지식';
COMMENT ON COLUMN public.agent_reviews.kindness IS '친절/태도';
COMMENT ON COLUMN public.agent_reviews.property_reliability IS '매물 신뢰도';
COMMENT ON COLUMN public.agent_reviews.response_speed IS '응답 속도';
COMMENT ON COLUMN public.agent_reviews.review_text IS '리뷰 내용';
COMMENT ON COLUMN public.agent_reviews.contract_date IS '계약일자';
