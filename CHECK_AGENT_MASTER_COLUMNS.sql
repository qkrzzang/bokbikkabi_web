-- =====================================================
-- agent_master 테이블 컬럼 확인
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 테이블의 모든 컬럼 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'agent_master'
ORDER BY ordinal_position;

