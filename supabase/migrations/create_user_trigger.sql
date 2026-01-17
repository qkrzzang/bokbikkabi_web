CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_provider text;
  v_name text;
  v_avatar text;
BEGIN
  -- [로그] 시작 확인
  RAISE LOG '[Trigger Start] Trying to insert user: %', new.id;

  -- 데이터 추출
  v_provider := COALESCE(new.raw_app_meta_data->>'provider', 'unknown');
  
  v_name := COALESCE(
    new.raw_user_meta_data->'properties'->>'nickname', -- 카카오
    new.raw_user_meta_data->>'name', -- 구글
    new.raw_user_meta_data->>'full_name',
    '익명'
  );
  
  v_avatar := COALESCE(
    new.raw_user_meta_data->'properties'->>'profile_image', -- 카카오
    new.raw_user_meta_data->>'avatar_url' -- 구글
  );

  -- [핵심 수정] INSERT 구문의 컬럼명을 테이블 DDL과 일치시킴
  INSERT INTO public.users (
    supabase_user_id,  -- 매핑 확인 완료
    email,
    nickname,
    profile_image_url,
    provider,
    provider_user_id
  )
  VALUES (
    new.id,
    new.email,
    v_name,
    v_avatar,
    v_provider,
    new.raw_user_meta_data->>'sub'
  )
  ON CONFLICT (supabase_user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    nickname = EXCLUDED.nickname,
    last_login_at = NOW(),
    updated_at = NOW();

  RAISE LOG '[Trigger Success] Inserted supabase_user_id: %', new.id;
  RETURN new;

EXCEPTION WHEN OTHERS THEN
  -- 에러 내용을 로그에 자세히 남김
  RAISE LOG '[Trigger Error] Message: %, Detail: %', SQLERRM, SQLSTATE;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 함수 소유자를 postgres로 변경
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 트리거 연결
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();