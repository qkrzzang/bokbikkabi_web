-- auth.users의 사용자 정보가 업데이트될 때 users 테이블도 함께 업데이트하는 Trigger

-- 함수 생성: auth.users에 UPDATE 시 users 테이블도 업데이트
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
  user_email VARCHAR(255);
  user_nickname VARCHAR(100);
  user_profile_image_url TEXT;
  kakao_account JSONB;
  properties JSONB;
BEGIN
  -- 카카오 계정 정보 추출
  kakao_account := COALESCE(NEW.user_metadata->'kakao_account', '{}'::jsonb);
  properties := COALESCE(NEW.user_metadata->'properties', '{}'::jsonb);
  
  -- 이메일 추출
  user_email := COALESCE(
    NEW.email,
    (kakao_account->>'email')::VARCHAR
  );
  
  -- 닉네임 추출
  user_nickname := COALESCE(
    (properties->>'nickname')::VARCHAR,
    (kakao_account->'profile'->>'nickname')::VARCHAR,
    NEW.user_metadata->>'name',
    NEW.user_metadata->>'nickname'
  );
  
  -- 프로필 이미지 URL 추출
  user_profile_image_url := COALESCE(
    (properties->>'profile_image')::TEXT,
    (kakao_account->'profile'->>'profile_image_url')::TEXT,
    NEW.user_metadata->>'avatar_url',
    NEW.user_metadata->>'picture'
  );
  
  -- users 테이블 업데이트
  UPDATE public.users
  SET
    email = user_email,
    nickname = user_nickname,
    profile_image_url = user_profile_image_url,
    updated_at = NOW(),
    last_login_at = NOW()
  WHERE supabase_user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger 생성: auth.users에 UPDATE 시 handle_user_update 함수 실행
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.user_metadata IS DISTINCT FROM NEW.user_metadata
  )
  EXECUTE FUNCTION public.handle_user_update();

-- 주석 추가
COMMENT ON FUNCTION public.handle_user_update() IS 'auth.users의 사용자 정보가 업데이트될 때 public.users 테이블도 함께 업데이트하는 함수';
COMMENT ON TRIGGER on_auth_user_updated ON auth.users IS 'auth.users에 UPDATE 시 users 테이블도 업데이트하는 Trigger';
