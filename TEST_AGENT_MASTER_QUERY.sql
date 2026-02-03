-- =====================================================
-- agent_master 테이블 데이터 및 RLS 상태 확인
-- =====================================================

-- 1. RLS 활성화 상태 확인
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('agent_master', 'agent_reviews');

-- 2. 현재 RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('agent_master', 'agent_reviews')
ORDER BY tablename, cmd;

-- 3. '미금' 데이터 확인 (RLS 무시하고 조회)
-- Dashboard에서 실행하면 RLS 정책을 우회하여 실제 데이터를 볼 수 있습니다
SELECT 
    id, 
    agent_name, 
    road_address, 
    lot_address,
    created_at
FROM public.agent_master 
WHERE agent_name ILIKE '%미금%'
ORDER BY created_at DESC
LIMIT 10;

-- 4. agent_master 총 데이터 개수
SELECT COUNT(*) as total_agents FROM public.agent_master;

-- 5. agent_reviews 총 데이터 개수
SELECT COUNT(*) as total_reviews FROM public.agent_reviews;

-- 6. agent_reviews와 agent_master 조인 테스트
-- (내 계약서 조회 쿼리와 동일한 구조)
SELECT 
    ar.id,
    ar.supabase_user_id,
    ar.created_at,
    ar.agent_id,
    am.agent_name,
    am.road_address,
    am.lot_address
FROM public.agent_reviews ar
LEFT JOIN public.agent_master am ON ar.agent_id = am.id
LIMIT 5;

-- 7. 외래 키 제약조건 확인
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'agent_reviews'
AND ccu.table_name = 'agent_master';

