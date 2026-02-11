-- ============================================
-- 배치 작업 관리 테이블
-- ============================================

-- 1. 배치 작업 정의 테이블
CREATE TABLE IF NOT EXISTS public.batch_jobs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,            -- 배치 작업명
  job_description TEXT,                       -- 배치 설명
  cron_expression VARCHAR(50) NOT NULL,       -- crontab 표현식 (예: '0 2 * * *')
  cron_description VARCHAR(200),              -- cron 한글 설명 (예: '매일 02:00')
  is_active BOOLEAN DEFAULT true,             -- 활성화 여부
  endpoint_url TEXT,                          -- 실행할 API 엔드포인트 URL
  last_run_at TIMESTAMP WITH TIME ZONE,       -- 마지막 실행 시간
  last_status VARCHAR(20) DEFAULT 'IDLE',     -- 마지막 실행 상태 (IDLE, RUNNING, SUCCESS, FAILED)
  last_message TEXT,                          -- 마지막 실행 메시지
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 배치 실행 로그 테이블
CREATE TABLE IF NOT EXISTS public.batch_job_logs (
  id SERIAL PRIMARY KEY,
  job_id INT NOT NULL REFERENCES public.batch_jobs(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,                -- RUNNING, SUCCESS, FAILED
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  message TEXT,                               -- 실행 결과 메시지
  error_detail TEXT,                          -- 에러 상세
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_batch_jobs_is_active ON public.batch_jobs(is_active);
CREATE INDEX idx_batch_job_logs_job_id ON public.batch_job_logs(job_id, created_at DESC);

-- RLS 활성화
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_job_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책 - 관리자만 접근
CREATE POLICY "Admins can view batch_jobs"
  ON public.batch_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage batch_jobs"
  ON public.batch_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

CREATE POLICY "Admins can view batch_job_logs"
  ON public.batch_job_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage batch_job_logs"
  ON public.batch_job_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.supabase_user_id = (SELECT auth.uid())
      AND users.user_type = 'ADMIN'
    )
  );

-- 3. 초기 데이터: 중개사 데이터 동기화
-- ※ endpoint_url은 실제 배포 도메인으로 변경 필요 (예: https://your-domain.com/api/batch/sync-agents)
INSERT INTO public.batch_jobs (job_name, job_description, cron_expression, cron_description, is_active, endpoint_url)
VALUES (
  '중개사 데이터 동기화',
  '공공데이터 API에서 중개사 정보를 가져와 agent_master 테이블에 동기화합니다. 전달 1일~말일 기준 데이터를 수집합니다.',
  '0 2 1 * *',
  '매월 1일 02:00',
  true,
  '/api/batch/sync-agents'
);
