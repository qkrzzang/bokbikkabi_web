# 복비까비 보안 가이드

## 🔒 보안 정책

이 서비스는 **RLS(Row Level Security)를 사용하지 않습니다**.
대신 **애플리케이션 레벨**에서 보안을 관리합니다.

### 왜 RLS를 사용하지 않나요?

대부분의 커뮤니티/리뷰 서비스(네이버 플레이스, 카카오맵, 티스토리 등)는 RLS를 사용하지 않습니다.

**RLS 없이 운영의 장점:**
- ✅ 더 빠른 쿼리 성능
- ✅ 간단한 코드 구조
- ✅ 쉬운 디버깅
- ✅ 유연한 비즈니스 로직

## 🛡️ 보안 구현 방식

### 1. 사용자 인증
```typescript
// lib/auth-check.ts
// Supabase Auth를 사용한 세션 관리
const { data: { session } } = await supabase.auth.getSession()
```

### 2. 계약서 업로드 (OCR 처리만)
```typescript
// components/CameraButton.tsx
// 계약서는 OCR 처리 후 파일은 저장하지 않음
// OCR 추출 정보만 agent_reviews 테이블에 저장

const handleImageSubmit = async () => {
  // 1. OCR 처리
  // 2. 중개사무소 검증
  // 3. 리뷰 작성 (OCR 데이터만 저장)
  // ※ 계약서 이미지는 저장하지 않음
}
```

### 3. 리뷰 작성 권한
```typescript
// components/CameraButton.tsx
const handleReviewSubmit = async () => {
  // 로그인 체크
  if (!isLoggedIn) {
    alert('로그인이 필요합니다.')
    return
  }
  
  // 리뷰 저장
  const { error } = await supabase
    .from('agent_reviews')
    .insert({
      agent_id: selectedAgent.id,
      supabase_user_id: user.id, // 현재 로그인 사용자
      // ...
    })
}
```

### 4. 관리자 기능
```typescript
// components/Header.tsx
const isAdmin = userType === 'ADMIN'

if (!isAdmin) {
  // 관리자가 아니면 UI에서 숨김
  return null
}

// API 레벨에서도 재확인
const { data: userData } = await supabase
  .from('users')
  .select('user_type')
  .eq('supabase_user_id', user.id)
  .single()

if (userData?.user_type !== 'ADMIN') {
  throw new Error('권한이 없습니다.')
}
```

### 5. 사용자 정보 수정
```typescript
// 사용자는 자신의 정보만 수정 가능
const updateProfile = async (nickname: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }
  
  // 자신의 정보만 업데이트
  await supabase
    .from('users')
    .update({ nickname })
    .eq('supabase_user_id', user.id) // 현재 사용자 ID와 일치
}
```

## 📊 데이터 접근 정책

| 데이터 | 읽기 | 쓰기 | 수정 | 삭제 |
|--------|------|------|------|------|
| **agent_master** (중개사무소) | 모든 사용자 | 관리자 | 관리자 | 관리자 |
| **agent_reviews** (리뷰) | 모든 사용자 | 로그인 사용자 | 작성자 | 작성자 |
| **users** (사용자 정보) | 본인만 | 자동 생성 | 본인만 | - |
| **common_code** (공통코드) | 모든 사용자 | 관리자 | 관리자 | 관리자 |

## 🔐 민감 정보 보호

### 환경 변수 (.env.local)
```bash
# 절대 Git에 커밋하지 마세요!
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...  # Transaction Pooler (6543 포트)
```

### 계약서 처리
- **OCR 처리**: Upstage API로 텍스트 추출
- **데이터 저장**: OCR 추출 정보만 DB에 저장
- **이미지 파일**: 저장하지 않음 (메모리에서만 처리)

### 개인정보 가이드
```typescript
// 계약서 업로드 시 개인정보 가이드 표시
<div>
  💡 개인정보 보호를 권장합니다. 
  민감한 정보는 가리고 업로드해 주세요. 
  가려진 계약서도 AI가 정보를 안전하게 분석합니다.
</div>
```

## 🚨 보안 체크리스트

### 배포 전 확인사항
- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 프로덕션 환경 변수가 Vercel/호스팅 대시보드에 설정되었는지 확인
- [ ] 관리자 계정의 `user_type`이 `ADMIN`으로 설정되었는지 확인
- [ ] API 키들이 노출되지 않았는지 확인
- [ ] Transaction Pooler(6543 포트) 설정 확인

### 정기 점검
- [ ] 이상한 리뷰 활동 모니터링
- [ ] 비정상적인 로그인 시도 확인
- [ ] 데이터베이스 용량 확인
- [ ] API 키 주기적 교체

## 📚 참고 자료

- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [Next.js 환경 변수](https://nextjs.org/docs/basic-features/environment-variables)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## 🆘 보안 이슈 발견 시

보안 취약점을 발견하셨다면:
1. **즉시** 관리자에게 연락
2. 이슈를 공개하지 말고 비공개로 보고
3. 패치가 완료될 때까지 대기

---

**마지막 업데이트**: 2026-01-23
**RLS 상태**: 비활성화 (애플리케이션 레벨에서 보안 관리)
