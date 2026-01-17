# Supabase 마이그레이션 가이드

## 공인중개사 Master 테이블 생성

### 방법 1: Supabase Dashboard 사용

1. Supabase 프로젝트에 로그인
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. `supabase/migrations/create_broker_master_table.sql` 파일의 내용을 복사하여 붙여넣기
4. **Run** 버튼 클릭하여 실행

### 방법 2: Supabase CLI 사용

```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# Supabase 프로젝트 초기화 (이미 초기화된 경우 생략)
supabase init

# 마이그레이션 파일 실행
supabase db push
```

## 테이블 구조

### broker_master 테이블

공인중개사 정보를 관리하는 Master 테이블입니다.

#### 주요 필드

- `id`: 고유 ID (자동 증가)
- `office_name`: 중개사무소명 (필수)
- `registration_number`: 개설등록번호 (필수, 유니크)
- `broker_type`: 개업공인중개사종별구분
- `road_address`: 소재지도로명주소
- `lot_address`: 소재지지번주소
- `phone_number`: 전화번호
- `registration_date`: 개설등록일자
- `insurance_joined`: 공제가입유무 (기본값: false)
- `representative_name`: 대표자명
- `latitude`: 위도
- `longitude`: 경도
- `assistant_count`: 중개보조원수 (기본값: 0)
- `broker_count`: 소속공인중개사수 (기본값: 0)
- `website_url`: 홈페이지주소
- `data_reference_date`: 데이터기준일자
- `provider_code`: 제공기관코드
- `provider_name`: 제공기관명
- `created_at`: 생성일시 (자동)
- `updated_at`: 수정일시 (자동)

#### 인덱스

- `registration_number`: 개설등록번호 검색 최적화
- `office_name`: 중개사무소명 검색 최적화
- `latitude, longitude`: 위치 기반 검색 최적화
- `provider_code`: 제공기관코드 검색 최적화

#### 자동 기능

- `updated_at` 필드는 레코드가 업데이트될 때마다 자동으로 현재 시간으로 갱신됩니다.

## 다음 단계

Master 테이블 생성 후, Slave 테이블(평가 관리 테이블)을 생성할 예정입니다.
