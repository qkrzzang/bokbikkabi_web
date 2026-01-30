# Supabase 프로젝트 일시중지 문제 해결

## 🔴 증상
- DB 타임아웃 15초 초과
- 네트워크 연결은 정상이지만 DB 응답 없음
- 브라우저 콘솔: `[검색] ⏱️ 타임아웃 (15초 초과) - DB 응답 없음`

---

## 🎯 원인

**Supabase 무료 티어: 7일간 미사용 시 자동 일시중지**

프로젝트가 Paused 상태가 되면:
- DB 연결 불가
- 첫 요청 시 10-30초 소요 (Cold start)
- 재시작 필요

---

## ✅ 해결 방법

### 1. 프로젝트 상태 확인

1. **Supabase Dashboard 접속**: https://app.supabase.com
2. 프로젝트 선택: `ijzxpnfiqwjlkhpbqjgk`
3. 상단에 다음 메시지 확인:
   ```
   ⚠️ Project is paused
   ```

### 2. 프로젝트 재시작

1. 상단의 **"Resume"** 또는 **"Restore"** 버튼 클릭
2. 재시작 대기 (2-5분 소요)
3. 상태가 **"Active"**로 변경되는지 확인

### 3. 재시작 완료 후 테스트

1. 브라우저에서 앱 새로고침 (Ctrl+F5)
2. 검색 기능 테스트
3. 브라우저 콘솔 확인:
   ```
   [검색] ✅ Supabase 연결 성공 (XXXms)
   ```

---

## 🔄 자동 일시중지 방지

무료 티어 제약사항:
- **7일간 API 요청 없으면 자동 일시중지**
- **재시작 시 Cold start 발생**

예방 방법:
1. 최소 주 1회 접속
2. Health check 스케줄러 설정 (Vercel Cron 등)
3. 유료 플랜 업그레이드 고려 (Pro: $25/월)

---

## 🧪 프로젝트 상태 확인 스크립트

PowerShell에서 실행:

```powershell
# Supabase 상태 확인
$response = Invoke-WebRequest -Uri "https://ijzxpnfiqwjlkhpbqjgk.supabase.co/rest/v1/?apikey=YOUR_ANON_KEY" -Method Get -TimeoutSec 20
Write-Host "Status: $($response.StatusCode)"
```

**결과**:
- `200 OK`: 정상 작동
- `타임아웃`: 프로젝트 일시중지 가능성

---

## 📊 현재 상태 체크리스트

- [x] 네트워크 연결 정상 (포트 443 연결 성공)
- [ ] Supabase 프로젝트 Active 상태
- [ ] DB 응답 정상 (15초 내)

**다음 작업**: Supabase Dashboard에서 프로젝트 상태 확인 및 Resume 클릭!

