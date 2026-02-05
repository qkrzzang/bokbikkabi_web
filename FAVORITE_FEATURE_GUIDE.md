# 관심 부동산 기능 가이드

## 🎯 구현된 기능

### 1. 리뷰 등록 제한 (한 달 최대 3건)
- **파일**: `components/CameraButton.tsx`
- **위치**: `handleReviewSubmit` 함수 초반
- **로직**: 
  ```typescript
  // 최근 한 달 내 리뷰 개수 확인
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  
  // 3건 이상이면 등록 차단
  if (reviewCount >= 3) {
    alert('한 달에 최대 3건의 리뷰만 등록할 수 있습니다.')
    return
  }
  ```

### 2. 핵심 요약 기능 제거
- **파일**: `components/PropertyDetailModal.tsx`
- **변경사항**:
  - 로그인/비로그인 사용자 모두에게서 "핵심 요약" 섹션 제거
  - `property.keySummary` 속성은 그대로 유지 (향후 사용 가능)

### 3. 관심 등록 기능
- **파일**: 
  - `components/PropertyDetailModal.tsx` (UI 및 로직)
  - `components/PropertyDetailModal.module.css` (스타일)
- **데이터베이스**: `favorite_agents` 테이블 (이미 존재)

---

## 📊 데이터베이스 구조

### favorite_agents 테이블
```sql
CREATE TABLE public.favorite_agents (
  id BIGSERIAL PRIMARY KEY,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id BIGINT NOT NULL REFERENCES public.agent_master(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_favorite_agents_user_agent UNIQUE (supabase_user_id, agent_id)
);

-- 인덱스
CREATE INDEX idx_favorite_agents_user ON favorite_agents(supabase_user_id, created_at DESC);
CREATE INDEX idx_favorite_agents_agent ON favorite_agents(agent_id, created_at DESC);
```

### RLS 정책 확인
Supabase Dashboard > SQL Editor에서 실행:

```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'favorite_agents';

-- 정책 확인
SELECT policyname, cmd, qual::text, with_check::text
FROM pg_policies
WHERE tablename = 'favorite_agents'
ORDER BY cmd;
```

**필요한 정책**:
1. SELECT: 사용자 자신의 관심 목록만 조회
2. INSERT: 사용자가 자신의 관심 등록
3. DELETE: 사용자가 자신의 관심 해제

### RLS 정책이 없거나 문제가 있을 경우

```sql
-- RLS 활성화
ALTER TABLE public.favorite_agents ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can read their own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorite_agents;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorite_agents;

-- SELECT 정책
CREATE POLICY "Users can read their own favorites"
  ON public.favorite_agents
  FOR SELECT
  USING ((SELECT auth.uid()) = supabase_user_id);

-- INSERT 정책
CREATE POLICY "Users can insert their own favorites"
  ON public.favorite_agents
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = supabase_user_id);

-- DELETE 정책
CREATE POLICY "Users can delete their own favorites"
  ON public.favorite_agents
  FOR DELETE
  USING ((SELECT auth.uid()) = supabase_user_id);
```

---

## 🎨 UI/UX

### 관심 등록 버튼 (하트)
- **위치**: 부동산 상세 모달 헤더 우측
- **상태**:
  - 비활성: 빈 하트 (회색 테두리)
  - 활성: 채워진 하트 (빨간색)
- **동작**:
  - 클릭 시 관심 등록/해제 토글
  - 로그인하지 않은 경우: "로그인이 필요합니다" 알림

### 스타일
```css
.favoriteButton {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  /* 기본: 회색 */
  border: 2px solid #e1e8f0;
  color: #94a3b8;
}

.favoriteButton:hover {
  /* 호버: 빨간색 */
  border-color: #f43f5e;
  color: #f43f5e;
}

.favoriteActive {
  /* 활성: 빨간색 배경 */
  background-color: #fef2f2;
  border-color: #f43f5e;
  color: #f43f5e;
}
```

---

## 🔄 동작 흐름

### 1. 모달 열릴 때
```typescript
useEffect(() => {
  // 1. 로그인 확인
  // 2. 리뷰 개수 확인
  // 3. 관심 등록 여부 확인
  const { data } = await supabase
    .from('favorite_agents')
    .select('id')
    .eq('supabase_user_id', userId)
    .eq('agent_id', agentId)
    .single()
  
  setIsFavorite(!!data)
}, [isOpen, property])
```

### 2. 관심 등록/해제
```typescript
const handleFavoriteToggle = async () => {
  if (isFavorite) {
    // 해제
    await supabase
      .from('favorite_agents')
      .delete()
      .eq('supabase_user_id', userId)
      .eq('agent_id', agentId)
  } else {
    // 등록
    await supabase
      .from('favorite_agents')
      .insert({ supabase_user_id: userId, agent_id: agentId })
  }
  
  setIsFavorite(!isFavorite)
}
```

---

## 📝 다음 단계 (TODO)

### 내 관심 부동산 화면 구현
현재 `components/Sidebar.tsx`의 "내 관심 부동산" 화면은 "준비 중"입니다.

**구현 예시**:
```typescript
// Sidebar.tsx에 추가
const [favoriteAgents, setFavoriteAgents] = useState<any[]>([])

const loadFavorites = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { data, error } = await supabase
    .from('favorite_agents')
    .select(`
      *,
      agent:agent_master(agent_name, road_address, lot_address)
    `)
    .eq('supabase_user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (!error && data) {
    setFavoriteAgents(data)
  }
}

// 화면 표시
{currentScreen === 'favorites' && (
  <div className={styles.screenContent}>
    {favoriteAgents.map(favorite => (
      <div key={favorite.id}>
        {favorite.agent?.agent_name}
      </div>
    ))}
  </div>
)}
```

---

## 🧪 테스트 시나리오

### 1. 리뷰 등록 제한 테스트
1. 한 달 내 3건의 리뷰 등록
2. 4번째 리뷰 등록 시도 → "한 달에 최대 3건..." 메시지 확인

### 2. 관심 등록 테스트
1. 로그인하지 않은 상태에서 하트 버튼이 보이지 않는지 확인
2. 로그인 후 하트 버튼 클릭 → 빨간색으로 변경 확인
3. 다시 클릭 → 회색으로 변경 확인
4. 모달 닫고 다시 열기 → 상태 유지 확인

### 3. RLS 정책 테스트
```sql
-- 테스트 쿼리 (Supabase Dashboard에서 실행)
-- 자신의 관심 목록만 보이는지 확인
SELECT * FROM favorite_agents;

-- 다른 사용자의 관심 등록 시도 (실패해야 함)
INSERT INTO favorite_agents (supabase_user_id, agent_id)
VALUES ('다른사용자UUID', 1);
```

---

## 🚀 배포 체크리스트

- [x] 리뷰 등록 제한 구현
- [x] 핵심 요약 제거
- [x] 관심 등록 UI 구현
- [x] 관심 등록/해제 로직 구현
- [x] CSS 스타일링
- [ ] RLS 정책 확인 및 적용
- [ ] 내 관심 부동산 화면 구현 (차후)
- [ ] 실제 환경 테스트

