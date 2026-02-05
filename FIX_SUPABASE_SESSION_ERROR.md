# 🚨 긴급: Supabase 세션 오류 해결

## 📋 오류 증상
```
getSession 오류: AbortError: signal is aborted without reason
Uncaught (in promise) AbortError: signal is aborted without reason
백업 세션 없음 확인 (5초 경과)
```

---

## 🔥 즉시 해결 방법 (우선순위)

### 1단계: Supabase Redirect URL 설정 (가장 중요!)

**Supabase Dashboard** → **Authentication** → **URL Configuration**

#### 추가해야 할 URL:
```
# 로컬 개발
http://localhost:3000
http://localhost:3000/auth/callback
http://localhost:3000/**

# 배포 환경 (있다면)
https://your-domain.com
https://your-domain.com/auth/callback
https://your-domain.com/**
```

**Site URL 설정**:
```
http://localhost:3000
```

**Redirect URLs 설정**:
```
http://localhost:3000/**
```

---

### 2단계: .env.local 파일 확인

**.env.local 파일 열기** (프로젝트 루트):

```bash
# 올바른 형식
NEXT_PUBLIC_SUPABASE_URL=https://ijzxpnfiqwjlkhpbqjgk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**확인 사항**:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` 정확한지?
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` 완전한지? (매우 긴 문자열)
- ✅ 공백이나 따옴표 없는지?
- ✅ 줄바꿈 없는지?

**Supabase Dashboard에서 키 확인**:
1. **Settings** → **API**
2. **Project URL** 복사
3. **Project API keys** → **anon public** 복사

---

### 3단계: 개발 서버 완전 재시작

**PowerShell에서 실행**:
```powershell
# 1. 개발 서버 종료 (Ctrl + C)

# 2. .next 폴더 삭제
Remove-Item -Recurse -Force .next

# 3. node_modules/.cache 삭제
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue

# 4. 재시작
npm run dev
```

---

### 4단계: 브라우저 완전 초기화

#### Chrome/Edge:
1. `F12` → **Application** 탭
2. **Clear storage** → **Clear site data** 클릭
3. 브라우저 완전 종료
4. 다시 열기
5. `Ctrl + Shift + R` (강제 새로고침)

#### 또는 시크릿 모드:
```
Ctrl + Shift + N (새 시크릿 창)
```

---

## 🔍 상세 진단

### lib/supabase/client.ts 확인

파일 열기: `lib/supabase/client.ts`

**현재 코드 확인**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        keepalive: true,
        signal: AbortSignal.timeout(30000),
      })
    },
  },
})
```

**문제가 있다면 임시로 단순화**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 🧪 테스트

### 1. 콘솔에서 직접 테스트

**브라우저 콘솔** (`F12` → Console):

```javascript
// Supabase URL 확인
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

// 세션 확인
const { data, error } = await supabase.auth.getSession()
console.log('Session:', data, error)

// 간단한 쿼리
const { data: testData, error: testError } = await supabase
  .from('agent_master')
  .select('id')
  .limit(1)
console.log('Query:', testData, testError)
```

---

## 📊 체크리스트

### Supabase Dashboard 설정
- [ ] Authentication → URL Configuration 확인
- [ ] Site URL: `http://localhost:3000`
- [ ] Redirect URLs에 `http://localhost:3000/**` 추가
- [ ] Settings → API에서 URL과 Key 복사

### 로컬 환경
- [ ] `.env.local` 파일에 올바른 URL과 Key
- [ ] 공백, 따옴표, 줄바꿈 없음
- [ ] `.next` 폴더 삭제
- [ ] `npm run dev` 재시작

### 브라우저
- [ ] Application → Clear site data
- [ ] 브라우저 완전 종료 후 재시작
- [ ] 또는 시크릿 모드 사용

---

## 🎯 가장 가능성 높은 원인

### 1. Redirect URL 미설정 (90%)
```
Supabase Dashboard → Authentication → URL Configuration
→ Redirect URLs에 localhost 추가 안 됨
```

### 2. .env.local 오류 (5%)
```
- Key가 잘림
- 공백이나 줄바꿈
- 잘못된 URL
```

### 3. 캐시 문제 (3%)
```
- 브라우저 캐시
- Next.js 빌드 캐시
```

### 4. Supabase 클라이언트 설정 (2%)
```
- AbortSignal timeout 문제
- fetch 설정 문제
```

---

## 💡 빠른 해결 순서

### 30초 안에
```
1. Supabase Dashboard → Authentication → URL Configuration
2. Redirect URLs에 http://localhost:3000/** 추가
3. Save
```

### 1분 안에
```
4. 브라우저 F12 → Application → Clear site data
5. Ctrl + Shift + R (강제 새로고침)
```

### 3분 안에
```
6. PowerShell:
   Remove-Item -Recurse -Force .next
   npm run dev
```

---

## 🚨 여전히 안 되면

### 스크린샷 필요:
1. **Supabase Dashboard** → **Authentication** → **URL Configuration** 화면
2. **.env.local** 파일 내용 (키는 일부만)
3. **브라우저 콘솔** 전체 오류 메시지

### 확인 필요:
```javascript
// 브라우저 콘솔에서 실행
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length)
```

---

**지금 바로 Supabase Dashboard의 Redirect URL 설정을 확인하세요!**
이것이 가장 가능성 높은 원인입니다. 🎯

