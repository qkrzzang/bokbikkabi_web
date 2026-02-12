import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Cron 트리거 API
 * 
 * 외부 cron 서비스나 Vercel Cron에서 매분 호출.
 * batch_jobs 테이블에서 활성화된 작업을 조회하고,
 * cron_expression과 현재 시간을 매칭하여 해당 배치를 실행합니다.
 * 
 * 보안: CRON_SECRET 헤더로 인증 (선택)
 */
export async function GET(request: Request) {
  try {
    // 선택적 보안 체크
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const db = getSupabaseAdmin()


    // 활성화된 배치 작업 조회
    const { data: jobs, error } = await db
      .from('batch_jobs')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('[Cron] 배치 작업 조회 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: '실행할 배치 작업이 없습니다.', triggered: 0 })
    }

    const now = new Date()
    const triggered: string[] = []

    for (const job of jobs) {
      // cron_expression 매칭 확인
      if (matchCron(job.cron_expression, now)) {
        // 이미 실행 중이면 스킵
        if (job.last_status === 'RUNNING') {
          console.log(`[Cron] "${job.job_name}" 이미 실행 중, 스킵`)
          continue
        }

        // endpoint_url이 있으면 호출
        if (job.endpoint_url) {
          // 상대 경로면 현재 요청의 origin 기준으로 절대 URL 생성
          let url = job.endpoint_url
          if (url.startsWith('/')) {
            const requestUrl = new URL(request.url)
            url = `${requestUrl.origin}${url}`
          }

          console.log(`[Cron] "${job.job_name}" 트리거: ${url}`)

          try {
            // 비동기로 배치 실행 (응답을 기다리지 않음)
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ job_id: job.id }),
            }).catch((err) => {
              console.error(`[Cron] "${job.job_name}" 호출 오류:`, err.message)
            })

            triggered.push(job.job_name)
          } catch (err: any) {
            console.error(`[Cron] "${job.job_name}" 트리거 오류:`, err.message)
          }
        } else {
          console.log(`[Cron] "${job.job_name}" endpoint_url 미설정, 스킵`)
        }
      }
    }

    return NextResponse.json({
      message: `${triggered.length}건의 배치를 트리거했습니다.`,
      triggered,
      checkedAt: now.toISOString(),
    })

  } catch (error: any) {
    console.error('[Cron] 예외:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * 간단한 Cron 표현식 매칭
 * 형식: 분 시 일 월 요일
 * 예: "0 2 * * *" → 매일 02:00
 * 
 * 지원: 숫자, *, 콤마(,), 범위(-), 간격(/)
 */
function matchCron(expression: string, date: Date): boolean {
  try {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) return false

    const [minuteExpr, hourExpr, dayExpr, monthExpr, dowExpr] = parts

    const minute = date.getMinutes()
    const hour = date.getHours()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const dow = date.getDay() // 0=일, 6=토

    return (
      matchField(minuteExpr, minute, 0, 59) &&
      matchField(hourExpr, hour, 0, 23) &&
      matchField(dayExpr, day, 1, 31) &&
      matchField(monthExpr, month, 1, 12) &&
      matchDow(dowExpr, dow)
    )
  } catch {
    return false
  }
}

function matchField(expr: string, value: number, min: number, max: number): boolean {
  if (expr === '*') return true

  const parts = expr.split(',')
  for (const part of parts) {
    // 간격: */5 또는 1-10/2
    if (part.includes('/')) {
      const [rangeStr, stepStr] = part.split('/')
      const step = parseInt(stepStr, 10)
      if (isNaN(step) || step <= 0) continue

      let start = min
      let end = max

      if (rangeStr !== '*') {
        if (rangeStr.includes('-')) {
          const [s, e] = rangeStr.split('-').map(Number)
          start = s
          end = e
        } else {
          start = parseInt(rangeStr, 10)
        }
      }

      for (let i = start; i <= end; i += step) {
        if (i === value) return true
      }
      continue
    }

    // 범위: 1-5
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (value >= start && value <= end) return true
      continue
    }

    // 단일 값
    if (parseInt(part, 10) === value) return true
  }

  return false
}

function matchDow(expr: string, dow: number): boolean {
  if (expr === '*') return true

  // 7도 일요일로 처리
  const parts = expr.split(',')
  for (const part of parts) {
    const val = parseInt(part, 10)
    if (val === dow || (val === 7 && dow === 0)) return true
  }

  return false
}
