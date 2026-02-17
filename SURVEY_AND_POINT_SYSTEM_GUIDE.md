# 서베이 및 포인트 시스템 구현 가이드

## 📋 개요

복비까비 서비스에 **서베이 시스템**과 **포인트 시스템**을 추가했습니다.

---

## 🗄️ 1. 데이터베이스 스키마

### 실행 방법
```sql
-- Supabase SQL Editor에서 실행
-- 파일: supabase/migrations/create_survey_and_point_system.sql
```

### 생성된 테이블

> **참고**: 포인트 정책과 서베이 질문은 공통 코드(`common_code_detail`)로 관리됩니다.

#### 1.1 `user_points` - 사용자 포인트 보유 현황
```sql
- id: BIGSERIAL PRIMARY KEY
- supabase_user_id: UUID (auth.users 참조)
- total_points: INT (총 보유 포인트)
- created_at, updated_at: TIMESTAMP
```

#### 1.2 `point_transactions` - 포인트 거래 내역
```sql
- id: BIGSERIAL PRIMARY KEY
- supabase_user_id: UUID
- point_type: VARCHAR(50) ('ATTENDANCE', 'CONTRACT', 'SURVEY', 'REVIEW', 'FAVORITE')
- points: INT (적립/차감 포인트, 양수=적립, 음수=차감)
- description: TEXT
- reference_id: BIGINT (참조 ID)
- created_at: TIMESTAMP
```

#### 1.3 포인트 정책 (공통 코드로 관리)
포인트 정책은 별도 테이블 대신 `common_code_detail`의 `POINT_POLICY` 그룹으로 관리합니다.

**구조**:
- `code_group`: `POINT_POLICY`
- `code_value`: 액션 타입 (예: `ATTENDANCE`, `REVIEW`)
- `code_name`: 지급 포인트 (예: `10`, `200`)
- `description`: 설명 (예: `매일 출석 체크`)
- `use_yn`: 사용 여부 (`Y`/`N`)
- `sta_ymd`: 시작일 (YYYYMMDD)
- `end_ymd`: 종료일 (YYYYMMDD)

**초기 정책**:
| 액션 타입 | 포인트 | 설명 |
|----------|--------|------|
| ATTENDANCE | 10P | 매일 출석 체크 |
| CONTRACT | 100P | 계약서 등록 |
| SURVEY | 50P | 서베이 완료 |
| REVIEW | 1000P | 리뷰 작성 |
| FAVORITE | 5P | 관심 부동산 등록 |

#### 1.4 `survey_responses` - 서베이 응답
```sql
- id: BIGSERIAL PRIMARY KEY
- supabase_user_id: UUID
- question_code: VARCHAR(50) (공통 코드 참조)
- response_value: TEXT
- created_at, updated_at: TIMESTAMP
```

#### 1.5 `user_attendance` - 출석 체크 내역
```sql
- id: BIGSERIAL PRIMARY KEY
- supabase_user_id: UUID
- attendance_date: DATE
- created_at: TIMESTAMP
- UNIQUE(supabase_user_id, attendance_date)
```

---

## 🔧 2. 헬퍼 함수

### 2.1 `award_points()` - 포인트 적립
```sql
SELECT award_points(
  p_user_id := 'user-uuid',
  p_action_type := 'REVIEW',
  p_description := '리뷰 작성',
  p_reference_id := 123
);
```

### 2.2 `check_in_attendance()` - 출석 체크
```sql
SELECT check_in_attendance(p_user_id := 'user-uuid');

-- 반환값:
{
  "success": true,
  "message": "출석 체크 완료! 포인트가 적립되었습니다.",
  "points": 10
}
```

---

## 🎨 3. UI 구현

### 3.1 Sidebar 메뉴 변경
- **이전**: 설정 ⚙️
- **이후**: 서베이 📋

### 3.2 프로필 영역 - 포인트 표시
```tsx
<button className={styles.pointsButton}>
  <span>💰</span>
  <span>내 포인트: 1,250P</span>
  <span>›</span>
</button>
```

### 3.3 서베이 화면
- 공통 코드(`SURVEY`)에서 질문 로드
- 선택지는 `description` 필드의 쉼표 구분 값
- 첫 응답 완료 시 50P 자동 적립
- 기존 응답은 업데이트만 (중복 적립 방지)

**질문 예시**:
```
- 연령대를 선택해주세요 (20대, 30대, 40대...)
- 직업을 선택해주세요 (직장인, 자영업...)
- 주로 이용하는 거래 유형은? (매매, 전세, 월세...)
```

### 3.4 포인트 상세 화면
**구성**:
1. **보유 포인트**: 현재 포인트 표시
2. **출석 체크 버튼**: 하루 1회, 10P 적립
3. **포인트 받는 방법**: 정책 목록 표시
4. **포인트 내역**: 최근 20건 거래 내역

---

## 🔐 4. RLS (Row Level Security) 정책

### 4.1 `user_points`
- **SELECT**: 본인 포인트만 조회
- **ALL**: 시스템이 관리 (트리거 자동 업데이트)

### 4.2 `point_transactions`
- **SELECT**: 본인 거래 내역 조회 / 관리자는 전체 조회
- **INSERT**: 시스템이 생성

### 4.3 포인트 정책 (공통 코드)
- 공통 코드 테이블(`common_code_detail`)의 RLS 정책을 따름
- `code_group = 'POINT_POLICY'`로 필터링
- 관리자는 공통 코드 관리 화면에서 수정 가능

### 4.4 `survey_responses`
- **SELECT**: 본인 응답 조회 / 관리자는 전체 조회
- **INSERT/UPDATE**: 본인 응답만 생성/수정

### 4.5 `user_attendance`
- **SELECT**: 본인 출석 내역 조회 / 관리자는 전체 조회
- **INSERT**: 본인 출석만 생성

---

## 🚀 5. 사용 흐름

### 5.1 서베이 응답
```
1. 사이드바 → "서베이" 클릭
2. 질문 목록 표시 (공통 코드에서 로드)
3. 선택지 클릭 → 자동 저장
4. 첫 응답 완료 시 → 50P 적립 알림
```

### 5.2 포인트 확인
```
1. 사이드바 프로필 영역 → "내 포인트" 클릭
2. 보유 포인트, 획득 방법, 내역 확인
```

### 5.3 출석 체크
```
1. 포인트 화면 → "📅 출석 체크" 버튼 클릭
2. 하루 1회 제한 (중복 방지)
3. 성공 시 10P 적립
```

### 5.4 자동 포인트 적립 (향후 구현)
```typescript
// 리뷰 작성 완료 후
await supabase.rpc('award_points', {
  p_user_id: session.user.id,
  p_action_type: 'REVIEW',
  p_description: '리뷰 작성',
  p_reference_id: reviewId
});

// 계약서 등록 완료 후
await supabase.rpc('award_points', {
  p_user_id: session.user.id,
  p_action_type: 'CONTRACT',
  p_description: '계약서 등록',
  p_reference_id: contractId
});

// 관심 부동산 등록 후
await supabase.rpc('award_points', {
  p_user_id: session.user.id,
  p_action_type: 'FAVORITE',
  p_description: '관심 부동산 등록',
  p_reference_id: agentId
});
```

---

## 📊 6. 공통 코드 데이터

### 6.1 서베이 카테고리 및 질문

#### 서베이 카테고리 생성 (`common_code_master`)
```sql
INSERT INTO common_code_master (code_group, code_group_name, description, use_yn, sta_ymd, end_ymd)
VALUES ('SURVEY', '서베이', '사용자 서베이 질문', 'Y', '20240101', '99991231');
```

#### 서베이 질문 생성 (`common_code_detail`)
```sql
INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
VALUES 
  ('SURVEY', 'CURRENT_STATUS', 'Q1. 지금 당신 상황은?', '지금 집을 구하는 중,3개월 내 계획,최근 1년 내 계약해봄,정보만 모으는 중', 1, 'Y', '20240101', '99991231'),
  ('SURVEY', 'STRESS_POINT', 'Q2. 집을 구할 때 가장 스트레스받는 단계는?', '매물 탐색(허위 매물 판별 등),임장 및 집 상태 확인(수압/층간소음 등),계약 및 복비 협의(계약서 독소조항/중개수수료 등),대출 및 잔금 처리,부동산 정책', 2, 'Y', '20240101', '99991231'),
  ('SURVEY', 'WANTED_FEATURE', 'Q3. 복비까비가 제공하면 가장 먼저 쓰고 싶은 건?', '실제 계약자 후기 열람,적정 복비 계산/비교,계약서 자동 검토(위험 특약 체크),집주인/권리관계 위험 신호 체크(등기/체납 등),체크리스트(임장/계약)', 3, 'Y', '20240101', '99991231');
```

**질문 구성**:
- **Q1**: 현재 상황 파악 (타겟 사용자 세그먼트 확인)
- **Q2**: 페인 포인트 발견 (스트레스 단계 분석)
- **Q3**: 핵심 니즈 파악 (우선순위 기능 확인)

### 6.2 포인트 정책 카테고리 및 정책

#### 포인트 정책 카테고리 생성 (`common_code_master`)
```sql
INSERT INTO common_code_master (code_group, code_group_name, description, use_yn, sta_ymd, end_ymd)
VALUES ('POINT_POLICY', '포인트 정책', '액션별 포인트 지급 정책', 'Y', '20240101', '99991231');
```

#### 포인트 정책 생성 (`common_code_detail`)
```sql
INSERT INTO common_code_detail (code_group, code_value, code_name, description, sort_order, use_yn, sta_ymd, end_ymd)
VALUES 
  ('POINT_POLICY', 'ATTENDANCE', '10', '매일 출석 체크', 1, 'Y', '20240101', '99991231'),
  ('POINT_POLICY', 'CONTRACT', '100', '계약서 등록', 2, 'Y', '20240101', '99991231'),
  ('POINT_POLICY', 'SURVEY', '50', '서베이 완료', 3, 'Y', '20240101', '99991231'),
  ('POINT_POLICY', 'REVIEW', '200', '리뷰 작성', 4, 'Y', '20240101', '99991231'),
  ('POINT_POLICY', 'FAVORITE', '5', '관심 부동산 등록', 5, 'Y', '20240101', '99991231');
```

**공통 코드 관리**:

#### 1. 카테고리 생성 (`common_code_master`)
Supabase → Table Editor → `common_code_master`
- `code_group`: 카테고리 코드 (예: `SURVEY`)
- `code_group_name`: 카테고리 명 (예: `서베이`)
- `description`: 설명
- `use_yn`: `Y` (사용), `N` (미사용)
- `sta_ymd`: 시작일 (예: `20240101`)
- `end_ymd`: 종료일 (예: `99991231`)

#### 2. 상세 코드 추가 (`common_code_detail`)
Supabase → Table Editor → `common_code_detail`

**서베이 질문 추가**:
- `code_group`: `SURVEY`
- `code_value`: 고유 코드 (예: `REGION`)
- `code_name`: 질문 텍스트
- `description`: 선택지 (쉼표 구분)
- `sort_order`: 표시 순서
- `use_yn`: `Y` (사용), `N` (미사용)
- `sta_ymd`: 시작일 (예: `20240101`)
- `end_ymd`: 종료일 (예: `99991231`)

**포인트 정책 수정**:
- `code_group`: `POINT_POLICY`
- `code_value`: 액션 타입 (예: `REVIEW`)
- `code_name`: 포인트 숫자 (예: `200`)
- `description`: 설명
- `sort_order`: 표시 순서
- `use_yn`: `Y` (사용), `N` (미사용)
- `sta_ymd`: 시작일 (예: `20240101`)
- `end_ymd`: 종료일 (예: `99991231`)

---

## 🎯 7. 향후 개선 사항

### 7.1 자동 포인트 적립 연동
- [ ] 리뷰 작성 시 자동 적립
- [ ] 계약서 등록 시 자동 적립
- [ ] 관심 부동산 등록 시 자동 적립

### 7.2 포인트 사용 기능
- [ ] 포인트 차감 로직 구현
- [ ] 포인트 상품 교환
- [ ] 포인트 기프티콘 전환

### 7.3 관리자 기능
- [ ] 서베이 응답 통계 대시보드
- [x] 포인트 정책 관리 (공통 코드 관리로 가능)
- [ ] 사용자별 포인트 조정 기능

### 7.4 알림 기능
- [ ] 포인트 적립 알림
- [ ] 출석 체크 리마인더
- [ ] 서베이 참여 요청

---

## ✅ 완료 체크리스트

- [x] DB 스키마 생성 (`user_points`, `point_transactions`, `survey_responses`, `user_attendance`)
- [x] 포인트 정책을 공통 코드(`POINT_POLICY`)로 관리
- [x] 서베이 질문을 공통 코드(`SURVEY`)로 관리
- [x] RLS 정책 설정
- [x] 헬퍼 함수 생성 (`award_points`, `check_in_attendance`)
- [x] 공통 코드 초기 데이터 삽입
- [x] Sidebar UI 수정 (설정 → 서베이)
- [x] 프로필 영역에 포인트 표시
- [x] 서베이 화면 구현
- [x] 포인트 상세 화면 구현
- [x] 출석 체크 기능 구현
- [x] CSS 스타일링

---

## 🧪 테스트 방법

### 1. DB 마이그레이션 실행
```
Supabase Dashboard → SQL Editor → 
파일 내용 붙여넣기 → Run
```

### 2. 서버 재시작
```powershell
npm run dev
```

### 3. 테스트 시나리오
```
1. 로그인
2. 햄버거 메뉴 → 프로필에서 포인트 확인 (초기 0P)
3. "내 포인트" 클릭 → 상세 화면 확인
4. "📅 출석 체크" 클릭 → 10P 적립 확인
5. 뒤로가기 → "서베이" 클릭
6. 질문에 답변 → 50P 적립 확인
7. 포인트 내역에서 거래 기록 확인
```

---

## 📞 문의

구현 중 문제가 발생하면 다음을 확인하세요:
1. Supabase SQL 실행 로그
2. 브라우저 콘솔 에러
3. RLS 정책 활성화 여부
4. 공통 코드 데이터 존재 여부

---

**구현 완료!** 🎉

