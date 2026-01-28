-- contracts 버킷 RLS 정책 설정
-- 주의: 버킷은 Supabase Dashboard > Storage에서 수동으로 먼저 생성해야 합니다
-- Bucket name: contracts, Public: false (비공개)

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

-- 정책 확인
SELECT 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%contracts%';

