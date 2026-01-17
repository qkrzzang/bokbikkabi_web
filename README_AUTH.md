# 인증 시스템 설정 가이드

## 1. Supabase 프로젝트 설정

### OAuth 제공자 설정

1. Supabase 대시보드에서 프로젝트 선택
2. Authentication > Providers 메뉴로 이동
3. 카카오와 구글 OAuth 제공자 활성화

#### 카카오 OAuth 설정
1. Supabase 대시보드 > Authentication > Providers > Kakao
2. Enable Kakao provider 체크
3. 다음 정보 입력:
   - **Client ID (REST API 키)**: `a37fa2cafb62d49553fc0b2988ce4dd9`
   - **Client Secret (Client Secret)**: `Mbu2Kfbp12cTjg5iMUVo7fXQN9wr9OF6`
   - **Redirect URI**: `https://[your-project-ref].supabase.co/auth/v1/callback`
4. Save 버튼 클릭

**참고**: Kakao Developers에서 Redirect URI 등록 필요
- Kakao Developers > 내 애플리케이션 > 플랫폼 설정 > Redirect URI
- `https://[your-project-ref].supabase.co/auth/v1/callback` 추가

#### 구글 OAuth 설정
- Google Cloud Console (https://console.cloud.google.com/)에서 프로젝트 생성
- OAuth 2.0 클라이언트 ID 생성
- Redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
- Client ID와 Client Secret을 Supabase에 등록

## 2. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# 카카오 OAuth 설정 (참고용 - 실제 사용은 Supabase 대시보드에서 설정)
KAKAO_REST_API_KEY=a37fa2cafb62d49553fc0b2988ce4dd9
KAKAO_CLIENT_SECRET=Mbu2Kfbp12cTjg5iMUVo7fXQN9wr9OF6
```

**중요**: 카카오 OAuth 키는 Supabase 대시보드에서 직접 설정해야 합니다. 환경 변수는 참고용입니다.

## 3. 데이터베이스 마이그레이션 실행

Supabase SQL Editor에서 다음 마이그레이션 파일들을 순서대로 실행하세요:

1. `supabase/migrations/create_users_table.sql`
2. `supabase/migrations/create_access_logs_table.sql`

또는 Supabase CLI를 사용하는 경우:

```bash
supabase db push
```

## 4. 테이블 구조

### users 테이블
- 사용자 정보를 저장하는 테이블
- Supabase Auth와 연동
- 카카오/구글 등 OAuth 제공자 정보 저장

### access_logs 테이블
- 사용자 접속 이력을 기록하는 테이블
- IP 주소, User Agent, 디바이스 정보 등 저장
- 90일 이상 된 로그는 자동으로 정리됨

## 5. 사용 방법

### 로그인
1. 헤더의 "로그인" 버튼 클릭
2. 카카오 또는 구글 로그인 선택
3. OAuth 인증 완료 후 자동으로 리다이렉트
4. 사용자 정보가 자동으로 `users` 테이블에 저장됨
5. 접속 이력이 `access_logs` 테이블에 기록됨

### 로그아웃
- 헤더의 "로그아웃" 버튼 클릭

## 6. 보안 고려사항

- RLS (Row Level Security)가 활성화되어 있어 사용자는 자신의 데이터만 조회 가능
- 서비스 역할 키는 서버 사이드에서만 사용
- 접속 이력은 개인정보 보호를 위해 90일 후 자동 삭제
