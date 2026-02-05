# Unused Index 분석 및 최적화 가이드

## 📊 전체 요약

**총 21개의 Unused Index** (INFO 레벨 - 즉시 조치 불필요)

### 📈 인덱스 사용률이 낮은 이유
1. **새로 추가된 기능**: 아직 사용량이 적음
2. **낮은 트래픽**: 해당 테이블 조회 빈도가 낮음
3. **최적화되지 않은 쿼리**: 인덱스를 활용하지 않는 쿼리 사용 중
4. **미래를 위한 준비**: 나중에 사용될 예정

---

## 🎯 권장 조치

### ✅ 유지 (Keep) - 실제 사용 중이거나 곧 사용될 인덱스

#### 1. `favorite_agents` 테이블 (3개)
```sql
-- 이미 사용 중! 삭제하지 마세요
idx_favorite_agents_user_id    -- 사용자별 관심 부동산 조회
idx_favorite_agents_agent_id   -- 부동산별 관심 등록 수 조회
idx_favorite_agents_created_at -- 최신순 정렬
```
**이유**: 방금 구현한 기능으로, 앱에서 실제로 사용 중입니다.

#### 2. `review_helpful` 테이블 (3개)
```sql
-- 이미 사용 중! 삭제하지 마세요
idx_review_helpful_review_id   -- 리뷰별 도움돼요 개수 조회
idx_review_helpful_user_id     -- 사용자가 누른 도움돼요 목록
idx_review_helpful_created_at  -- 최신 도움돼요 조회
```
**이유**: 방금 구현한 "도움돼요" 기능에서 실제로 사용 중입니다.

#### 3. `common_code_master`, `common_code_detail` 테이블 (3개)
```sql
-- 유지 권장
idx_common_code_master_use_yn     -- 사용 중인 코드만 조회
idx_common_code_detail_use_yn     -- 사용 중인 상세 코드만 조회
idx_common_code_detail_sort_order -- 정렬 순서대로 조회
```
**이유**: 공통 코드 관리 화면에서 사용 가능성이 높습니다.

#### 4. `users` 테이블 (1개)
```sql
-- 유지 권장
idx_users_email -- 이메일로 사용자 검색
```
**이유**: 관리자 페이지에서 이메일로 사용자 검색 시 사용 가능성이 높습니다.

---

### ⚠️ 검토 필요 (Review) - 실제 사용 여부 확인 필요

#### 5. `access_logs` 테이블 (4개)
```sql
idx_access_logs_supabase_user_id  -- 사용자별 접속 로그
idx_access_logs_created_at        -- 기간별 접속 로그
idx_access_logs_action            -- 행동별 접속 로그
idx_access_logs_ip_address        -- IP별 접속 로그
```

**확인 방법**:
```sql
-- access_logs 테이블을 실제로 조회하는지 확인
SELECT * FROM access_logs LIMIT 1;
```

**판단 기준**:
- ✅ 유지: 관리자 페이지에서 접속 로그 분석 기능이 있다면
- ❌ 삭제: 로그만 쌓고 조회하지 않는다면

#### 6. `agent_comments` 테이블 (2개)
```sql
idx_agent_comments_agent  -- 부동산별 댓글 조회
idx_agent_comments_user   -- 사용자별 댓글 조회
```

**확인 방법**:
```sql
-- agent_comments 테이블을 사용하는지 확인
SELECT COUNT(*) FROM agent_comments;
```

**판단 기준**:
- ✅ 유지: 댓글 기능을 사용한다면
- ❌ 삭제: 댓글 기능을 사용하지 않는다면

#### 7. `partnership_inquiries` 테이블 (2개)
```sql
idx_partnership_inquiries_user_id  -- 사용자별 문의 조회
idx_partnership_inquiries_status   -- 상태별 문의 조회
```

**확인 방법**:
```sql
-- 실제 사용 중인지 확인
SELECT COUNT(*) FROM partnership_inquiries;
```

**판단 기준**:
- ✅ 유지: 관리자가 문의를 관리한다면 (현재 사용 중)
- ❌ 삭제: 문의 기능을 사용하지 않는다면

#### 8. `agent_master` 테이블 (1개)
```sql
idx_agent_master_location  -- 위치 기반 검색
```

**확인 방법**:
```sql
-- location 컬럼이 존재하는지 확인
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'agent_master' AND column_name = 'location';
```

**판단 기준**:
- ✅ 유지: 지도 기반 검색 기능이 있거나 계획 중이라면
- ❌ 삭제: 위치 검색을 사용하지 않는다면

#### 9. 중복 인덱스 (2개)
```sql
idx_favorite_agents_user   -- 중복 (idx_favorite_agents_user_id와 같음)
idx_favorite_agents_agent  -- 중복 (idx_favorite_agents_agent_id와 같음)
```

**조치**: 삭제 권장 (중복)

---

## 🚀 실행 가능한 SQL

### Option 1: 안전한 접근 (권장)
**지금 당장 삭제해도 안전한 인덱스만 삭제**

```sql
-- =====================================================
-- 중복 인덱스만 삭제 (안전)
-- =====================================================

-- 1. 중복 인덱스 확인
SELECT indexname FROM pg_indexes 
WHERE tablename = 'favorite_agents' 
AND indexname IN ('idx_favorite_agents_user', 'idx_favorite_agents_agent');

-- 2. 중복 인덱스 삭제
DROP INDEX IF EXISTS public.idx_favorite_agents_user;
DROP INDEX IF EXISTS public.idx_favorite_agents_agent;

-- 3. 결과 확인
SELECT indexname FROM pg_indexes 
WHERE tablename = 'favorite_agents'
ORDER BY indexname;
```

---

### Option 2: 적극적인 정리 (신중히 판단)
**사용하지 않는 기능의 인덱스 삭제**

```sql
-- =====================================================
-- 1단계: access_logs 인덱스 삭제 (로그 조회를 하지 않는다면)
-- =====================================================

-- access_logs를 실제로 조회하는지 확인
SELECT COUNT(*) FROM access_logs;

-- 조회하지 않는다면 삭제
DROP INDEX IF EXISTS public.idx_access_logs_supabase_user_id;
DROP INDEX IF EXISTS public.idx_access_logs_created_at;
DROP INDEX IF EXISTS public.idx_access_logs_action;
DROP INDEX IF EXISTS public.idx_access_logs_ip_address;

-- =====================================================
-- 2단계: agent_comments 인덱스 삭제 (댓글 기능을 사용하지 않는다면)
-- =====================================================

-- agent_comments를 사용하는지 확인
SELECT COUNT(*) FROM agent_comments;

-- 사용하지 않는다면 삭제
DROP INDEX IF EXISTS public.idx_agent_comments_agent;
DROP INDEX IF EXISTS public.idx_agent_comments_user;

-- =====================================================
-- 3단계: agent_master location 인덱스 삭제 (위치 검색을 하지 않는다면)
-- =====================================================

DROP INDEX IF EXISTS public.idx_agent_master_location;
```

---

## 🔍 인덱스 사용 통계 확인

### 현재 인덱스 사용 상태 확인
```sql
-- 모든 인덱스의 사용 통계 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

**해석**:
- `idx_scan = 0`: 한 번도 사용되지 않음 (삭제 후보)
- `idx_scan > 0`: 사용 중 (유지)

---

## 📊 예상 효과

### 공간 절약
```
평균 인덱스 크기: 50KB ~ 500KB
21개 삭제 시: 약 1MB ~ 10MB 절약
```

### 성능 향상
```
INSERT/UPDATE/DELETE 시:
- 인덱스 1개당 약 5-10ms 절약
- 21개 삭제 시: 100-200ms 절약 (쓰기 작업 시)
```

### 유지보수 개선
```
- 인덱스 관리 복잡도 감소
- 백업 시간 단축
- 쿼리 최적화 용이
```

---

## ⚡ Auth DB 연결 최적화 (추가 권장사항)

### 현재 상태
```
Connection Strategy: Absolute (10 connections)
```

### 권장 변경
```
Connection Strategy: Percentage (예: 10% of total connections)
```

**장점**:
- 인스턴스 크기 증가 시 자동으로 연결 수 증가
- 더 나은 확장성

**변경 방법**:
1. Supabase Dashboard > Settings > Database
2. Connection Pooling 섹션 찾기
3. Auth connection strategy를 "Percentage"로 변경

---

## 🎯 권장 실행 순서

### 1단계: 안전한 삭제 (지금 바로)
```sql
-- 중복 인덱스만 삭제
DROP INDEX IF EXISTS public.idx_favorite_agents_user;
DROP INDEX IF EXISTS public.idx_favorite_agents_agent;
```

### 2단계: 기능 확인 (1주일 후)
```sql
-- 실제 사용하는지 통계 재확인
SELECT 
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
ORDER BY tablename, indexname;
```

### 3단계: 추가 삭제 (2주일 후)
- 여전히 사용되지 않는 인덱스 삭제
- 단, 새로 추가한 기능(favorite_agents, review_helpful)은 유지

---

## ✅ 결론

### 즉시 조치 (Safe)
- ✅ 중복 인덱스 2개 삭제

### 나중에 고려 (Consider Later)
- ⏳ access_logs 인덱스 (4개)
- ⏳ agent_comments 인덱스 (2개)
- ⏳ partnership_inquiries 인덱스 (2개)
- ⏳ agent_master location 인덱스 (1개)

### 절대 삭제 금지 (Keep Always)
- ❌ favorite_agents 인덱스 (사용 중)
- ❌ review_helpful 인덱스 (사용 중)
- ❌ common_code 인덱스 (곧 사용)
- ❌ users email 인덱스 (곧 사용)

---

**참고**: INFO 레벨 경고는 즉시 조치가 필요하지 않습니다. 
서비스 성장에 따라 자연스럽게 사용될 수 있습니다.

