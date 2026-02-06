# 🔐 인증 시스템 개선 가이드

## 개선된 인증 시스템 구조

```
contexts/
  └── AuthContext.tsx          # 중앙화된 인증 상태 관리
lib/
  └── api/
      └── interceptor.ts       # API 에러 처리 및 인터셉터
components/
  └── AuthGuard.tsx           # 인증 가드 컴포넌트
```

---

## 📋 사용 방법

### 1. useAuth Hook 사용 (기본)

```tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function MyComponent() {
  const { user, userType, isLoading, signOut } = useAuth()

  if (isLoading) return <div>로딩 중...</div>

  return (
    <div>
      {user ? (
        <>
          <p>환영합니다, {user.email}님!</p>
          <p>권한: {userType}</p>
          <button onClick={signOut}>로그아웃</button>
        </>
      ) : (
        <p>로그인이 필요합니다.</p>
      )}
    </div>
  )
}
```

### 2. AuthGuard 컴포넌트 사용 (페이지 보호)

```tsx
'use client'

import { AuthGuard } from '@/components/AuthGuard'

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <div>
        <h1>로그인한 사용자만 볼 수 있는 페이지</h1>
        {/* 보호된 컨텐츠 */}
      </div>
    </AuthGuard>
  )
}
```

#### 관리자 전용 페이지

```tsx
<AuthGuard requireAdmin redirectTo="/">
  <AdminPanel />
</AuthGuard>
```

### 3. useAuthCheck Hook 사용 (함수 내부에서 체크)

```tsx
'use client'

import { useAuthCheck } from '@/components/AuthGuard'

export default function MyComponent() {
  const checkAuth = useAuthCheck({ showAlert: true })

  const handleProtectedAction = async () => {
    // 인증 체크 - 실패 시 자동으로 alert 및 리다이렉트
    if (!checkAuth()) return

    // 인증된 사용자만 실행되는 로직
    console.log('인증된 사용자만 실행')
  }

  return (
    <button onClick={handleProtectedAction}>
      보호된 액션 실행
    </button>
  )
}
```

### 4. API 인터셉터 사용

```tsx
import { apiRequest } from '@/lib/api/interceptor'
import { supabase } from '@/lib/supabase/client'

// 기존 방식 (❌ 개선 전)
const loadData = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    alert('로그인이 필요합니다.')
    return
  }

  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('user_id', session.user.id)

  if (error) {
    console.error(error)
    alert('데이터 로드 실패')
  }
}

// 개선된 방식 (✅ 개선 후)
const loadData = async () => {
  const { data, error } = await apiRequest(
    () => supabase
      .from('my_table')
      .select('*')
      .eq('user_id', supabase.auth.getUser()),
    {
      requireAuth: true,
      showErrorAlert: true,
      onAuthError: () => router.push('/login')
    }
  )

  if (error) {
    // 에러는 이미 처리됨
    return
  }

  // data 사용
  console.log(data)
}
```

---

## 🔄 기존 컴포넌트 마이그레이션

### Before (개선 전) - Sidebar.tsx

```tsx
const [user, setUser] = useState<User | null>(null)

useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
    }
  }
  checkAuth()
}, [])

const loadUserPoints = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { data, error } = await supabase
    .from('user_points')
    .select('total_points')
    .eq('supabase_user_id', session.user.id)
    .maybeSingle()

  if (!error && data) {
    setUserPoints(data.total_points || 0)
  }
}
```

### After (개선 후) - Sidebar.tsx

```tsx
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/lib/api/interceptor'

const { user } = useAuth()  // 중앙화된 상태 사용

const loadUserPoints = async () => {
  // 인증 체크 및 에러 처리가 자동화됨
  const { data, error } = await apiRequest(
    () => supabase
      .from('user_points')
      .select('total_points')
      .eq('supabase_user_id', user!.id)
      .maybeSingle(),
    { requireAuth: true }
  )

  if (data) {
    setUserPoints(data.total_points || 0)
  }
}
```

---

## 📊 개선 효과

### 1. 코드 중복 제거
- **개선 전**: 18개 파일에서 `getSession()` 중복 호출
- **개선 후**: 1개의 AuthContext에서 중앙 관리 ✅

### 2. 보안 강화
- **개선 전**: alert()만 표시하고 페이지 접근 허용
- **개선 후**: 자동 리다이렉트 및 페이지 보호 ✅

### 3. 사용자 경험 개선
- **개선 전**: 각 컴포넌트에서 독립적으로 로딩 상태 표시
- **개선 후**: 전역 로딩 상태로 일관된 UX ✅

### 4. 유지보수성 향상
- **개선 전**: 인증 로직 변경 시 18개 파일 수정 필요
- **개선 후**: AuthContext만 수정하면 전체 적용 ✅

### 5. 타입 안정성 향상
- **개선 후**: apiRequest()를 통해 타입 안전한 API 호출 ✅

---

## 🚀 적용 우선순위

### 높음 (즉시 적용 권장)
1. ✅ AuthContext 추가 완료
2. ✅ Layout에 AuthProvider 적용 완료
3. ✅ **Header.tsx**: 기존 인증 로직 제거하고 `useAuth()` 사용 완료
4. ✅ **Sidebar.tsx**: `getSession()` 호출을 `useAuth()` + `apiRequest()`로 변경 완료

### 중간 (점진적 적용)
5. ✅ **PropertyDetailModal.tsx**: 관심 등록 기능에 `useAuthCheck()` 적용 완료
6. ✅ **ReviewModal.tsx**: 도움됨 기능에 `useAuthCheck()` 적용 완료
7. ✅ **CameraButton.tsx**: 리뷰 작성 버튼에 `useAuthCheck()` 적용 완료
8. ✅ **AdModal.tsx**: 광고 포인트 기능에 `useAuth()` + `apiRequest()` 적용 완료

### 낮음 (선택 사항)
9. ⚠️ 관리자 페이지가 생기면 `<AuthGuard requireAdmin>` 적용
10. ⚠️ API 에러 로깅 시스템 구축 (Sentry 등)

---

## ⚠️ 주의사항

### 1. Server Component vs Client Component
- `useAuth()`, `useAuthCheck()`, `<AuthGuard>`는 **'use client'가 필요**합니다
- Server Component에서는 `supabase.auth.getSession()` 직접 사용

### 2. 기존 코드와의 호환성
- 기존 `getSession()` 방식도 계속 작동합니다
- 점진적으로 마이그레이션 가능

### 3. 성능
- AuthContext는 전역 상태이므로 불필요한 리렌더링 주의
- 필요한 곳에서만 `useAuth()` 사용

---

## 📝 마이그레이션 체크리스트

- [x] AuthContext 생성
- [x] AuthProvider를 layout.tsx에 추가
- [x] API 인터셉터 생성
- [x] AuthGuard 컴포넌트 생성
- [x] **Header.tsx 마이그레이션** ✅ 완료
- [x] **Sidebar.tsx 마이그레이션** ✅ 완료
- [x] **PropertyDetailModal.tsx 마이그레이션** ✅ 완료
- [x] **ReviewModal.tsx 마이그레이션** ✅ 완료
- [x] **CameraButton.tsx 마이그레이션** ✅ 완료
- [x] **AdModal.tsx 마이그레이션** ✅ 완료
- [x] Linter 오류 수정 완료

---

## 🔗 참고 자료

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [Next.js Context API](https://nextjs.org/docs/app/building-your-application/rendering/client-components#context)
- [React Authentication Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
