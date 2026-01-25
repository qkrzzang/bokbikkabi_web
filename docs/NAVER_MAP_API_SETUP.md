# 네이버 지도 API 설정 가이드

부동산 리뷰 팝업에 네이버 지도를 표시하기 위해 네이버 Maps API를 사용합니다.

## 1. 네이버 클라우드 플랫폼 가입 및 API 키 발급

### 1.1 네이버 클라우드 플랫폼 가입
1. [네이버 클라우드 플랫폼](https://www.ncloud.com/) 접속
2. 우측 상단 "회원가입" 클릭
3. 회원가입 진행 (네이버 계정 또는 이메일로 가입 가능)

### 1.2 애플리케이션 등록
1. 로그인 후 콘솔로 이동
2. 상단 메뉴에서 **Services** > **Application Service** > **Maps** 선택
3. **Application 등록** 버튼 클릭
4. 애플리케이션 정보 입력:
   - **Application 이름**: `bokbikkabi_web` (원하는 이름)
   - **Service 선택**: 
     - **Web Dynamic Map** 체크 (지도 표시용)
     - **Geocoding** 체크 (주소 → 좌표 변환용)
   - **Web 서비스 URL**: 
     - 개발: `http://localhost:3000`
     - 운영: 실제 도메인 (예: `https://bokbikkabi.com`)

### 1.3 Client ID & Client Secret 확인
1. 애플리케이션 등록 완료 후 목록에서 확인
2. **인증 정보** 탭에서 확인:
   - **Client ID**: 지도 표시 및 Geocoding API용
   - **Client Secret**: Geocoding API용 (서버에서만 사용)
3. 두 값 모두 복사하여 `.env.local`에 저장

## 2. 환경변수 설정

### 2.1 `.env.local` 파일 생성
프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하거나 기존 파일에 추가:

```bash
# 네이버 지도 API
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_client_id_here
NAVER_MAP_CLIENT_SECRET=your_client_secret_here
```

**⚠️ 주의사항:**
- `.env.local` 파일은 Git에 커밋하지 않습니다 (`.gitignore`에 포함되어 있음)
- `NEXT_PUBLIC_` 접두사는 브라우저에서 접근 가능하게 합니다
- **Client ID**: 지도 표시용 (브라우저에서 사용)
- **Client Secret**: Geocoding API용 (서버에서만 사용, `NEXT_PUBLIC_` 접두사 없음!)

### 2.2 환경변수 확인
```bash
# 개발 서버 재시작
npm run dev
```

## 3. 사용법

환경변수가 올바르게 설정되면 `PropertyDetailModal` 컴포넌트에서 자동으로 네이버 지도가 표시됩니다.

### 3.1 지도 표시 위치
- 부동산 검색 후 리뷰가 있는 중개사무소 클릭
- 팝업 하단의 "위치" 섹션에 네이버 지도 표시

### 3.2 지도 기능
- **자동 주소 변환**: 부동산 주소를 좌표로 자동 변환하여 정확한 위치 표시
- 중개사무소 위치에 마커 표시
- 마커 클릭 시 정보 창 표시
- 지도 확대/축소 가능
- 드래그로 이동 가능

### 3.3 Geocoding 동작 방식
1. 부동산 주소를 Next.js API Route (`/api/geocode`)로 전송
2. 서버에서 네이버 Geocoding API 호출 (Client Secret 사용)
3. 좌표 변환 성공 시 정확한 위치 표시 (줌 레벨 17)
4. 좌표 변환 실패 시 기본 위치(서울시청) 표시 + 경고 메시지

## 4. 비용 및 제한

### 4.1 무료 할당량
- **Web Dynamic Map**: 월 30,000건 무료
- 초과 시 추가 요금 발생

### 4.2 요금 확인
- [네이버 클라우드 플랫폼 요금 안내](https://www.ncloud.com/product/applicationService/maps)

## 5. 트러블슈팅

### 5.1 지도가 표시되지 않는 경우
1. **Client ID 확인**:
   ```bash
   echo $NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
   ```
2. **Web 서비스 URL 확인**: 네이버 클라우드 플랫폼에서 **정확히** `http://localhost:3000` (포트 번호 포함) 등록
3. **개발 서버 재시작**: 환경변수 변경 후 반드시 재시작
   ```bash
   # Ctrl+C로 서버 중지 후
   npm run dev
   ```
4. **브라우저 캐시 삭제**: F12 > Application > Clear storage
5. **브라우저 콘솔 확인**: F12 > Console 탭에서 오류 메시지 확인

### 5.2 "Authentication Failed" 오류
가장 흔한 원인:
1. **Web 서비스 URL 불일치**
   - 네이버 클라우드 플랫폼: `http://localhost:3000`
   - 실제 접속 URL: `http://localhost:3000`
   - 포트 번호가 다르면 인증 실패!
2. **Client ID 오타**
   - 앞뒤 공백 제거
   - 대소문자 정확히 확인
3. **서버 미재시작**
   - `.env.local` 변경 후 반드시 서버 재시작

### 5.3 "Invalid Client ID" 오류
- Client ID가 올바른지 확인
- 네이버 클라우드 플랫폼에서 Web Dynamic Map 서비스가 활성화되어 있는지 확인

### 5.3 "Quota Exceeded" 오류
- 무료 할당량 초과
- 네이버 클라우드 플랫폼 콘솔에서 사용량 확인

## 6. 참고 자료

- [네이버 지도 API 공식 문서](https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding)
- [네이버 Maps JavaScript API v3 가이드](https://navermaps.github.io/maps.js.ncp/docs/)

## 7. 대안 방안 (API 키 없이 사용)

네이버 지도 API 키를 발급받지 않고도 지도를 표시할 수 있습니다:

### 7.1 네이버 지도 검색 링크 (현재 구현)
```typescript
// 클릭 시 네이버 지도 검색 페이지로 이동
const query = encodeURIComponent(property.address)
window.open(`https://map.naver.com/v5/search/${query}`, '_blank')
```

**장점:**
- API 키 불필요
- 무료
- 별도 개발 불필요

**단점:**
- 새 창/탭으로 이동
- 임베드된 지도 없음

### 7.2 카카오맵 API (대안)
카카오맵 API는 더 관대한 무료 정책을 제공합니다:
- 무료 할당량: 월 300,000건
- [카카오맵 API 가이드](https://apis.map.kakao.com/)

---

**마지막 업데이트**: 2025-01-25
