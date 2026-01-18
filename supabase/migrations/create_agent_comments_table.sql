-- 중개사무소 댓글(코멘트) 테이블
CREATE TABLE IF NOT EXISTS public.agent_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agent_master(id) ON DELETE CASCADE,
  supabase_user_id UUID REFERENCES public.users(supabase_user_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_comments_agent
  ON public.agent_comments(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_comments_user
  ON public.agent_comments(supabase_user_id, created_at DESC);

-- RLS
ALTER TABLE public.agent_comments ENABLE ROW LEVEL SECURITY;

-- 정책: 댓글은 모두 조회 가능(관심 목록의 댓글 수 표시용)
CREATE POLICY "Agent comments are viewable by everyone"
  ON public.agent_comments
  FOR SELECT
  USING (true);

-- 정책: 로그인 사용자는 본인 user_id로만 작성 가능
CREATE POLICY "Users can insert own comments"
  ON public.agent_comments
  FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

-- 정책: 본인 댓글만 수정/삭제 가능
CREATE POLICY "Users can update own comments"
  ON public.agent_comments
  FOR UPDATE
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can delete own comments"
  ON public.agent_comments
  FOR DELETE
  USING (auth.uid() = supabase_user_id);

