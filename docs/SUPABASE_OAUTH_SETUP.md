# Supabase 카카오 OAuth 설정 가이드

카카오 로그인 리다이렉션이 제대로 작동하지 않을 때 확인해야 할 설정들입니다.

## 📋 체크리스트

### 1. Supabase 설정 확인

#### 1.1 Site URL 설정
1. [Supabase Dashboard](https://supabase.com/dashboard) > 프로젝트 선택
2. **Settings** > **Authentication** > **URL Configuration** 이동
3. **Site URL** 확인 및 설정:
   - 개발: `http://localhost:3000`
   - 운영: `https://yourdomain.com`

#### 1.2 Redirect URLs 설정
**같은 페이지에서 Redirect URLs 확인:**
- `http://localhost:3000/auth/callback` (개발용)
- `https://yourdomain.com/auth/callback` (운영용)

**⚠️ 중요:**
- 반드시 `/auth/callback` 경로 포함
- 포트 번호 정확히 입력 (3000)
- 슬래시(/) 정확히 입력

#### 1.3 Kakao Provider 설정
1. **Settings** > **Authentication** > **Providers** 이동
2. **Kakao** 찾기
3. **Enable** 체크
4. 설정 입력:
   - **Kakao Client ID**: 카카오 REST API 키
   - **Kakao Client Secret**: 카카오 Secret 키 (선택사항)
5. **Save** 클릭

### 2. 카카오 Developers 설정 확인

#### 2.1 Redirect URI 등록
1. [Kakao Developers](https://developers.kakao.com/) 로그인
2. **내 애플리케이션** > 사용 중인 앱 선택
3. **제품 설정** > **카카오 로그인** 이동
4. **Redirect URI** 섹션에서 URI 추가:

```
https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
```

**예시:**
```
https://abcdefghijklmnop.supabase.co/auth/v1/callback
```

**⚠️ 어디서 찾나요?**
- Supabase Dashboard > **Authentication** > **Providers** > **Kakao**
- 또는 직접 입력: `https://[프로젝트ID].supabase.co/auth/v1/callback`

#### 2.2 카카오 로그인 활성화
**제품 설정** > **카카오 로그인**:
- **활성화 설정** > **ON**
- **OpenID Connect 활성화** > **ON** (선택사항)

#### 2.3 동의 항목 설정
**제품 설정** > **카카오 로그인** > **동의 항목**:
- **닉네임**: 필수 동의
- **프로필 사진**: 선택 동의
- **카카오계정(이메일)**: 필수 동의

## 🔍 디버깅 방법

### 브라우저 콘솔 확인
1. F12 > Console 탭 열기
2. 카카오 로그인 버튼 클릭
3. 콘솔 로그 확인:

```
[카카오 로그인] 시작
[카카오 로그인] Redirect URL: http://localhost:3000/auth/callback
[카카오 로그인] Supabase URL: https://xxx.supabase.co
[카카오 로그인] OAuth URL 생성 성공
```

### 콜백 페이지 로그 확인
카카오 로그인 후 `/auth/callback` 페이지에서:

```
[콜백] ===== 카카오 OAuth 콜백 처리 시작 =====
[콜백] 1. 현재 URL: http://localhost:3000/auth/callback#access_token=...
[콜백] 2. Hash: #access_token=...
[콜백] 3. Search: (비어있음)
[콜백] 4. Origin: http://localhost:3000
[콜백] 5. 인증 데이터 확인: { hasAccessToken: true, hasCode: false }
[콜백] ✅ 즉시 세션 확인 성공!
[콜백] User ID: xxx
[콜백] 7. 메인 페이지로 이동
```

## 🚨 자주 발생하는 문제

### 문제 1: "인증 데이터 없음" 오류
**원인:** 카카오에서 Supabase로 리다이렉트가 제대로 되지 않음

**해결:**
1. 카카오 Developers에서 Redirect URI 확인:
   ```
   https://[YOUR-PROJECT].supabase.co/auth/v1/callback
   ```
2. 프로젝트 ID 정확히 입력했는지 확인
3. 카카오 로그인 활성화 상태 확인

### 문제 2: "세션 없음" 오류
**원인:** Supabase가 OAuth 토큰을 세션으로 변환하지 못함

**해결:**
1. Supabase Dashboard > **Settings** > **Authentication** > **Site URL** 확인
2. `http://localhost:3000` (슬래시 없이!)
3. 개발 서버 재시작

### 문제 3: 무한 로딩
**원인:** 콜백 처리 중 오류 발생

**해결:**
1. 브라우저 콘솔에서 오류 메시지 확인
2. Supabase 로그 확인: Dashboard > **Logs** > **Auth logs**
3. 캐시 삭제 후 재시도

## 📝 설정 예시

### Supabase Dashboard 설정

```yaml
# Settings > Authentication > URL Configuration

Site URL: http://localhost:3000

Redirect URLs:
  - http://localhost:3000/auth/callback
  - http://localhost:3000/**  (와일드카드)
```

### 카카오 Developers 설정

```yaml
# 제품 설정 > 카카오 로그인

활성화: ON
Redirect URI:
  - https://abcdefg.supabase.co/auth/v1/callback

동의 항목:
  - 닉네임 (필수)
  - 프로필 사진 (선택)
  - 카카오계정(이메일) (필수)
```

## ✅ 테스트 방법

1. **시크릿 모드**로 브라우저 열기
2. `http://localhost:3000` 접속
3. 카카오 로그인 버튼 클릭
4. 카카오 로그인 페이지로 이동 확인
5. 카카오 계정 로그인
6. 동의 화면에서 동의 버튼 클릭
7. `/auth/callback` 페이지로 이동 → 로딩 → 메인 페이지 이동 확인
8. 우측 상단에 프로필 표시 확인

## 🆘 그래도 안 되면?

### 콘솔 로그 공유
브라우저 콘솔(F12)의 로그를 복사하여 공유해주세요:
- `[카카오 로그인]` 로그
- `[콜백]` 로그
- 빨간색 오류 메시지

### Supabase 로그 확인
Supabase Dashboard > **Logs** > **Auth logs**에서:
- 로그인 시도 기록 확인
- 오류 메시지 확인

---

**마지막 업데이트**: 2025-01-25
