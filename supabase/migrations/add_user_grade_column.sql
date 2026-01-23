-- users 테이블에 user_grade 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS user_grade VARCHAR(50) DEFAULT 'IMJANG';

-- 기존 사용자들에게 기본 등급 설정
UPDATE public.users 
SET user_grade = 'IMJANG' 
WHERE user_grade IS NULL;

-- 코멘트 추가
COMMENT ON COLUMN public.users.user_grade IS '사용자 등급 (IMJANG, INJU, MYUNGDANG, GOD)';
