# Supabase 데이터베이스 설정 가이드

## 새로운 Supabase 프로젝트 초기화

### 1. Supabase 프로젝트 생성

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. **New Project** 클릭
3. 프로젝트 정보 입력:
   - **Name**: `bokbikkabi` (원하는 이름)
   - **Database Password**: 안전한 비밀번호 설정
   - **Region**: `Northeast Asia (Seoul)` 권장
4. 프로젝트 생성 완료 대기 (약 2분 소요)

### 2. 데이터베이스 스키마 생성

#### 방법 1: SQL Editor 사용 (권장)

1. Supabase 대시보드에서 **SQL Editor** 클릭
2. **New Query** 클릭
3. `supabase/init_database.sql` 파일의 내용을 복사하여 붙여넣기
4. **Run** 버튼 클릭 (Ctrl+Enter)
5. 완료 메시지 확인

#### 방법 2: 파일 업로드

1. SQL Editor에서 우측 상단 **...** 메뉴 클릭
2. **Import SQL** 선택
3. `supabase/init_database.sql` 파일 선택
4. 실행

### 3. 환경변수 설정

1. Supabase 대시보드에서 **Settings** > **API** 이동
2. 다음 값을 복사:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJhbG...` (긴 문자열)

3. 프로젝트 루트의 `.env.local` 파일에 추가:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 4. 초기 관리자 계정 설정

1. 웹 애플리케이션에서 일반 사용자로 로그인 (카카오 또는 Gmail)
2. Supabase 대시보드에서 **Table Editor** > **users** 테이블 이동
3. 본인 계정의 `user_type`을 `ADMIN`으로 수정
4. 새로고침 후 관리자 메뉴 확인

### 5. 검증

데이터베이스가 올바르게 생성되었는지 확인:

```sql
-- 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 예상 결과:
-- access_logs
-- agent_comments
-- agent_master
-- agent_reviews
-- common_code_detail
-- common_code_master
-- favorite_agents
-- users
```

## 테이블 구조

### 핵심 테이블

| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `users` | 사용자 정보 | email, nickname, user_type, user_grade |
| `agent_master` | 중개사무소 정보 | agent_name, agent_number, road_address |
| `agent_reviews` | 리뷰 정보 | agent_id, ratings, tags, review_text |
| `common_code_master` | 공통코드 마스터 | code_group, code_group_name |
| `common_code_detail` | 공통코드 상세 | code_value, code_name, extra_value1~5 |
| `agent_comments` | 댓글 | agent_id, content |
| `favorite_agents` | 관심 중개사무소 | user_id, agent_id |
| `access_logs` | 접속 로그 | user_id, action, created_at |

### 주요 기능

- ✅ **RLS (Row Level Security)**: 모든 테이블에 적용
- ✅ **자동 타임스탬프**: `created_at`, `updated_at` 자동 관리
- ✅ **트리거**: 신규 사용자 자동 등록
- ✅ **인덱스 최적화**: trigram 인덱스로 검색 성능 향상
- ✅ **외래키**: 데이터 무결성 보장
- ✅ **초기 데이터**: 공통코드 자동 삽입

## 마이그레이션 파일 관리

### 개별 마이그레이션 파일 (개발용)
`supabase/migrations/` 폴더에는 개별 마이그레이션 파일들이 있습니다:
- 각 파일은 특정 변경사항을 담고 있음
- 기존 데이터베이스에 점진적으로 적용할 때 유용
- 개발 히스토리 추적 가능

### 통합 초기화 파일 (배포용)
`supabase/init_database.sql`은 모든 마이그레이션을 통합한 파일:
- ✅ 새로운 Supabase 프로젝트 초기화용
- ✅ 전체 스키마를 한 번에 생성
- ✅ 테스트 환경 구축용

## 트러블슈팅

### "relation does not exist" 오류
- 테이블이 생성되지 않았음
- `init_database.sql`을 다시 실행

### "permission denied" 오류
- RLS 정책 미적용
- SQL Editor에서 실행 중 오류 확인

### "duplicate key value" 오류
- 스크립트가 이미 실행됨
- 테이블을 삭제하고 재실행:
  ```sql
  DROP TABLE IF EXISTS public.access_logs CASCADE;
  DROP TABLE IF EXISTS public.favorite_agents CASCADE;
  DROP TABLE IF EXISTS public.agent_comments CASCADE;
  DROP TABLE IF EXISTS public.agent_reviews CASCADE;
  DROP TABLE IF EXISTS public.common_code_detail CASCADE;
  DROP TABLE IF EXISTS public.common_code_master CASCADE;
  DROP TABLE IF EXISTS public.agent_master CASCADE;
  DROP TABLE IF EXISTS public.users CASCADE;
  ```

## 참고사항

- 무료 티어: 500MB 데이터베이스
- 7일 미사용 시 자동 일시중지 (무료 티어)
- 백업 권장: Settings > Database > Backups

---

**마지막 업데이트**: 2025-01-25
