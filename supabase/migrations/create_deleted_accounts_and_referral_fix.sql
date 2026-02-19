-- ================================================
-- 리퍼럴 어뷰징 방지
-- 1. 탈퇴 블랙리스트 테이블
-- 2. referral_rewards FK 변경 (CASCADE → SET NULL)
-- 3. referral_rewards에 referee_email 컬럼 추가
-- ================================================

-- 1. deleted_accounts 테이블 생성
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  eligible_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts(email);

ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage deleted_accounts" ON deleted_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. referral_rewards FK 변경 (ON DELETE CASCADE → ON DELETE SET NULL)
ALTER TABLE referral_rewards DROP CONSTRAINT IF EXISTS referral_rewards_referrer_id_fkey;
ALTER TABLE referral_rewards DROP CONSTRAINT IF EXISTS referral_rewards_referee_id_fkey;

ALTER TABLE referral_rewards ALTER COLUMN referrer_id DROP NOT NULL;
ALTER TABLE referral_rewards ALTER COLUMN referee_id DROP NOT NULL;

ALTER TABLE referral_rewards ADD CONSTRAINT referral_rewards_referrer_id_fkey
  FOREIGN KEY (referrer_id) REFERENCES public.users(supabase_user_id) ON DELETE SET NULL;
ALTER TABLE referral_rewards ADD CONSTRAINT referral_rewards_referee_id_fkey
  FOREIGN KEY (referee_id) REFERENCES public.users(supabase_user_id) ON DELETE SET NULL;

-- 3. referral_rewards에 referee_email 컬럼 추가 (이메일 기반 중복 보상 차단용)
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS referee_email TEXT;

-- 기존 레코드에 이메일 채우기 (가능한 경우)
UPDATE referral_rewards rr
SET referee_email = u.email
FROM users u
WHERE rr.referee_id = u.supabase_user_id
  AND rr.referee_email IS NULL;
