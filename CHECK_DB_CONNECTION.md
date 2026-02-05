# DB 접근 문제 체크리스트

## 1. 브라우저 콘솔 확인
브라우저에서 F12를 눌러 개발자 도구를 열고 Console 탭에서 에러를 확인하세요.

### 확인할 에러 유형:
- `403 Forbidden` - RLS 정책 문제
- `400 Bad Request` - 쿼리 구문 문제
- `Network Error` - Supabase 연결 문제
- `[PropertyDetailModal] 리뷰 개수 조회 실패:` - 디버그 메시지

## 2. Supabase RLS 정책 확인
Supabase Dashboard > SQL Editor에서 실행:

```sql
-- agent_reviews 테이블 RLS 정책 확인
SELECT 
    tablename,
    policyname,
    cmd,
    qual::text as using_clause
FROM pg_policies
WHERE tablename = 'agent_reviews'
ORDER BY cmd;
```

**예상 결과**: 4개의 정책이 있어야 합니다
- SELECT: "Agent reviews are viewable by everyone"
- INSERT: "Users can insert own reviews"
- UPDATE: "Users can update own reviews"
- DELETE: "Users can delete own reviews"

## 3. RLS 정책이 없거나 부족한 경우
Supabase Dashboard > SQL Editor에서 실행:

```sql
-- RLS 정책 재설정
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent reviews are viewable by everyone" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.agent_reviews;

CREATE POLICY "Agent reviews are viewable by everyone"
  ON public.agent_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reviews"
  ON public.agent_reviews FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

CREATE POLICY "Users can update own reviews"
  ON public.agent_reviews FOR UPDATE
  USING ((SELECT auth.uid()) = supabase_user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.agent_reviews FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);
```

## 4. agent_master 테이블도 확인
```sql
-- agent_master 테이블 RLS 정책 확인
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'agent_master';
```

**정책이 없다면**:
```sql
ALTER TABLE public.agent_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent master viewable by everyone" ON public.agent_master;

CREATE POLICY "Agent master viewable by everyone"
  ON public.agent_master FOR SELECT
  USING (true);
```

## 5. 환경 변수 확인
`.env.local` 파일에 다음 값들이 올바르게 설정되어 있는지 확인:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 6. 브라우저 캐시 클리어
1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭 선택
3. "Disable cache" 체크
4. 완전 새로고침 (Ctrl + Shift + R)

## 7. 재로그인
1. 로그아웃
2. 브라우저 캐시 클리어
3. 재로그인
4. 부동산 검색 후 상세 모달 열기

## 8. 디버그 로그 확인
브라우저 콘솔에서 다음 메시지를 찾으세요:
```
[PropertyDetailModal] 사용자 리뷰 개수: X
```

- 숫자가 0이면: RLS 정책 문제
- 숫자가 7이면: 정상 (리뷰가 보여야 함)
- 에러 메시지가 있으면: 해당 에러 내용 확인

## 9. Network 탭 확인
1. 브라우저 개발자 도구 > Network 탭
2. 부동산 상세 모달 열기
3. `agent_reviews` 요청 찾기
4. 응답 코드 확인:
   - 200: 정상
   - 400: 쿼리 문제
   - 403: RLS 정책 문제
   - 500: 서버 에러

## 10. Supabase Dashboard에서 직접 테스트
Supabase Dashboard > Table Editor > agent_reviews 테이블에서:
- 데이터가 보이는지 확인
- RLS가 활성화되어 있는지 확인 (테이블 설정)

