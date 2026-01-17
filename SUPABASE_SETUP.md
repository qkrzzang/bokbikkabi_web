# Supabase 설정 가이드

## 로컬 개발 환경 설정

### 1. 환경변수 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 입력하세요:

```bash
# .env.local 파일 생성
cp .env.example .env.local
```

### 2. Supabase 프로젝트 정보 입력

`.env.local` 파일에 Supabase 프로젝트 정보를 입력하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
UPSTAGE_API_KEY=your_upstage_api_key_here
```

#### Supabase 키 찾는 방법:

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. **Settings** > **API** 메뉴로 이동
4. 다음 정보를 복사:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`에 입력
   - **anon public** key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
   - **service_role** key: `SUPABASE_SERVICE_ROLE_KEY`에 입력 (주의: 이 키는 서버 사이드에서만 사용)

### 3. 개발 서버 재시작

환경변수를 변경한 후에는 개발 서버를 재시작해야 합니다:

```bash
npm run dev
```

## Vercel 배포 환경 설정

### 1. Vercel 프로젝트 설정

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. 프로젝트 선택
3. **Settings** > **Environment Variables** 메뉴로 이동

### 2. 환경변수 추가

다음 환경변수들을 추가하세요:

| 변수명 | 값 | 환경 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_anon_key` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_service_role_key` | Production, Preview, Development |
| `UPSTAGE_API_KEY` | `your_upstage_api_key` | Production, Preview, Development |

### 3. 환경별 설정

- **Production**: 프로덕션 환경에서만 사용
- **Preview**: 프리뷰 배포에서 사용
- **Development**: 개발 환경에서 사용

모든 환경에서 동일한 값을 사용하려면 세 가지 모두 선택하세요.

### 4. 배포

환경변수를 추가한 후:

1. **Save** 버튼 클릭
2. 새로운 배포를 트리거하거나 기존 배포를 재배포

## Supabase 클라이언트 사용 방법

### 클라이언트 사이드에서 사용

```typescript
import { supabase } from '@/lib/supabase/client'

// 데이터 조회
const { data, error } = await supabase
  .from('agent_master')
  .select('*')
  .eq('registration_number', '41135-2018-00148')
```

### 서버 사이드에서 사용 (API Routes)

```typescript
import { supabaseAdmin } from '@/lib/supabase/server'

// 서버 사이드에서는 supabaseAdmin 사용 (RLS 우회)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('agent_master')
    .select('*')
  
  return Response.json(data)
}
```

## 보안 주의사항

⚠️ **중요**: 
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 클라이언트에 노출되지만, Supabase의 Row Level Security(RLS)로 보호됩니다
- `SUPABASE_SERVICE_ROLE_KEY`는 **절대** 클라이언트 코드에 포함하지 마세요. 서버 사이드에서만 사용하세요
- `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다

## 문제 해결

### 환경변수가 로드되지 않는 경우

1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 변수명이 정확한지 확인 (대소문자 구분)
3. 개발 서버를 재시작
4. Next.js는 `NEXT_PUBLIC_` 접두사가 있는 변수만 클라이언트에 노출됩니다

### Supabase 연결 오류

1. Supabase 프로젝트 URL이 정확한지 확인
2. API 키가 올바른지 확인
3. Supabase 프로젝트가 활성화되어 있는지 확인
4. 네트워크 연결 확인
