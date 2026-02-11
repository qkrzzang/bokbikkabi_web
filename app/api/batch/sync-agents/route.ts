import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 최대 5분 (Vercel Pro 기준)

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Service Role Key가 있으면 사용, 없으면 Anon Key로 대체
  const key = serviceKey || anonKey
  if (!url || !key) {
    throw new Error('Supabase URL 또는 API Key가 설정되지 않았습니다.')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// 공공데이터 API 설정
const API_BASE_URL = 'http://api.data.go.kr/openapi/tn_pubr_public_med_office_api'
const NUM_OF_ROWS = 1000

/**
 * 중개사 데이터 동기화 배치 API
 * 
 * 동작 방식:
 * 1. 전달(이전 달) 1일부터 말일까지 crtrYmd를 순회
 * 2. 각 날짜별로 pageNo를 증가시키며 모든 데이터 수집
 * 3. agent_number 기준으로 INSERT 또는 UPDATE (UPSERT)
 * 4. 배치 로그를 batch_job_logs 테이블에 기록
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  let jobId: number | null = null
  let logId: number | null = null
  let totalInserted = 0
  let totalUpdated = 0
  let totalErrors = 0
  let totalApiCalls = 0
  const db = getSupabaseAdmin()

  try {
    // 요청 바디에서 job_id 추출 (옵션)
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // body가 없어도 OK
    }
    jobId = body?.job_id || null

    const serviceKey = process.env.PUBLIC_SERVICE_API
    if (!serviceKey) {
      throw new Error('PUBLIC_SERVICE_API 환경변수가 설정되지 않았습니다.')
    }

    // 배치 로그 시작 기록
    if (jobId) {
      const { data: logData } = await db
        .from('batch_job_logs')
        .insert({
          job_id: jobId,
          status: 'RUNNING',
          started_at: new Date().toISOString(),
          message: '중개사 데이터 동기화 시작',
        })
        .select('id')
        .single()
      logId = logData?.id || null

      // batch_jobs 상태 업데이트
      await db
        .from('batch_jobs')
        .update({
          last_run_at: new Date().toISOString(),
          last_status: 'RUNNING',
          last_message: '동기화 진행 중...',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    // 전달(이전 달) 날짜 범위 계산
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const dates: string[] = []
    for (let d = new Date(prevMonth); d <= lastDayOfPrevMonth; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      dates.push(`${yyyy}-${mm}-${dd}`)
    }

    console.log(`[배치] 동기화 대상 기간: ${dates[0]} ~ ${dates[dates.length - 1]} (${dates.length}일)`)

    // 각 날짜별로 API 호출
    for (const crtrYmd of dates) {
      let pageNo = 1
      let hasMore = true

      while (hasMore) {
        try {
          const url = `${API_BASE_URL}?serviceKey=${serviceKey}&crtrYmd=${crtrYmd}&pageNo=${pageNo}&numOfRows=${NUM_OF_ROWS}&type=xml`

          console.log(`[배치] API 호출: crtrYmd=${crtrYmd}, pageNo=${pageNo}`)
          totalApiCalls++

          const response = await fetch(url, {
            signal: AbortSignal.timeout(30000), // 30초 타임아웃
          })

          if (!response.ok) {
            console.error(`[배치] API HTTP 오류: ${response.status} ${response.statusText}`)
            totalErrors++
            hasMore = false
            continue
          }

          const xmlText = await response.text()

          // XML 파싱
          const items = parseXmlItems(xmlText)

          if (!items || items.length === 0) {
            hasMore = false
            continue
          }

          // 데이터 UPSERT 처리
          for (const item of items) {
            try {
              const agentNumber = item.estblRegNo?.trim()
              if (!agentNumber) continue

              const agentData: any = {
                agent_name: item.medOfficeNm?.trim() || null,
                agent_number: agentNumber,
                agent_type: item.opbizLreaClscSe?.trim() || null,
                road_address: item.lctnRoadNmAddr?.trim() || null,
                lot_address: item.lctnLotnoAddr?.trim() || null,
                phone_number: item.telno?.trim() || null,
                registration_date: item.estblRegYmd?.trim() || null,
                insurance_joined: item.ddcJoinYn?.trim() === 'Y',
                representative_name: item.rprsvNm?.trim() || null,
                latitude: item.latitude ? parseFloat(item.latitude) : null,
                longitude: item.longitude ? parseFloat(item.longitude) : null,
                data_reference_date: item.crtrYmd?.trim() || null,
                provider_code: item.insttCode?.trim() || null,
                provider_name: item.insttNm?.trim() || null,
                updated_at: new Date().toISOString(),
              }

              // agent_number 기준 UPSERT
              const { data: existing } = await db
                .from('agent_master')
                .select('id')
                .eq('agent_number', agentNumber)
                .maybeSingle()

              if (existing) {
                // UPDATE
                const { error: updateError } = await db
                  .from('agent_master')
                  .update(agentData)
                  .eq('agent_number', agentNumber)

                if (updateError) {
                  console.error(`[배치] UPDATE 오류 (${agentNumber}):`, updateError.message)
                  totalErrors++
                } else {
                  totalUpdated++
                }
              } else {
                // INSERT
                const { error: insertError } = await db
                  .from('agent_master')
                  .insert(agentData)

                if (insertError) {
                  console.error(`[배치] INSERT 오류 (${agentNumber}):`, insertError.message)
                  totalErrors++
                } else {
                  totalInserted++
                }
              }
            } catch (itemErr: any) {
              console.error(`[배치] 개별 아이템 처리 오류:`, itemErr.message)
              totalErrors++
            }
          }

          // 다음 페이지 확인
          const totalCount = parseTotalCount(xmlText)
          if (pageNo * NUM_OF_ROWS >= totalCount) {
            hasMore = false
          } else {
            pageNo++
          }

        } catch (pageErr: any) {
          console.error(`[배치] 페이지 처리 오류 (${crtrYmd}, page ${pageNo}):`, pageErr.message)
          totalErrors++
          hasMore = false
        }
      }
    }

    // 완료 메시지 생성
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const resultMessage = `동기화 완료: INSERT ${totalInserted}건, UPDATE ${totalUpdated}건, 오류 ${totalErrors}건, API ${totalApiCalls}회 호출 (${elapsed}초)`
    console.log(`[배치] ${resultMessage}`)

    // 배치 로그/상태 업데이트
    if (logId) {
      await db
        .from('batch_job_logs')
        .update({
          status: totalErrors > 0 ? 'SUCCESS' : 'SUCCESS',
          finished_at: new Date().toISOString(),
          message: resultMessage,
        })
        .eq('id', logId)
    }

    if (jobId) {
      await db
        .from('batch_jobs')
        .update({
          last_status: 'SUCCESS',
          last_message: resultMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    return NextResponse.json({
      success: true,
      message: resultMessage,
      details: {
        inserted: totalInserted,
        updated: totalUpdated,
        errors: totalErrors,
        apiCalls: totalApiCalls,
        elapsed: `${elapsed}s`,
      },
    })

  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const errorMessage = `동기화 실패: ${error.message} (${elapsed}초)`
    console.error(`[배치] ${errorMessage}`)

    // 배치 로그/상태 업데이트 (실패)
    if (logId) {
      await db
        .from('batch_job_logs')
        .update({
          status: 'FAILED',
          finished_at: new Date().toISOString(),
          message: errorMessage,
          error_detail: error.stack || error.message,
        })
        .eq('id', logId)
    }

    if (jobId) {
      await db
        .from('batch_jobs')
        .update({
          last_status: 'FAILED',
          last_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 })
  }
}

/**
 * 간단한 XML 파싱 - <item> 요소들을 추출
 * DOMParser가 서버에 없으므로 정규식 기반 파싱
 */
function parseXmlItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]
    const item: Record<string, string> = {}

    // 각 태그의 값을 추출
    const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g
    let tagMatch

    while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
      item[tagMatch[1]] = tagMatch[2].trim()
    }

    if (Object.keys(item).length > 0) {
      items.push(item)
    }
  }

  return items
}

/**
 * XML에서 totalCount 추출
 */
function parseTotalCount(xml: string): number {
  const match = xml.match(/<totalCount>(\d+)<\/totalCount>/)
  return match ? parseInt(match[1], 10) : 0
}
