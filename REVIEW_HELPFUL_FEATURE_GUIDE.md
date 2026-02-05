# 리뷰 "도움돼요" 기능 구현 가이드

## 📋 개요

리뷰에 "도움돼요" 버튼을 추가하여 사용자들이 유용한 리뷰에 투표할 수 있는 기능입니다.

---

## 🗄️ 1. 데이터베이스 설정 (필수)

### Step 1: SQL 실행

**Supabase Dashboard > SQL Editor**에서 아래 SQL을 실행하세요:

```sql
-- =====================================================
-- review_helpful 테이블 생성
-- =====================================================

-- 테이블 생성
CREATE TABLE IF NOT EXISTS public.review_helpful (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT NOT NULL,
  supabase_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- 외래 키 제약 조건
  CONSTRAINT review_helpful_review_id_fkey 
    FOREIGN KEY (review_id) 
    REFERENCES public.agent_reviews(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT review_helpful_user_id_fkey 
    FOREIGN KEY (supabase_user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE,
    
  -- 같은 사용자가 같은 리뷰에 중복으로 "도움돼요"를 누를 수 없도록
  CONSTRAINT unique_user_review 
    UNIQUE (review_id, supabase_user_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id 
  ON public.review_helpful(review_id);

CREATE INDEX IF NOT EXISTS idx_review_helpful_user_id 
  ON public.review_helpful(supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_review_helpful_created_at 
  ON public.review_helpful(created_at DESC);

-- =====================================================
-- RLS 정책 설정
-- =====================================================

-- RLS 활성화
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view helpful counts"
  ON public.review_helpful
  FOR SELECT
  USING (true);

-- INSERT: 인증된 사용자만 추가 가능
CREATE POLICY "Authenticated users can add helpful"
  ON public.review_helpful
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- DELETE: 사용자가 자신의 "도움돼요"만 취소 가능
CREATE POLICY "Users can remove their own helpful"
  ON public.review_helpful
  FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);

-- =====================================================
-- agent_reviews 테이블에 helpful_count 컬럼 추가
-- =====================================================

ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS helpful_count INT DEFAULT 0;

-- =====================================================
-- 자동 카운트 업데이트 함수 및 트리거
-- =====================================================

-- 함수 생성
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE agent_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE agent_reviews
    SET helpful_count = GREATEST(helpful_count - 1, 0)
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_helpful_count_insert ON public.review_helpful;
CREATE TRIGGER trigger_update_helpful_count_insert
  AFTER INSERT ON public.review_helpful
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

DROP TRIGGER IF EXISTS trigger_update_helpful_count_delete ON public.review_helpful;
CREATE TRIGGER trigger_update_helpful_count_delete
  AFTER DELETE ON public.review_helpful
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- =====================================================
-- 기존 리뷰들의 helpful_count 초기화
-- =====================================================

UPDATE agent_reviews ar
SET helpful_count = (
  SELECT COUNT(*)
  FROM review_helpful rh
  WHERE rh.review_id = ar.id
);
```

### Step 2: 확인 쿼리

```sql
-- 테이블 생성 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'review_helpful'
ORDER BY ordinal_position;

-- RLS 정책 확인
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'review_helpful'
ORDER BY cmd;

-- agent_reviews에 helpful_count 컬럼 추가 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'agent_reviews'
  AND column_name = 'helpful_count';
```

**예상 결과**:
```
✓ review_helpful 테이블 생성됨
✓ RLS 정책 3개 (SELECT, INSERT, DELETE)
✓ agent_reviews.helpful_count 컬럼 추가됨
✓ 트리거 2개 생성됨
```

---

## 🎨 2. UI/UX 설명

### 버튼 상태

#### 미클릭 상태
```
┌─────────────────────┐
│ 👍 도움돼요 12      │  ← 흰색 배경, 보라색 텍스트
└─────────────────────┘
```

#### 클릭 후 (활성 상태)
```
┌─────────────────────┐
│ 👍 도움됐어요 13    │  ← 연한 보라색 배경, 진한 보라색 텍스트
└─────────────────────┘
```

### 동작

1. **로그인하지 않은 사용자**: 클릭 시 "로그인이 필요합니다." 알림
2. **로그인한 사용자**:
   - 첫 클릭: "도움돼요" → "도움됐어요" 변경, 카운트 +1
   - 재클릭: "도움됐어요" → "도움돼요" 변경, 카운트 -1 (토글)

---

## 🔧 3. 기술 구현 상세

### 데이터 흐름

```
사용자 클릭
  ↓
로그인 확인
  ↓
현재 상태 확인 (도움돼요를 눌렀는지)
  ↓
상태에 따라 INSERT 또는 DELETE
  ↓
트리거 자동 실행 → agent_reviews.helpful_count 업데이트
  ↓
UI 상태 업데이트 (즉시 반영)
```

### 주요 함수

#### `handleHelpfulClick(reviewId: string)`

```typescript
const handleHelpfulClick = async (reviewId: string) => {
  // 1. 로그인 확인
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    alert('로그인이 필요합니다.')
    return
  }

  // 2. 현재 상태 확인
  const isHelpful = userHelpfulReviews.has(reviewId)

  // 3. 토글 처리
  if (isHelpful) {
    // 도움돼요 취소
    await supabase
      .from('review_helpful')
      .delete()
      .eq('review_id', parseInt(reviewId))
      .eq('supabase_user_id', session.user.id)
  } else {
    // 도움돼요 추가
    await supabase
      .from('review_helpful')
      .insert({
        review_id: parseInt(reviewId),
        supabase_user_id: session.user.id
      })
  }

  // 4. 로컬 상태 업데이트 (즉시 UI 반영)
  // ...
}
```

### 상태 관리

- `userHelpfulReviews`: Set<string> - 현재 사용자가 "도움돼요"를 누른 리뷰 ID 목록
- `reviewHelpfulCounts`: Record<string, number> - 각 리뷰의 도움돼요 개수

---

## 📊 4. 데이터베이스 테이블 구조

### `review_helpful` 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | BIGSERIAL | 기본 키 |
| review_id | BIGINT | 리뷰 ID (FK → agent_reviews.id) |
| supabase_user_id | UUID | 사용자 ID (FK → auth.users.id) |
| created_at | TIMESTAMP | 등록 시간 |

**제약 조건**:
- `UNIQUE (review_id, supabase_user_id)`: 같은 사용자가 같은 리뷰에 중복으로 "도움돼요" 불가
- `ON DELETE CASCADE`: 리뷰 삭제 시 관련 "도움돼요" 자동 삭제

### `agent_reviews` 테이블 (업데이트)

추가된 컬럼:
- `helpful_count INT DEFAULT 0`: 해당 리뷰의 총 도움돼요 개수

---

## 🔐 5. RLS 정책

### SELECT 정책
- **대상**: 모든 사용자 (비로그인 포함)
- **목적**: 도움돼요 개수를 모두가 볼 수 있도록

### INSERT 정책
- **대상**: 인증된 사용자만
- **제약**: 자신의 `supabase_user_id`로만 추가 가능

### DELETE 정책
- **대상**: 자신이 추가한 것만 삭제 가능
- **제약**: `supabase_user_id = auth.uid()`

---

## 🧪 6. 테스트 시나리오

### 테스트 1: 로그인하지 않은 상태
1. 리뷰 모달 열기
2. "도움돼요" 버튼 클릭
3. 예상 결과: "로그인이 필요합니다." 알림

### 테스트 2: 로그인 후 도움돼요 추가
1. 로그인
2. 리뷰 모달 열기
3. "도움돼요" 버튼 클릭
4. 예상 결과:
   - 버튼 텍스트: "도움돼요" → "도움됐어요"
   - 버튼 배경색: 흰색 → 연한 보라색
   - 카운트: +1 증가

### 테스트 3: 도움돼요 취소
1. "도움됐어요" 상태에서 다시 클릭
2. 예상 결과:
   - 버튼 텍스트: "도움됐어요" → "도움돼요"
   - 버튼 배경색: 연한 보라색 → 흰색
   - 카운트: -1 감소

### 테스트 4: 중복 등록 방지
1. 같은 리뷰에 여러 번 "도움돼요" 시도
2. 예상 결과: 토글만 되고, DB에는 1개만 존재

### 테스트 5: 모달 닫고 다시 열기
1. 리뷰 모달 닫기
2. 다시 열기
3. 예상 결과: 이전 상태 유지 (도움됐어요 상태 유지)

### 테스트 6: 페이지 새로고침
1. 브라우저 새로고침
2. 리뷰 모달 열기
3. 예상 결과: DB에서 상태 로드, 이전 상태 유지

---

## 📈 7. 성능 최적화

### 인덱스
- `idx_review_helpful_review_id`: 특정 리뷰의 도움돼요 개수 조회 최적화
- `idx_review_helpful_user_id`: 사용자가 누른 도움돼요 목록 조회 최적화
- `idx_review_helpful_created_at`: 최근 도움돼요 목록 조회 최적화

### 캐싱
- `agent_reviews.helpful_count`: 매번 COUNT 쿼리를 실행하지 않고 캐싱된 값 사용
- 트리거로 자동 업데이트하여 데이터 정합성 유지

### 로컬 상태 관리
- 서버 응답을 기다리지 않고 즉시 UI 업데이트 (Optimistic Update)
- 오류 발생 시에만 원래 상태로 롤백

---

## 🐛 8. 예상 문제 및 해결

### 문제 1: "중복 키 오류" (23505)
**원인**: 같은 사용자가 같은 리뷰에 중복으로 INSERT 시도

**해결**:
```typescript
if (error.code === '23505') {
  alert('이미 도움돼요를 눌렀습니다.')
}
```

### 문제 2: "외래 키 제약 조건 위반"
**원인**: 존재하지 않는 `review_id` 또는 `supabase_user_id` 사용

**해결**: 
- 리뷰 ID 확인
- 로그인 세션 확인

### 문제 3: 카운트가 실제와 다름
**원인**: 트리거가 실행되지 않았거나 직접 UPDATE로 우회

**해결**: 
```sql
-- 수동으로 카운트 재계산
UPDATE agent_reviews ar
SET helpful_count = (
  SELECT COUNT(*)
  FROM review_helpful rh
  WHERE rh.review_id = ar.id
);
```

---

## 🚀 9. 배포 체크리스트

- [ ] `supabase/migrations/create_review_helpful.sql` 파일 실행
- [ ] RLS 정책 3개 생성 확인
- [ ] 트리거 2개 생성 확인
- [ ] `agent_reviews.helpful_count` 컬럼 추가 확인
- [ ] 로그인/비로그인 상태에서 테스트
- [ ] 모바일 환경에서 UI 테스트
- [ ] 성능 테스트 (1000개 이상 리뷰)

---

## 📝 10. SQL 쿼리 예제

### 특정 리뷰의 도움돼요 개수 조회
```sql
SELECT helpful_count
FROM agent_reviews
WHERE id = 123;
```

### 특정 사용자가 도움돼요를 누른 리뷰 목록
```sql
SELECT review_id
FROM review_helpful
WHERE supabase_user_id = 'user-uuid-here';
```

### 가장 많은 도움돼요를 받은 리뷰 TOP 10
```sql
SELECT 
  ar.id,
  ar.review_text,
  ar.helpful_count,
  am.agent_name
FROM agent_reviews ar
LEFT JOIN agent_master am ON ar.agent_id = am.id
ORDER BY ar.helpful_count DESC
LIMIT 10;
```

### 특정 기간 동안 추가된 도움돼요
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count
FROM review_helpful
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🎯 11. 다음 단계

1. **통계 페이지**: 가장 많은 도움돼요를 받은 리뷰 표시
2. **알림 기능**: 내 리뷰가 도움돼요를 받았을 때 알림
3. **정렬 기능**: 도움돼요 많은 순으로 리뷰 정렬
4. **배지 시스템**: 도움돼요를 많이 받은 사용자에게 배지 부여

---

완료! 🎉

