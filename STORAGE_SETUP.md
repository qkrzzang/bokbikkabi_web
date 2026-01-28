# Supabase Storage 설정 가이드

## Storage 버킷 생성 (필수)

계약서 이미지를 저장하기 위해 `contracts` 버킷을 생성해야 합니다.

### 1. 버킷 생성

1. **Supabase Dashboard 접속**: https://app.supabase.com
2. 프로젝트 선택
3. 좌측 메뉴에서 **Storage** 클릭
4. **New Bucket** 버튼 클릭
5. 설정:
   - **Name**: `contracts`
   - **Public**: **체크 해제** (비공개 버킷)
6. **Create bucket** 클릭

### 2. RLS 정책 설정

버킷 생성 후, **SQL Editor**에서 다음 SQL을 실행하세요:

```sql
-- 사용자는 자신의 폴더에만 업로드 가능
CREATE POLICY "Users can upload own contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신의 파일만 조회 가능
CREATE POLICY "Users can view own contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신의 파일만 삭제 가능
CREATE POLICY "Users can delete own contracts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. 정책 확인

다음 SQL로 정책이 제대로 생성되었는지 확인:

```sql
SELECT 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%contracts%';
```

---

## 보안 설정

- ✅ **비공개 버킷**: URL을 알아도 권한 없이는 접근 불가
- ✅ **사용자별 폴더**: `user_id/timestamp.encrypted` 형식
- ✅ **RLS 정책**: 자신의 파일만 업로드/조회/삭제 가능
- ✅ **암호화**: AES-256으로 암호화된 상태로 저장

---

## 문제 해결

### "Bucket not found" 오류

**원인**: `contracts` 버킷이 생성되지 않음

**해결**:
1. 위의 "버킷 생성" 단계 수행
2. 개발 서버 재시작 (필요 시)

### "new row violates row-level security policy" 오류

**원인**: RLS 정책 미설정

**해결**:
1. 위의 "RLS 정책 설정" SQL 실행
2. 정책 확인 SQL로 검증

---

## Storage 구조

```
contracts/
├── {user_id_1}/
│   ├── 1706428800000.encrypted
│   └── 1706429900000.encrypted
└── {user_id_2}/
    └── 1706430000000.encrypted
```

각 사용자는 자신의 폴더에만 접근 가능합니다.

