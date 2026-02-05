# 🚨 긴급: DB 접속 문제 해결 가이드

## 📋 증상
- DB 접속이 안 됨
- RLS 정책이 없는 테이블 2개 (access_logs, agent_comments)

---

## 🔍 문제 진단

### 1단계: 어떤 오류가 발생하나요?

브라우저 콘솔(F12)에서 확인:
- ❌ `403 Forbidden` → RLS 정책 문제
- ❌ `400 Bad Request` → 쿼리 문제
- ❌ `500 Internal Server Error` → 서버 문제
- ❌ `timeout` → 네트워크/성능 문제
- ❌ `ECONNREFUSED` → Supabase 서비스 다운

### 2단계: Supabase 상태 확인

1. **Supabase Dashboard 접속 가능?**
   - ✅ 가능 → Supabase 서비스는 정상
   - ❌ 불가능 → Supabase 서비스 이슈

2. **SQL Editor에서 쿼리 실행 가능?**
   ```sql
   SELECT NOW();
   ```
   - ✅ 가능 → DB는 살아있음
   - ❌ 불가능 → DB 서버 문제

---

## 🚀 즉시 실행 (우선순위 1)

### RLS 정책 추가 (가장 가능성 높은 원인)

**Supabase Dashboard > SQL Editor**에서 즉시 실행:

```sql
-- =====================================================
-- access_logs 테이블 RLS 정책 추가
-- =====================================================

-- 1. 기존 정책 확인
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'access_logs';

-- 2. 정책 추가

-- SELECT: 관리자만 조회 가능
CREATE POLICY "Admins can view access logs"
  ON public.access_logs
  FOR SELECT
  USING (
    (SELECT auth.uid()) IN (
      SELECT supabase_user_id 
      FROM users 
      WHERE user_type = 'ADMIN'
    )
  );

-- INSERT: 모든 인증된 사용자가 로그 생성 가능
CREATE POLICY "Authenticated users can create logs"
  ON public.access_logs
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = supabase_user_id
  );

-- =====================================================
-- agent_comments 테이블 RLS 정책 추가
-- =====================================================

-- 1. 기존 정책 확인
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'agent_comments';

-- 2. 정책 추가

-- SELECT: 모든 사용자가 댓글 조회 가능
CREATE POLICY "Anyone can view comments"
  ON public.agent_comments
  FOR SELECT
  USING (true);

-- INSERT: 인증된 사용자가 댓글 작성 가능
CREATE POLICY "Authenticated users can create comments"
  ON public.agent_comments
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = supabase_user_id
  );

-- UPDATE: 자신의 댓글만 수정 가능
CREATE POLICY "Users can update own comments"
  ON public.agent_comments
  FOR UPDATE
  USING ((SELECT auth.uid()) = supabase_user_id)
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- DELETE: 자신의 댓글 또는 관리자가 삭제 가능
CREATE POLICY "Users and admins can delete comments"
  ON public.agent_comments
  FOR DELETE
  USING (
    (SELECT auth.uid()) = supabase_user_id
    OR
    (SELECT auth.uid()) IN (
      SELECT supabase_user_id 
      FROM users 
      WHERE user_type = 'ADMIN'
    )
  );

-- =====================================================
-- 3. 정책 확인
-- =====================================================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('access_logs', 'agent_comments')
ORDER BY tablename, cmd, policyname;
```

---

## 🔧 추가 진단 및 해결

### Option 1: 연결 풀 확인

```sql
-- 현재 활성 연결 수 확인
SELECT 
  count(*) as active_connections,
  max_connections
FROM (
  SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
) a,
  (SELECT setting::int as max_connections FROM pg_settings WHERE name = 'max_connections') b;

-- 오래된 연결 종료 (신중하게!)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

### Option 2: 문제가 되는 쿼리 확인

```sql
-- 실행 중인 느린 쿼리 확인
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '5 seconds'
ORDER BY duration DESC;
```

### Option 3: 캐시 무효화

**브라우저에서**:
1. 완전 새로고침: `Ctrl + Shift + R`
2. 캐시 삭제: 개발자 도구(F12) > Application > Clear storage

**Next.js 빌드 캐시 삭제**:
```powershell
# PowerShell에서 실행
Remove-Item -Recurse -Force .next
npm run dev
```

### Option 4: Supabase 키 확인

`.env.local` 파일 확인:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 🧪 테스트

### 1. Supabase Dashboard에서 직접 테스트

```sql
-- 1. 인증 없이 조회 (실패해야 정상)
SELECT * FROM access_logs LIMIT 1;
-- 예상: 0 rows (정책으로 차단됨)

-- 2. agent_reviews 조회 (성공해야 함)
SELECT * FROM agent_reviews LIMIT 1;
-- 예상: 데이터 표시

-- 3. favorite_agents 조회 (성공해야 함)
SELECT * FROM favorite_agents LIMIT 1;
-- 예상: 데이터 표시
```

### 2. 브라우저에서 테스트

1. 로그아웃
2. 로그인
3. 부동산 검색
4. 관심 등록
5. 리뷰 조회

---

## 📊 체크리스트

### 즉시 확인
- [ ] Supabase Dashboard 접속 가능?
- [ ] SQL Editor에서 `SELECT NOW();` 실행 가능?
- [ ] 브라우저 콘솔에 어떤 오류 메시지?
- [ ] `.env.local` 파일에 올바른 키?

### RLS 정책 추가 후
- [ ] access_logs 정책 2개 생성됨?
- [ ] agent_comments 정책 4개 생성됨?
- [ ] 브라우저 새로고침 후 접속 가능?

### 추가 조치
- [ ] `.next` 폴더 삭제 후 재시작?
- [ ] 브라우저 캐시 삭제?
- [ ] 로그아웃 → 재로그인?

---

## ⚠️ 긴급 연락처

**Supabase Support**:
- Dashboard > Support
- https://supabase.com/support

**일반적인 해결 시간**:
- RLS 정책 추가: 1분
- 캐시 삭제: 2분
- 빌드 재시작: 3-5분

---

## 💡 가장 가능성 높은 원인

### 1. RLS 정책 누락 (90% 확률)
```
access_logs, agent_comments 테이블에 RLS는 켜져있지만
정책이 없어서 모든 접근이 차단됨
→ 즉시 정책 추가 필요!
```

### 2. 최근 변경사항
```
review_helpful, favorite_agents 기능 추가 후
다른 테이블들이 영향을 받았을 가능성
→ 전체 RLS 정책 재확인 필요
```

---

## 🚀 권장 실행 순서

### 1단계: RLS 정책 추가 (30초)
```sql
-- 위의 SQL을 Supabase Dashboard에서 실행
```

### 2단계: 브라우저 새로고침 (10초)
```
Ctrl + Shift + R
```

### 3단계: 테스트 (1분)
```
로그인 → 검색 → 상세 보기 → 관심 등록
```

### 4단계: 여전히 안 되면 (5분)
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

---

**지금 바로 RLS 정책 SQL을 실행해보세요!**

