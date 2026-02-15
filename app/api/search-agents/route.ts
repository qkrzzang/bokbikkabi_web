import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 중개사무소 검색 API (서버 사이드)
 *
 * 클라이언트에서 Supabase PostgREST 직접 호출 대신
 * 서버에서 supabaseAdmin(Service Role)으로 안정적으로 조회
 *
 * GET /api/search-agents?q=미금&region=성남
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')?.trim() || ''
  const region = searchParams.get('region')?.trim() || ''

  if (!query) {
    return NextResponse.json({ data: [], reviews: {} })
  }

  try {
    // 1. 중개사무소 검색
    let dbQuery = supabaseAdmin
      .from('agent_master')
      .select('id, agent_name, road_address, lot_address, latitude, longitude')
      .or(`agent_name.ilike.%${query}%,road_address.ilike.%${query}%,lot_address.ilike.%${query}%`)

    if (region) {
      dbQuery = dbQuery.or(`road_address.ilike.%${region}%,lot_address.ilike.%${region}%`)
    }

    const { data: agents, error: agentsError } = await dbQuery.limit(50)

    if (agentsError) {
      console.error('[search-agents] 검색 오류:', agentsError.message)
      return NextResponse.json(
        { error: 'DB 조회 중 오류가 발생했습니다.', details: agentsError.message },
        { status: 500 }
      )
    }

    // 2. 검색된 중개사무소의 리뷰 평균 별점 조회
    const reviews: Record<number, number> = {}

    if (agents && agents.length > 0) {
      const agentIds = agents.map((a: any) => a.id)

      const { data: reviewsData, error: reviewsError } = await supabaseAdmin
        .from('agent_reviews')
        .select('agent_id, fee_satisfaction, expertise, kindness, property_reliability, response_speed')
        .in('agent_id', agentIds)
        .or('is_hidden.is.null,is_hidden.eq.false')

      if (!reviewsError && reviewsData) {
        // 중개사무소별 평균 별점 계산
        const agentReviews = new Map<number, number[]>()

        reviewsData.forEach((review: any) => {
          const ratings = [
            review.fee_satisfaction,
            review.expertise,
            review.kindness,
            review.property_reliability,
            review.response_speed,
          ].filter((r: any) => r !== null && r !== undefined) as number[]

          if (ratings.length > 0) {
            const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            if (!agentReviews.has(review.agent_id)) {
              agentReviews.set(review.agent_id, [])
            }
            agentReviews.get(review.agent_id)!.push(avg)
          }
        })

        agentReviews.forEach((ratings, agentId) => {
          const overallAvg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          reviews[agentId] = Math.round(overallAvg * 10) / 10
        })
      }
    }

    return NextResponse.json({ data: agents || [], reviews })
  } catch (error: any) {
    console.error('[search-agents] 예외:', error.message)
    return NextResponse.json(
      { error: 'DB 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
