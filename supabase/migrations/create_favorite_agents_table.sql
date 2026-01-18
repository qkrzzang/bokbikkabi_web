-- 관심(즐겨찾기) 중개사무소 테이블
CREATE TABLE IF NOT EXISTS public.favorite_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL REFERENCES public.users(supabase_user_id) ON DELETE CASCADE,
  agent_id BIGINT NOT NULL REFERENCES public.agent_master(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 한 사용자가 같은 중개사무소를 중복 관심 등록하지 못하도록
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_agents_user_agent
  ON public.favorite_agents(supabase_user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_favorite_agents_user
  ON public.favorite_agents(supabase_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorite_agents_agent
  ON public.favorite_agents(agent_id, created_at DESC);

-- RLS
ALTER TABLE public.favorite_agents ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 관심만 조회/추가/삭제 가능
CREATE POLICY "Users can view own favorites"
  ON public.favorite_agents
  FOR SELECT
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.favorite_agents
  FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorite_agents
  FOR DELETE
  USING (auth.uid() = supabase_user_id);

