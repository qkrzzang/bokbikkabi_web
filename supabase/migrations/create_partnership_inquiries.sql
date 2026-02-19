-- 광고/제휴 문의 테이블 생성
CREATE TABLE IF NOT EXISTS public.partnership_inquiries (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  company_name TEXT,
  contact_phone TEXT,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('광고', '제휴', '오류', '기타')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  replied_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX idx_partnership_inquiries_user_id ON public.partnership_inquiries(supabase_user_id);
CREATE INDEX idx_partnership_inquiries_status ON public.partnership_inquiries(status);
CREATE INDEX idx_partnership_inquiries_created_at ON public.partnership_inquiries(created_at DESC);

-- RLS 활성화
ALTER TABLE public.partnership_inquiries ENABLE ROW LEVEL SECURITY;

-- 정책 생성: 사용자는 본인의 문의만 조회 가능
CREATE POLICY "Users can view their own inquiries"
  ON public.partnership_inquiries
  FOR SELECT
  USING (auth.uid() = supabase_user_id);

-- 정책 생성: 로그인한 사용자는 문의 작성 가능
CREATE POLICY "Authenticated users can create inquiries"
  ON public.partnership_inquiries
  FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

-- 정책 생성: 관리자는 모든 문의 조회 가능
CREATE POLICY "Admins can view all inquiries"
  ON public.partnership_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = auth.uid()
      AND users.user_type = 'ADMIN'
    )
  );

-- 정책 생성: 관리자는 문의 수정 가능 (답변 등)
CREATE POLICY "Admins can update inquiries"
  ON public.partnership_inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = auth.uid()
      AND users.user_type = 'ADMIN'
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_partnership_inquiries_updated_at
  BEFORE UPDATE ON public.partnership_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

