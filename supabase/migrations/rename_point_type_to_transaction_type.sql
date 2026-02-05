-- ================================================
-- point_type 컬럼명을 transaction_type으로 변경
-- ================================================
-- 작성일: 2026-02-05
-- 설명: point_transactions 테이블의 point_type 컬럼을
--       transaction_type으로 변경하여 코드와 일관성 유지

-- 1. 컬럼명 변경
ALTER TABLE point_transactions
  RENAME COLUMN point_type TO transaction_type;

-- 2. 인덱스 이름 변경
DROP INDEX IF EXISTS idx_point_transactions_type;
CREATE INDEX idx_point_transactions_type 
  ON point_transactions(transaction_type);

-- 3. 확인 쿼리
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'point_transactions'
  AND column_name = 'transaction_type';

-- 예상 결과:
-- column_name       | data_type       | is_nullable
-- ------------------|-----------------|-------------
-- transaction_type  | character varying | NO
