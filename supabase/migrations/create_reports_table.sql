-- =====================================================
-- 신고(reports) 테이블 생성
-- 리뷰 신고 기능을 위한 테이블
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id BIGSERIAL PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.agent_reviews(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,          -- 'fake', 'privacy', 'other'
  detail TEXT,                          -- 신고 상세 사유
  status VARCHAR(20) DEFAULT 'RECEIVED', -- 'RECEIVED'(접수), 'PROCESSING'(처리중), 'COMPLETED'(처리완료), 'DISMISSED'(기각)
  admin_note TEXT,                      -- 관리자 메모
  processed_at TIMESTAMP WITH TIME ZONE, -- 처리 완료 시각
  processed_by UUID,                    -- 처리한 관리자 ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_reports_review_id ON public.reports(review_id);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_user_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);

-- RLS 활성화
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 누구나 자신의 신고 조회 가능
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_user_id);

-- 관리자는 모든 신고 조회 가능
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE supabase_user_id = auth.uid()
      AND user_type = 'ADMIN'
    )
  );

-- 인증된 사용자는 신고 등록 가능
CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

-- 관리자만 신고 상태 업데이트 가능
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE supabase_user_id = auth.uid()
      AND user_type = 'ADMIN'
    )
  );

-- =====================================================
-- users 테이블에 닉네임 변경일 컬럼 추가
-- 한 달에 1회만 닉네임 수정 가능하도록 제한
-- =====================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS nickname_changed_at TIMESTAMP WITH TIME ZONE;
