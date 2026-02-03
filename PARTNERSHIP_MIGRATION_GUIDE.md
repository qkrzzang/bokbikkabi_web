# 광고/제휴 문의 테이블 마이그레이션 가이드

## Supabase Dashboard에서 실행 방법

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 좌측 메뉴 **SQL Editor** 클릭
4. **New Query** 클릭
5. 아래 SQL 전체를 복사하여 붙여넣기
6. **Run** 버튼 클릭

---

## SQL 코드

```sql
-- 광고/제휴 문의 테이블 생성
CREATE TABLE IF NOT EXISTS public.partnership_inquiries (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  company_name TEXT,
  contact_phone TEXT,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('광고', '제휴', '기타')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  replied_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_user_id ON public.partnership_inquiries(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_status ON public.partnership_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_created_at ON public.partnership_inquiries(created_at DESC);

-- RLS 활성화
ALTER TABLE public.partnership_inquiries ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 시)
DROP POLICY IF EXISTS "Users can view their own inquiries" ON public.partnership_inquiries;
DROP POLICY IF EXISTS "Authenticated users can create inquiries" ON public.partnership_inquiries;
DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.partnership_inquiries;
DROP POLICY IF EXISTS "Admins can update inquiries" ON public.partnership_inquiries;

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

-- 기존 트리거 삭제 (재실행 시)
DROP TRIGGER IF EXISTS update_partnership_inquiries_updated_at ON public.partnership_inquiries;

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_partnership_inquiries_updated_at
  BEFORE UPDATE ON public.partnership_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 실행 확인

SQL 실행 후 아래 쿼리로 테이블이 정상적으로 생성되었는지 확인:

```sql
SELECT * FROM public.partnership_inquiries LIMIT 1;
```

정상적으로 실행되면 (데이터가 없어도 OK), 웹사이트를 새로고침하면 오류가 해결됩니다.

