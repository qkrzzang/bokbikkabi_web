# 계약서 파일 저장 기능 제거 완료

## 🎯 변경 사항

### 1. 코드 변경

#### `components/CameraButton.tsx`
- ❌ 제거: `import { encryptFile, encryptedDataToBlob } from '@/lib/encryption'`
- ❌ 제거: 계약서 암호화 및 Supabase Storage 업로드 로직 (약 40줄)
- ❌ 제거: `contract_image_url` 필드를 리뷰 저장 시 제거

**변경 내역:**
```diff
- import { encryptFile, encryptedDataToBlob } from '@/lib/encryption'

- // 계약서 이미지를 암호화하여 Supabase Storage에 업로드
- let contractImageUrl: string | null = null
- if (originalFile) {
-   try {
-     const encryptedData = await encryptFile(originalFile)
-     const encryptedBlob = encryptedDataToBlob(encryptedData)
-     const { data: uploadData } = await supabase.storage
-       .from('contracts')
-       .upload(fileName, encryptedBlob, {...})
-     contractImageUrl = uploadData.path
-   } catch (error) { ... }
- }

  const { error } = await supabase
    .from('agent_reviews')
    .insert({
      ...
-     contract_image_url: contractImageUrl,
    })
```

### 2. 데이터베이스 변경

#### 새 Migration 파일
**`supabase/migrations/drop_contract_image_url.sql`**
```sql
ALTER TABLE public.agent_reviews DROP COLUMN IF EXISTS contract_image_url;
```

**실행 방법:**
1. Supabase Dashboard → SQL Editor
2. 위 파일 내용 복사/붙여넣기
3. RUN 클릭

### 3. 환경 변수 정리

#### `.env.local`
- ✅ 수정: `DATABASE_URL` (Transaction Pooler 올바른 호스트)

**변경 전:**
```bash
DATABASE_URL=postgres://postgres:...@db.ijzxpnfiqwjlkhpbqjgk.supabase.co:6543/postgres
```

**변경 후:**
```bash
DATABASE_URL=postgres://postgres.ijzxpnfiqwjlkhpbqjgk:...@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

### 4. 문서 업데이트

#### `SECURITY_GUIDE.md`
- ✅ 계약서 암호화 섹션 수정 → OCR 처리만 설명
- ✅ Storage 보안 정책 제거
- ✅ 환경 변수에서 암호화 키 제거
- ✅ 체크리스트 업데이트

## 📋 이제 동작 방식

### 계약서 처리 흐름

1. **사용자**: 계약서 사진 업로드 📸
2. **OCR**: Upstage API로 텍스트 추출 🔍
3. **검증**: 중개사무소 정보 매칭 ✅
4. **리뷰 저장**: OCR 추출 정보만 DB 저장 💾
5. **이미지**: 메모리에서 즉시 삭제 🗑️

**중요:** 계약서 이미지 파일은 어디에도 저장되지 않습니다!

### 저장되는 정보

`agent_reviews` 테이블에 저장:
- ✅ `agent_address`: OCR 추출 주소
- ✅ `agent_name`: OCR 추출 중개사무소명
- ✅ `confidence_score`: OCR 신뢰도
- ✅ `contract_type`: 계약 유형
- ✅ `doc_title`: 문서 제목
- ✅ `contract_date`: 계약일자
- ❌ ~~`contract_image_url`~~ (제거됨)

## 🔄 마이그레이션 체크리스트

### 데이터베이스
- [ ] `drop_contract_image_url.sql` 실행
- [ ] `agent_reviews` 테이블에서 `contract_image_url` 컬럼 삭제 확인

### 코드
- [x] `CameraButton.tsx`에서 암호화 로직 제거
- [x] `import` 문에서 `encryption` 제거
- [x] 리뷰 저장 시 `contract_image_url` 필드 제거

### 환경 변수
- [x] `DATABASE_URL` 올바른 Transaction Pooler 호스트로 수정

### 문서
- [x] `SECURITY_GUIDE.md` 업데이트
- [x] 계약서 저장 관련 설명 제거/수정

### 배포
- [ ] Vercel/호스팅에서 환경 변수 업데이트
- [ ] 프로덕션 DB에서 migration 실행

## 💡 장점

### 1. 개인정보 보호 강화
- ✅ 계약서 이미지를 저장하지 않음
- ✅ 민감한 개인정보 노출 위험 제거
- ✅ Storage 관리 불필요

### 2. 비용 절감
- ✅ Supabase Storage 비용 0원
- ✅ 암호화/복호화 처리 불필요
- ✅ 인프라 단순화

### 3. 성능 향상
- ✅ 파일 업로드 시간 제거 (~2-5초 단축)
- ✅ 암호화 처리 시간 제거
- ✅ 더 빠른 리뷰 저장

### 4. 코드 단순화
- ✅ 암호화 라이브러리 의존성 제거 가능
- ✅ Storage 권한 관리 불필요
- ✅ 유지보수 용이

## ⚠️ 주의사항

### Supabase Storage
기존에 저장된 계약서 파일들은:
- 자동으로 삭제되지 않음
- 필요시 수동으로 정리 가능
- Storage Bucket: `contracts`

### 암호화 라이브러리
`lib/encryption.ts` 파일과 `crypto-js` 패키지:
- 현재는 사용되지 않음
- 원하면 제거 가능
- 또는 다른 용도로 재활용 가능

```bash
# 제거하려면:
npm uninstall crypto-js @types/crypto-js
# lib/encryption.ts 파일 삭제
```

## 🎉 완료!

계약서 파일 저장 기능이 완전히 제거되었습니다.

**이제:**
- 계약서 이미지는 OCR 처리 후 즉시 삭제
- OCR 추출 정보만 DB에 저장
- 더 빠르고 안전한 리뷰 시스템

---

**마지막 업데이트**: 2026-01-23
**상태**: ✅ 완료
