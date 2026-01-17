# 카카오 OAuth 설정 가이드

## Supabase에서 카카오 OAuth 설정하기

### 1. Supabase 대시보드 접속
1. Supabase 프로젝트 대시보드에 로그인
2. 왼쪽 메뉴에서 **Authentication** 클릭
3. **Providers** 탭 선택

### 2. 카카오 제공자 활성화
1. **Kakao** 제공자를 찾아서 **Enable** 체크
2. 다음 정보 입력:

```
Client ID (REST API 키): a37fa2cafb62d49553fc0b2988ce4dd9
Client Secret: Mbu2Kfbp12cTjg5iMUVo7fXQN9wr9OF6
```

3. **Redirect URI** 확인:
   - Supabase가 자동으로 생성한 Redirect URI를 확인
   - 예: `https://[your-project-ref].supabase.co/auth/v1/callback`

4. **Save** 버튼 클릭

### 3. Kakao Developers에서 Redirect URI 등록

1. [Kakao Developers](https://developers.kakao.com/)에 로그인
2. 내 애플리케이션 선택
3. **제품 설정** > **카카오 로그인** > **Redirect URI 등록** 클릭
4. 다음 URI 추가:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
   - `[your-project-ref]`는 실제 Supabase 프로젝트 참조 ID로 변경

5. **저장** 버튼 클릭

### 4. 확인 사항

- ✅ Supabase에서 카카오 제공자가 활성화되어 있는지 확인
- ✅ Client ID와 Client Secret이 올바르게 입력되었는지 확인
- ✅ Kakao Developers에 Redirect URI가 등록되었는지 확인

### 5. 테스트

1. 애플리케이션에서 로그인 버튼 클릭
2. "카카오로 시작하기" 버튼 클릭
3. 카카오 로그인 페이지로 리다이렉트되는지 확인
4. 로그인 후 자동으로 애플리케이션으로 돌아오는지 확인

## 문제 해결

### Redirect URI 오류
- Supabase에서 생성된 Redirect URI와 Kakao Developers에 등록한 URI가 정확히 일치하는지 확인
- 공백이나 특수문자가 없는지 확인

### 로그인 실패
- Client ID와 Client Secret이 올바른지 확인
- Supabase 대시보드에서 카카오 제공자가 활성화되어 있는지 확인
- 브라우저 콘솔에서 오류 메시지 확인
