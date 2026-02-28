import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { cached, hashQuery, invalidate } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')?.trim() || ''
  const region = searchParams.get('region')?.trim() || ''
  const mode = searchParams.get('mode')?.trim() || ''

  if (!query) {
    return NextResponse.json({ data: [], reviews: {} })
  }

  try {
    const cacheKey = `search:${mode || 'full'}:${region || 'all'}:${hashQuery(query)}`
    const ttl = mode === 'autocomplete' ? 3600 : 1800

    const result = await cached(cacheKey, ttl, async () => {
      return await searchAgents(query, region, mode)
    })

    const response = NextResponse.json(result)
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=59'
    )
    return response
  } catch (error: any) {
    console.error('[search-agents] 예외:', error.message)
    return NextResponse.json(
      { error: 'DB 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}

async function searchAgents(query: string, region: string, mode: string) {
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
      throw new Error(agentsError.message)
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
    const queryLower = query.toLowerCase()
    const scoredAgents = filteredAgents.map((agent: any) => {
      let score = 0
      const name = (agent.agent_name || '').toLowerCase()
      const roadAddr = (agent.road_address || '').toLowerCase()
      const lotAddr = (agent.lot_address || '').toLowerCase()

      // 전체 검색어가 도로명에 포함 (가장 강한 신호)
      if (roadAddr.includes(queryLower)) score += 100
      // 전체 검색어가 지번에 포함
      if (lotAddr.includes(queryLower)) score += 80

      // 정확히 일치하는 이름
      if (name === queryLower) score += 50
      if (name.includes(queryLower)) score += 30

      for (const token of tokens) {
        const t = token.toLowerCase()
        if (name.includes(t)) score += 10
        if (name.startsWith(t)) score += 5
        if (roadAddr.includes(t)) score += 3
        if (lotAddr.includes(t)) score += 3

        // 주소 내 번호 정확 매칭 (단어 경계) — "55"가 "555"에 부분 매칭되는 것을 방지
        if (/^\d/.test(t)) {
          const roadWords = roadAddr.split(/[\s,\-]+/)
          if (roadWords.some((w: string) => w === t)) score += 30
          const lotWords = lotAddr.split(/[\s,\-]+/)
          if (lotWords.some((w: string) => w === t)) score += 20
        }
      }

      return { ...agent, _score: score }
    })

    scoredAgents.sort((a: any, b: any) => b._score - a._score)

    // 자동완성 모드: 리뷰 조회 생략 (경량 응답)
    if (mode === 'autocomplete') {
      const resultAgents = scoredAgents.map(({ _score, ...rest }: any) => rest)
      return { data: resultAgents, reviews: {} }
    }

    // 리뷰 평균 별점 + 건수 조회
    const reviews: Record<number, number> = {}
    const reviewCounts: Record<number, number> = {}

    const agentIds = scoredAgents.map((a: any) => a.id)

    if (agentIds.length > 0) {
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

        const agentReviewRatings = new Map<number, number[]>()
        const agentReviewTotals = new Map<number, number>()

        reviewsData.forEach((review: any) => {
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

        agentReviewRatings.forEach((ratings, agentId) => {
          const overallAvg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          reviews[agentId] = Math.round(overallAvg * 10) / 10
        })

        agentReviewTotals.forEach((count, agentId) => {
          reviewCounts[agentId] = count
        })
      }
    }

    // 관련성 + 리뷰 복합 정렬: 관련성이 월등히 높으면 리뷰 유무보다 우선
    scoredAgents.sort((a: any, b: any) => {
      const scoreDiff = b._score - a._score
      // 관련성 점수 차이가 크면 (전체 주소 매칭 vs 부분 매칭) 관련성 우선
      if (Math.abs(scoreDiff) >= 50) return scoreDiff

      // 관련성 비슷할 때 리뷰 있는 업체 우선
      const aHasReview = reviewCounts[a.id] ? 1 : 0
      const bHasReview = reviewCounts[b.id] ? 1 : 0
      if (aHasReview !== bHasReview) return bHasReview - aHasReview
      const aRating = reviews[a.id] || 0
      const bRating = reviews[b.id] || 0
      if (aRating !== bRating) return bRating - aRating
      return scoreDiff
    })

    const resultAgents = scoredAgents.map(({ _score, ...rest }: any) => rest)

    return { data: resultAgents, reviews, reviewCounts }
  } catch (error: any) {
    console.error('[searchAgents] DB 오류:', error.message)
    throw error
  }
}

/**
 * 리뷰 등록/변경 후 검색 캐시 무효화용 엔드포인트
 * POST /api/search-agents  { action: 'invalidate-cache' }
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    if (action === 'invalidate-cache') {
      await invalidate('search:*')
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[search-agents POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
