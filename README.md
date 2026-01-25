# 복비까비 - 부동산 평가 웹

부동산명 검색 기반의 부동산 평가 웹 애플리케이션입니다.

## 기능

- 🔍 부동산명 검색
- ⭐ 부동산 리뷰 작성 및 조회
- 🗺️ 네이버 지도 연동 (위치 표시)
- 📋 부동산 정보 게시판 형식 표시
- 💬 리뷰 작성 기능 (계약서 OCR 인증)
- 🎨 보라색 테마

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. Supabase 데이터베이스 설정

새로운 Supabase 프로젝트를 생성하고 데이터베이스 스키마를 초기화하세요.

**상세 가이드**: [supabase/README.md](supabase/README.md)

**빠른 시작:**
1. [Supabase](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/init_database.sql` 파일 실행
3. Project URL과 Anon Key 복사

### 3. 환경변수 설정

`.env.local.example` 파일을 복사하여 `.env.local` 파일을 생성하고 필요한 값을 입력하세요.

```bash
cp .env.local.example .env.local
```

**필수 환경변수:**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

**선택 환경변수:**
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`: 네이버 지도 API Client ID
- `NAVER_MAP_CLIENT_SECRET`: 네이버 지도 API Client Secret (주소→좌표 변환용)
  - 발급 방법: [docs/NAVER_MAP_API_SETUP.md](docs/NAVER_MAP_API_SETUP.md) 참고

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 5. 관리자 계정 설정

1. 웹에서 카카오/Gmail로 로그인
2. Supabase Dashboard > Table Editor > users 테이블
3. 본인 계정의 `user_type`을 `ADMIN`으로 변경
4. 새로고침 후 관리자 메뉴 확인

### 빌드

```bash
npm run build
npm start
```

## 기술 스택

- Next.js 14
- React 18
- TypeScript
- CSS Modules
- Supabase (데이터베이스 & 인증)
- 네이버 지도 API (지도 표시)

## 주요 기능 설명

### 리뷰 작성
1. 계약서 사진 업로드 → OCR 인식
2. 중개사무소 자동 매칭
3. 별점 및 태그 기반 리뷰 작성

### 부동산 검색 및 조회
1. 중개사무소명으로 검색
2. 평균 별점 자동 계산
3. 리뷰가 있는 중개사무소 클릭 시 상세 팝업 표시

### 네이버 지도 연동
- 로그인한 사용자에게 부동산 위치를 네이버 지도로 표시
- 설정 방법: [docs/NAVER_MAP_API_SETUP.md](docs/NAVER_MAP_API_SETUP.md)

## 프로젝트 구조

```
bokbikkabi_web/
├── app/
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 메인 페이지
│   ├── page.module.css     # 메인 페이지 스타일
│   └── globals.css         # 글로벌 스타일
├── components/
│   ├── Header.tsx          # 헤더 (로그인, 관리자 메뉴)
│   ├── SearchBar.tsx       # 검색바
│   ├── PropertyList.tsx    # 부동산 리스트
│   ├── PropertyDetailModal.tsx  # 부동산 상세 팝업
│   ├── CameraButton.tsx    # 리뷰 작성 버튼
│   └── ReviewModal.tsx     # 리뷰 조회 모달
├── lib/
│   └── supabase/
│       └── client.ts       # Supabase 클라이언트
├── docs/
│   └── NAVER_MAP_API_SETUP.md  # 네이버 지도 API 설정 가이드
└── package.json
```

## 문서

- [Supabase 데이터베이스 설정](supabase/README.md)
- [네이버 지도 API 설정 가이드](docs/NAVER_MAP_API_SETUP.md)

## 데이터베이스 스키마

전체 데이터베이스 스키마는 `supabase/init_database.sql` 파일에 통합되어 있습니다.

**주요 테이블:**
- `users`: 사용자 정보
- `agent_master`: 중개사무소 마스터
- `agent_reviews`: 리뷰
- `common_code_master/detail`: 공통코드
- `favorite_agents`: 관심 중개사무소
- `access_logs`: 접속 로그

자세한 내용은 [supabase/README.md](supabase/README.md)를 참고하세요.



