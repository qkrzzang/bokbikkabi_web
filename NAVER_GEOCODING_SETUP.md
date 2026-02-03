# 네이버 Geocoding API 설정 가이드

## 📋 개요

주소를 좌표(위도, 경도)로 변환하여 네이버 지도에 정확한 위치를 표시하기 위해 Geocoding API가 필요합니다.

---

## 🔧 1단계: 네이버 클라우드 플랫폼에서 서비스 활성화

### 1. 로그인
- https://console.ncloud.com 접속
- 네이버 계정으로 로그인

### 2. Maps Application 찾기
```
상단 메뉴
→ Services
→ AI·NAVER API
→ Maps 클릭
```

### 3. Application 선택 또는 생성

**기존 Application이 있는 경우:**
- Application 목록에서 선택
- Client ID가 `k4l6jv8v5v`인 앱 찾기

**새로 생성하는 경우:**
- "Application 등록" 버튼 클릭
- Application 이름 입력
- 생성 완료

### 4. Geocoding 서비스 추가
```
1. Application 상세 페이지
2. "서비스 추가" 버튼 클릭
3. 서비스 목록에서 "Geocoding" 찾기
4. 체크박스 선택
5. "추가" 버튼 클릭
```

### 5. 서비스 활성화 확인
```
Application 상세 페이지에서:
- 활성화된 서비스: Geocoding ✓
- 상태: 활성
```

---

## 🔑 2단계: API 키 복사

Application 상세 페이지에서:

```
인증 정보
┌─────────────────────────────────────┐
│ Client ID:     xxxxxxxxxxxxx        │ ← 복사
│ Client Secret: yyyyyyyyyyyyy        │ ← 복사
└─────────────────────────────────────┘
```

---

## 📝 3단계: 환경변수 설정

### `.env.local` 파일에 추가

```env
# 네이버 Geocoding (주소 → 좌표 변환용)
NAVER_GEOCODING_CLIENT_ID=여기에_복사한_Client_ID
NAVER_GEOCODING_CLIENT_SECRET=여기에_복사한_Client_Secret
```

**전체 `.env.local` 예시:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ijzxpnfiqwjlkhpbqjgk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Upstage OCR API Key
UPSTAGE_API_KEY=up_PEzB2wnhVARJivBlmVrhl15k7fi3V

# 네이버 맵 (지도 표시용)
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=k4l6jv8v5v
NAVER_MAP_CLIENT_SECRET=f3f1WYdW3ZOE7KDnJbvfN0mXqdtjCZnNcNRJM7YD

# 네이버 Geocoding (주소 → 좌표 변환용) ← 여기에 추가!
NAVER_GEOCODING_CLIENT_ID=새로운_Geocoding_Client_ID
NAVER_GEOCODING_CLIENT_SECRET=새로운_Geocoding_Client_Secret
```

---

## 🔄 4단계: 개발 서버 재시작

```powershell
# Ctrl+C로 현재 서버 중지
npm run dev
```

---

## ✅ 5단계: 테스트

1. 브라우저에서 중개사무소 검색
2. 결과 클릭
3. 지도 섹션 확인:
   - "지도 로딩 중..." → Geocoding API 호출 중
   - 지도 표시 → 성공!

---

## 🧪 테스트 도구

`test_naver_geocoding.html` 파일을 브라우저에서 열어:
1. 새 Client ID, Secret 입력
2. 테스트 실행
3. ✅ 200 OK → 키 정상
4. ❌ 401 Unauthorized → 키 오류 또는 서비스 미활성화

---

## 💡 참고

**같은 키 사용 가능:**
- Maps와 Geocoding 서비스를 모두 활성화한 Application이면
- 같은 Client ID/Secret으로 두 서비스 모두 사용 가능
- 별도 키 없이 기존 `NAVER_MAP_*` 키 사용 가능

**코드 로직:**
```typescript
// Geocoding 전용 키가 있으면 사용, 없으면 Maps 키로 fallback
const clientId = process.env.NAVER_GEOCODING_CLIENT_ID || 
                 process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
```

---

## 📋 체크리스트

- [ ] 네이버 클라우드 플랫폼에서 Geocoding 서비스 활성화
- [ ] Client ID, Secret 복사
- [ ] `.env.local`에 환경변수 추가
- [ ] 개발 서버 재시작
- [ ] 브라우저에서 지도 테스트

네이버 클라우드 플랫폼에서 Geocoding 서비스를 활성화하고, API 키를 `.env.local`에 추가해주세요!

