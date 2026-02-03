-- =====================================================
-- qkrzzang13@kakao.com 계정의 리뷰 확인
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1. 이메일로 사용자 정보 확인
SELECT 
    id as supabase_user_id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'qkrzzang13@kakao.com';

-- 2. 해당 사용자의 리뷰 개수 확인 (RLS 무시)
SELECT 
    COUNT(*) as review_count
FROM public.agent_reviews
WHERE supabase_user_id = (
    SELECT id FROM auth.users WHERE email = 'qkrzzang13@kakao.com'
);

-- 3. 해당 사용자의 리뷰 목록 (최근 10건)
SELECT 
    ar.id,
    ar.supabase_user_id,
    ar.agent_id,
    ar.created_at,
    ar.review_text,
    am.agent_name
FROM public.agent_reviews ar
LEFT JOIN public.agent_master am ON ar.agent_id = am.id
WHERE ar.supabase_user_id = (
    SELECT id FROM auth.users WHERE email = 'qkrzzang13@kakao.com'
)
ORDER BY ar.created_at DESC
LIMIT 10;

-- 4. agent_reviews 테이블의 RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'agent_reviews'
ORDER BY cmd;

-- 5. 테스트: RLS 정책 적용 상태에서 카운트 쿼리 (인증된 사용자로)
-- 이 쿼리는 실제 앱에서 실행되는 것과 동일한 방식
SELECT COUNT(*) as review_count
FROM public.agent_reviews
WHERE supabase_user_id = auth.uid();

