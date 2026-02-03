# Supabase 보안 설정 가이드

## 📋 Security Advisor 경고 해결

### ✅ 완료: RLS 활성화 (ERROR → 해결)

모든 테이블에 RLS(Row Level Security)가 활성화되었습니다:
- `users`, `access_logs`, `favorite_agents`, `agent_master`
- `common_code_master`, `common_code_detail`
- `agent_reviews`, `agent_comments`

---

### ⚠️ 경고: Function Search Path (WARN)

**문제**: 3개 함수에 `search_path`가 설정되지 않음
- `search_agents_by_name`
- `update_updated_at_column`
- `cleanup_old_access_logs`

**해결**: `supabase/migrations/fix_function_search_path.sql` 실행

**Supabase Dashboard → SQL Editor**에서 해당 파일의 SQL을 실행하세요.

---

### ⚠️ 경고: Leaked Password Protection (WARN)

**문제**: HaveIBeenPwned 비밀번호 유출 검사 비활성화

**해결**:
1. **Supabase Dashboard** 접속
2. **Authentication** → **Policies**
3. **Password Requirements** 섹션
4. **Check against breach database** 활성화

또는 SQL:
```sql
-- Supabase CLI 사용 시
UPDATE auth.config 
SET value = 'true' 
WHERE parameter = 'password_hibp_enabled';
```

**참고**: 이 설정은 Dashboard에서만 변경 가능할 수 있습니다.

---

## 🔧 RLS와 DB 끊김의 관계

### RLS 비활성화 시 문제점:
1. ❌ 보안 취약점 (모든 데이터 무제한 접근)
2. ❌ 권한 오류로 인한 쿼리 실패 → 재시도 → 연결 부하
3. ❌ Supabase 쿼리 최적화 미작동

### RLS 활성화 후 개선:
1. ✅ 적절한 권한 제어
2. ✅ 쿼리 성능 최적화
3. ✅ 보안 강화

---

## 📊 현재 상태

### 해결됨 (ERROR):
- ✅ 8개 테이블 RLS 활성화 완료

### 남은 작업 (WARN):
- ⚠️ 함수 search_path 설정 (3개)
- ⚠️ 비밀번호 유출 검사 활성화 (선택사항)

**WARN 수준은 치명적이지 않지만, 보안 강화를 위해 수정 권장합니다.**

---

## 🎯 다음 단계

1. **필수**: `fix_function_search_path.sql` 실행 (보안 강화)
2. **선택**: Password Protection 활성화 (사용자 보안)
3. **모니터링**: Security Advisor에서 경고 사라지는지 확인

모든 경고를 해결하면 DB 안정성과 보안이 크게 개선됩니다!

