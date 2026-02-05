-- =====================================================
-- favorite_agents와 agent_master 간의 Foreign Key 설정
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1. 기존 외래 키 확인
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'favorite_agents';

-- 2. favorite_agents 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'favorite_agents'
ORDER BY ordinal_position;

-- 3. 기존 외래 키 삭제 (있다면)
DO $$ 
DECLARE 
  constraint_name text;
BEGIN
  FOR constraint_name IN 
    SELECT tc.constraint_name
    FROM information_schema.table_constraints AS tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'favorite_agents'
      AND tc.constraint_name LIKE '%agent%'
  LOOP
    EXECUTE format('ALTER TABLE public.favorite_agents DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
  END LOOP;
END $$;

-- 4. 외래 키 제약 조건 추가
ALTER TABLE public.favorite_agents
  ADD CONSTRAINT favorite_agents_agent_id_fkey
  FOREIGN KEY (agent_id)
  REFERENCES public.agent_master(id)
  ON DELETE CASCADE;

-- 5. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_favorite_agents_user_id 
  ON public.favorite_agents(supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_favorite_agents_agent_id 
  ON public.favorite_agents(agent_id);

CREATE INDEX IF NOT EXISTS idx_favorite_agents_created_at 
  ON public.favorite_agents(created_at DESC);

-- 6. 복합 unique 제약 조건 추가 (같은 사용자가 같은 부동산을 중복 등록하지 못하도록)
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_agent 
  ON public.favorite_agents(supabase_user_id, agent_id);

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- 외래 키 확인
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'favorite_agents';

-- 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'favorite_agents'
ORDER BY indexname;

-- =====================================================
-- 테스트 쿼리 (실제 앱에서 실행되는 쿼리)
-- =====================================================

-- 관심 부동산 목록 조회 (JOIN 테스트)
SELECT 
  fa.id,
  fa.agent_id,
  fa.created_at,
  am.id,
  am.agent_name,
  am.road_address,
  am.lot_address,
  am.dongmyun,
  am.average_rating
FROM favorite_agents fa
LEFT JOIN agent_master am ON fa.agent_id = am.id
WHERE fa.supabase_user_id = auth.uid()
ORDER BY fa.created_at DESC;

