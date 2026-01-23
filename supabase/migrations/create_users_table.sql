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
  user_grade VARCHAR(50)
);

-- 인덱스 생성
CREATE INDEX idx_users_supabase_user_id ON public.users(supabase_user_id);
CREATE INDEX idx_users_email ON public.users(email);

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 권한 정책 설정
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = supabase_user_id);
-- (중요) 트리거가 데이터를 넣을 수 있도록 서비스 롤 권한 부여
CREATE POLICY "Service role insert" ON public.users FOR INSERT WITH CHECK (true);

-- 테이블 소유권 확실히 하기
ALTER TABLE public.users OWNER TO postgres;