-- ================================================
-- 긴급 수정: 중복 트리거 제거 (포인트 2배 적립 문제)
-- ================================================
-- 문제: 두 개의 트리거가 동시에 작동하여 포인트가 2배로 적립됨
-- 해결: 기존 트리거/함수를 모두 삭제하고 하나만 생성

-- 1. 기존 트리거 모두 삭제
DROP TRIGGER IF EXISTS trigger_update_user_points ON point_transactions;
DROP TRIGGER IF EXISTS update_user_points_trigger ON point_transactions;

-- 2. 기존 함수 모두 삭제
DROP FUNCTION IF EXISTS update_user_points_on_transaction();
DROP FUNCTION IF EXISTS update_user_points();

-- 3. 새로운 트리거 함수 생성 (하나만!)
CREATE OR REPLACE FUNCTION update_user_points_on_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- user_points 레코드가 없으면 생성, 있으면 누적
  INSERT INTO user_points (supabase_user_id, total_points)
  VALUES (NEW.supabase_user_id, NEW.points)
  ON CONFLICT (supabase_user_id) 
  DO UPDATE SET 
    total_points = user_points.total_points + NEW.points,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- 4. 트리거 생성 (하나만!)
CREATE TRIGGER trigger_update_user_points
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_on_transaction();

-- 5. 사용자 포인트 재계산 (잘못 적립된 포인트 수정)
-- 주의: 이 쿼리는 모든 사용자의 포인트를 실제 거래 내역 기준으로 재계산합니다

-- 임시 테이블에 올바른 포인트 합계 저장
CREATE TEMP TABLE temp_correct_points AS
SELECT 
  supabase_user_id,
  SUM(points) as correct_total
FROM point_transactions
GROUP BY supabase_user_id;

-- user_points 테이블 업데이트
UPDATE user_points up
SET 
  total_points = tcp.correct_total,
  updated_at = NOW()
FROM temp_correct_points tcp
WHERE up.supabase_user_id = tcp.supabase_user_id;

-- 임시 테이블 삭제
DROP TABLE temp_correct_points;

-- 6. 확인 쿼리
-- 트리거 확인
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'point_transactions'::regclass
  AND tgname NOT LIKE 'pg_%';

-- 사용자별 포인트 확인
SELECT 
  up.supabase_user_id,
  up.total_points as displayed_points,
  COALESCE(SUM(pt.points), 0) as actual_points,
  CASE 
    WHEN up.total_points = COALESCE(SUM(pt.points), 0) THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as status
FROM user_points up
LEFT JOIN point_transactions pt ON up.supabase_user_id = pt.supabase_user_id
GROUP BY up.supabase_user_id, up.total_points
ORDER BY up.supabase_user_id;
