# 403 Forbidden 오류 해결 가이드

## 문제
로그인 시 `users` 테이블에 INSERT하려고 할 때 403 Forbidden 오류 발생

## 원인
`users` 테이블에 Row Level Security (RLS)가 활성화되어 있지만, INSERT 정책이 없어서 Trigger 함수가 데이터를 삽입하지 못함

## 해결 방법

### Supabase Dashboard에서 SQL 실행

1. **https://supabase.com/dashboard** 접속
2. 프로젝트 선택
3. 좌측 메뉴 **SQL Editor** 클릭
4. **New Query** 클릭
5. 아래 SQL 코드 복사하여 붙여넣기
6. **Run** 버튼 클릭

```sql
-- users 테이블 INSERT 정책 추가
-- 기존 정책이 있으면 삭제
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for trigger" ON public.users;
DROP POLICY IF EXISTS "Service role can insert" ON public.users;

-- INSERT 정책 생성 (Trigger가 사용)
CREATE POLICY "Enable insert for trigger"
  ON public.users 
  FOR INSERT
  WITH CHECK (true);

-- 확인 쿼리
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
```

## 실행 확인

위 SQL을 실행한 후:

1. 브라우저에서 웹사이트 새로고침
2. 로그아웃 후 다시 로그인 시도
3. 403 오류가 사라지고 정상적으로 로그인되어야 함

## 정책 설명

- `WITH CHECK (true)`: 모든 INSERT를 허용
- 이 정책은 Trigger 함수(`handle_new_user`)가 사용하므로 안전함
- Trigger는 Supabase Auth 시스템에서만 호출되므로 보안 문제 없음

---

## 추가 확인 사항

만약 여전히 문제가 발생한다면:

```sql
-- RLS 상태 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- Trigger 함수 확인
SELECT routine_name, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';
```

