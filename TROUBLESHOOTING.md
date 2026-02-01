# 🔧 트러블슈팅 가이드

## 검색 시 "DB 조회 실패, 목업 데이터 사용" 문제

### 증상
- 검색하면 목업 데이터만 표시됨
- 콘솔에 "AbortError: signal is aborted without reason" 에러
- `/api/test-db`는 성공하지만 클라이언트 검색은 실패

### 원인
브라우저의 **IndexedDB/LocalStorage**에 저장된 Supabase 세션 데이터가 손상됨

### 해결 방법

#### 방법 1: 브라우저 캐시 완전 삭제 (추천)

**Chrome/Edge:**
1. `F12` → **Application** 탭
2. 좌측 **Storage** 섹션:
   - ✅ **Local Storage** → `http://localhost:3000` 우클릭 → Clear
   - ✅ **Session Storage** → Clear
   - ✅ **IndexedDB** → `supabase-auth-token` 우클릭 → Delete database
   - ✅ **Cookies** → `localhost` 모두 삭제
3. 페이지 새로고침 (`Ctrl + Shift + R`)

**Firefox:**
1. `F12` → **Storage** 탭
2. 모든 Storage 항목 삭제
3. 페이지 새로고침

#### 방법 2: 시크릿/프라이빗 모드

새 시크릿 창에서:
```
http://localhost:3000
```

캐시 없이 테스트 가능

#### 방법 3: 코드로 강제 로그아웃

브라우저 콘솔(F12)에서 실행:
```javascript
// Supabase 세션 완전 삭제
localStorage.clear()
sessionStorage.clear()
indexedDB.deleteDatabase('supabase-auth-token')
location.reload()
```

#### 방법 4: 다른 브라우저로 테스트

- Chrome이 안 되면 → Edge 또는 Firefox 시도
- 새 브라우저에서 정상 작동하면 → 캐시 문제 확정

### 예방

**개발 중 브라우저 캐시 비활성화:**
1. `F12` 개발자도구 열기
2. **Network** 탭
3. ✅ **Disable cache** 체크박스 활성화
4. 개발자도구를 열어둔 상태로 개발

---

## 로그인 시 AbortError 문제

### 증상
- 로그인 버튼 클릭 → OAuth 진행 → 콜백 후 에러

### 해결 방법

위의 **방법 1** (브라우저 캐시 삭제) 동일하게 적용

---

## Supabase 연결 문제 일반

### 체크리스트

1. ✅ **프로젝트 상태**: Active (Paused 아님)
2. ✅ **환경 변수**: `.env.local` 확인
3. ✅ **RLS**: 모두 false
4. ✅ **네트워크**: `/api/test-db` 성공
5. ❌ **브라우저 캐시**: 손상됨 ← 여기가 문제!

### 최종 확인

```bash
# 터미널에서
npm run dev

# 브라우저 콘솔에서
localStorage.clear()
sessionStorage.clear()
location.reload()
```

---

## 여전히 안 되면?

### 임시 해결: PropertyList를 서버 컴포넌트로 변경

현재 PropertyList는 클라이언트 컴포넌트(`'use client'`)인데, 
서버 컴포넌트로 변경하면 브라우저 캐시 문제를 우회할 수 있습니다.

**하지만 권장하지 않음** - 브라우저 캐시 삭제가 더 간단합니다.

---

## 정리

**가장 빠른 해결책:**

1. F12 → Application → Storage 모두 삭제
2. 시크릿 모드에서 테스트
3. 정상 작동 확인 → 일반 모드로 돌아오기

이 문제는 99% **브라우저 캐시 손상** 문제입니다! 🎯
