import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 중개사무소 검색 API (서버 사이드)
 *
 * 스마트 파싱: 공백으로 토큰 분리 후 AND 검색
 * 각 토큰이 상호명 또는 주소에 포함되면 결과에 포함
 *
 * GET /api/search-agents?q=강남 사랑&region=서울특별시
 * GET /api/search-agents?q=미금&region=성남&mode=autocomplete (자동완성: 경량 응답)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')?.trim() || ''
  const region = searchParams.get('region')?.trim() || ''
  const mode = searchParams.get('mode')?.trim() || ''

  if (!query) {
    return NextResponse.json({ data: [], reviews: {} })
  }

  try {
    // 스마트 파싱: 공백으로 토큰 분리
    const tokens = query
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 0)

    // 각 토큰에 대해 agent_name 또는 road_address 또는 lot_address에 포함 조건 (AND)
    let dbQuery = supabaseAdmin
      .from('agent_master')
      .select('id, agent_name, road_address, lot_address, latitude, longitude')

    for (const token of tokens) {
      dbQuery = dbQuery.or(
        `agent_name.ilike.%${token}%,road_address.ilike.%${token}%,lot_address.ilike.%${token}%`
      )
    }

    if (region) {
      dbQuery = dbQuery.or(`road_address.ilike.%${region}%,lot_address.ilike.%${region}%`)
    }

    const limit = mode === 'autocomplete' ? 8 : 50
    const { data: agents, error: agentsError } = await dbQuery.limit(limit)

    if (agentsError) {
      console.error('[search-agents] 검색 오류:', agentsError.message)
      return NextResponse.json(
        { error: 'DB 조회 중 오류가 발생했습니다.', details: agentsError.message },
        { status: 500 }
      )
    }

    // AND 필터링: 모든 토큰이 상호명+주소 결합 텍스트에 포함되어야 함
    const filteredAgents = (agents || []).filter((agent: any) => {
      const combined = [
        agent.agent_name || '',
        agent.road_address || '',
        agent.lot_address || '',
      ].join(' ').toLowerCase()

      return tokens.every(token => combined.includes(token.toLowerCase()))
    })

    // 검색어 관련성 가중치 정렬
    const scoredAgents = filteredAgents.map((agent: any) => {
      let score = 0
      const name = (agent.agent_name || '').toLowerCase()
      const addr = (agent.road_address || agent.lot_address || '').toLowerCase()

      for (const token of tokens) {
        const t = token.toLowerCase()
        if (name.includes(t)) score += 10
        if (name.startsWith(t)) score += 5
        if (addr.includes(t)) score += 3
      }

      // 정확히 일치하는 이름에 높은 가중치
      if (name === query.toLowerCase()) score += 50

      return { ...agent, _score: score }
    })

    scoredAgents.sort((a: any, b: any) => b._score - a._score)

    // _score 필드 제거
    const resultAgents = scoredAgents.map(({ _score, ...rest }: any) => rest)

    // 자동완성 모드: 리뷰 조회 생략 (경량 응답)
    if (mode === 'autocomplete') {
      return NextResponse.json({ data: resultAgents, reviews: {} })
    }

    // 리뷰 평균 별점 + 건수 조회
    const reviews: Record<number, number> = {}
    const reviewCounts: Record<number, number> = {}

    if (resultAgents.length > 0) {
      const agentIds = resultAgents.map((a: any) => a.id)

      const { data: reviewsData, error: reviewsError } = await supabaseAdmin
        .from('agent_reviews')
        .select('agent_id, fee_satisfaction, expertise, kindness, property_reliability, response_speed')
        .in('agent_id', agentIds)
        .or('is_hidden.is.null,is_hidden.eq.false')

      if (reviewsError) {
        console.error('[search-agents] 리뷰 조회 오류:', reviewsError.message, reviewsError.details)
      }

      if (!reviewsError && reviewsData) {
        console.log(`[search-agents] 리뷰 데이터 ${reviewsData.length}건 조회 (agentIds: ${agentIds.join(',')})`)

        // agent별 리뷰 평점 집계 + 전체 리뷰 건수 (평점 null 포함)
        const agentReviewRatings = new Map<number, number[]>()
        const agentReviewTotals = new Map<number, number>()

        reviewsData.forEach((review: any) => {
          // 전체 리뷰 건수 (평점 null이어도 카운트)
          agentReviewTotals.set(review.agent_id, (agentReviewTotals.get(review.agent_id) || 0) + 1)

          const ratings = [
            review.fee_satisfaction,
            review.expertise,
            review.kindness,
            review.property_reliability,
            review.response_speed,
          ].filter((r: any) => r !== null && r !== undefined) as number[]

          if (ratings.length > 0) {
            const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            if (!agentReviewRatings.has(review.agent_id)) {
              agentReviewRatings.set(review.agent_id, [])
            }
            agentReviewRatings.get(review.agent_id)!.push(avg)
          } else {
            console.warn(`[search-agents] agent_id=${review.agent_id} 리뷰의 평점 필드가 모두 null`)
          }
        })

        // 평점 있는 리뷰 평균
        agentReviewRatings.forEach((ratings, agentId) => {
          const overallAvg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          reviews[agentId] = Math.round(overallAvg * 10) / 10
        })

        // 리뷰 건수는 평점 null 포함 전체 건수
        agentReviewTotals.forEach((count, agentId) => {
          reviewCounts[agentId] = count
        })
      }
    }

    return NextResponse.json({ data: resultAgents, reviews, reviewCounts })
  } catch (error: any) {
    console.error('[search-agents] 예외:', error.message)
    return NextResponse.json(
      { error: 'DB 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
