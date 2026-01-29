# 카카오 로그인 리다이렉트 문제 해결

## 문제 상황
운영 서버(Vercel 등)에서 카카오 로그인 후 `http://localhost:3000`으로 리다이렉트됨

## 원인
Supabase의 Site URL 설정이 `localhost`로 되어 있음

---

## 해결 방법

### 1. Supabase Site URL 설정

1. **Supabase Dashboard 접속**: https://app.supabase.com
2. 프로젝트 선택 (ijzxpnfiqwjlkhpbqjgk)
3. **Settings** → **Authentication** 메뉴
4. **Site URL** 찾기
5. 운영 도메인으로 변경:
   ```
   https://your-domain.vercel.app
   ```
   또는
   ```
   https://bokbikkabi.com
   ```

### 2. Redirect URLs 추가

같은 페이지에서 **Redirect URLs** 섹션:

```
http://localhost:3000/auth/callback
https://your-domain.vercel.app/auth/callback
https://bokbikkabi.com/auth/callback
```

**주의**: 각 URL을 별도 줄로 추가 (쉼표 없이)

### 3. 카카오 개발자 콘솔 설정

1. **Kakao Developers** 접속: https://developers.kakao.com
2. 앱 선택
3. **카카오 로그인** → **Redirect URI** 설정
4. Supabase Redirect URL 추가:
   ```
   https://ijzxpnfiqwjlkhpbqjgk.supabase.co/auth/v1/callback
   ```

---

## 환경변수 설정 (Vercel)

Vercel Dashboard에서 환경변수 추가:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ijzxpnfiqwjlkhpbqjgk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (올바른 anon key)
NEXT_PUBLIC_ENCRYPTION_KEY=5f9fb1a719c3337aac9a26a187dea0a92971bc7a43bc706adabb96d86b3214e5
```

---

## 코드 확인

현재 `lib/auth.ts`의 리다이렉트 URL 생성 로직:

```typescript
const redirectUrl = typeof window !== 'undefined' 
  ? `${window.location.origin}/auth/callback`
  : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
```

이 코드는 정상입니다. 문제는 **Supabase 설정**에 있습니다.

---

## 테스트

1. Supabase Site URL 변경 후 저장
2. 브라우저 캐시 삭제
3. 운영 서버에서 카카오 로그인 테스트
4. 정상적으로 운영 도메인의 `/auth/callback`으로 리다이렉트되는지 확인

---

## 참고

- **로컬 개발**: `http://localhost:3000`
- **Vercel Preview**: `https://your-app-git-branch.vercel.app`
- **Vercel Production**: `https://your-app.vercel.app` 또는 커스텀 도메인

각 환경에 맞게 Supabase Redirect URLs에 모두 추가하세요.

