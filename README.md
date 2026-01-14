# 복비까비 - 부동산 평가 웹

부동산명 검색 기반의 부동산 평가 웹 애플리케이션입니다.

## 기능

- 🔍 부동산명 검색
- 📋 부동산 정보 게시판 형식 표시
- 💬 챗봇 기능 (우측 하단 플로팅 버튼)
- 🎨 Toss 스타일의 푸른빛 색상 테마

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

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

## 프로젝트 구조

```
bokbikkabi_web/
├── app/
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 메인 페이지
│   ├── page.module.css     # 메인 페이지 스타일
│   └── globals.css         # 글로벌 스타일
├── components/
│   ├── SearchBar.tsx       # 검색바 컴포넌트
│   ├── PropertyList.tsx    # 부동산 리스트 컴포넌트
│   └── ChatbotButton.tsx   # 챗봇 버튼 컴포넌트
└── package.json
```



