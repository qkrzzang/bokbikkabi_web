import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { cached, hashQuery, invalidate } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')?.trim() || ''
  const region = searchParams.get('region')?.trim() || ''
  const mode = searchParams.get('mode')?.trim() || ''

  if (mode === 'nearby') {
    return handleNearbySearch(searchParams)
  }

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

async function handleNearbySearch(params: URLSearchParams) {
  const lat = parseFloat(params.get('lat') || '')
  const lng = parseFloat(params.get('lng') || '')
  const radius = Math.min(parseFloat(params.get('radius') || '2'), 10)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat, lng 파라미터가 필요합니다.' }, { status: 400 })
  }

  try {
    const searchRadius = Math.max(radius, 1)
    const boxLat = searchRadius * 0.011
    const boxLng = searchRadius * 0.013

    // 1) 좌표가 있는 중개사: 넓은 bounding box 검색
    const { data: geoAgents } = await supabaseAdmin
      .from('agent_master')
      .select('id, agent_name, road_address, lot_address, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', lat - boxLat)
      .lte('latitude', lat + boxLat)
      .gte('longitude', lng - boxLng)
      .lte('longitude', lng + boxLng)
      .limit(500)

    // 2) 좌표 미보유 중개사만 주소 기반 검색 (구 단위까지 구체적으로)
    const areaNames = await reverseGeocode(lat, lng)
    let addressAgents: any[] = []

    if (areaNames) {
      const areas = Array.isArray(areaNames) ? areaNames : [areaNames]
      console.log(`[nearby] 지역 추정: ${areas.join(' / ')}`)

      for (const area of areas) {
        const { data } = await supabaseAdmin
          .from('agent_master')
          .select('id, agent_name, road_address, lot_address, latitude, longitude')
          .is('latitude', null)
          .or(`road_address.ilike.%${area}%,lot_address.ilike.%${area}%`)
          .limit(200)
        if (data) addressAgents.push(...data)
      }
    }

    // 3) 결과 병합 (중복 제거)
    const seenIds = new Set<number>()
    const allAgents: any[] = []
    for (const a of [...(geoAgents || []), ...addressAgents]) {
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id)
        allAgents.push(a)
      }
    }

    // 4) 좌표 없는 중개사는 Geocoding 후 DB에 저장 (최대 50건 병렬)
    const needGeocode = allAgents.filter(a => !a.latitude || !a.longitude)
    if (needGeocode.length > 0) {
      const batch = needGeocode.slice(0, 50)
      const results = await Promise.allSettled(
        batch.map(a => geocodeAndSave(a))
      )
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          const target = allAgents.find(a => a.id === batch[i].id)
          if (target) {
            target.latitude = r.value.lat
            target.longitude = r.value.lng
          }
        }
      })
    }

    // 5) 거리 계산 및 필터링
    const kmPerDegreeLat = 111.32
    const kmPerDegreeLng = 111.32 * Math.cos(lat * Math.PI / 180)
    const nearby = allAgents
      .filter(a => a.latitude && a.longitude)
      .map(a => {
        const dLat = (a.latitude - lat) * kmPerDegreeLat
        const dLng = (a.longitude - lng) * kmPerDegreeLng
        const dist = Math.sqrt(dLat * dLat + dLng * dLng)
        return { ...a, distance: Math.round(dist * 1000) }
      })
      .filter(a => a.distance <= radius * 1000)
      .sort((a, b) => a.distance - b.distance)

    // 6) 리뷰 조회
    const agentIds = nearby.map(a => a.id)
    const reviews: Record<number, number> = {}
    const reviewCounts: Record<number, number> = {}

    if (agentIds.length > 0) {
      const { data: reviewsData } = await supabaseAdmin
        .from('agent_reviews')
        .select('agent_id, fee_satisfaction, expertise, kindness, property_reliability, response_speed')
        .in('agent_id', agentIds)
        .or('is_hidden.is.null,is_hidden.eq.false')

      if (reviewsData) {
        const ratingMap = new Map<number, number[]>()
        const countMap = new Map<number, number>()
        reviewsData.forEach((r: any) => {
          countMap.set(r.agent_id, (countMap.get(r.agent_id) || 0) + 1)
          const vals = [r.fee_satisfaction, r.expertise, r.kindness, r.property_reliability, r.response_speed].filter(Boolean) as number[]
          if (vals.length > 0) {
            if (!ratingMap.has(r.agent_id)) ratingMap.set(r.agent_id, [])
            ratingMap.get(r.agent_id)!.push(vals.reduce((s, v) => s + v, 0) / vals.length)
          }
        })
        ratingMap.forEach((ratings, id) => { reviews[id] = Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 })
        countMap.forEach((cnt, id) => { reviewCounts[id] = cnt })
      }
    }

    console.log(`[nearby] 결과: ${nearby.length}곳 (좌표 보유 ${(geoAgents || []).length}건 + 미보유 주소검색 ${addressAgents.length}건, 지오코딩 ${needGeocode.length}건)`)
    return NextResponse.json({ data: nearby, reviews, reviewCounts })
  } catch (error: any) {
    console.error('[search-agents nearby] 오류:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string[] | null> {
  const clientId = process.env.NAVER_GEOCODING_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  const clientSecret = process.env.NAVER_GEOCODING_CLIENT_SECRET || process.env.NAVER_MAP_CLIENT_SECRET

  if (clientId && clientSecret) {
    try {
      const url = `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&output=json&orders=legalcode`
      const res = await fetch(url, {
        headers: {
          'x-ncp-apigw-api-key-id': clientId,
          'x-ncp-apigw-api-key': clientSecret,
        },
      })
      if (res.ok) {
        const text = await res.text()
        if (text) {
          const data = JSON.parse(text)
          const result = data?.results?.[0]
          if (result?.region) {
            const r = result.region
            const area1 = r.area1?.name || ''
            const area2 = r.area2?.name || ''
            const area3 = r.area3?.name || ''
            const results: string[] = []
            if (area1 && area2 && area3) results.push(`${area2} ${area3}`)
            if (area1 && area2) results.push(`${area1} ${area2}`)
            if (results.length > 0) {
              console.log(`[nearby] Naver 역지오코딩 성공: ${results.join(', ')}`)
              return results
            }
          }
        }
      } else {
        console.warn(`[nearby] Naver 역지오코딩 실패 (HTTP ${res.status}) — fallback 사용`)
      }
    } catch (e: any) {
      console.warn(`[nearby] Naver 역지오코딩 예외: ${e.message} — fallback 사용`)
    }
  }

  const areas = estimateAreaFromCoords(lat, lng)
  if (areas) console.log(`[nearby] 좌표 기반 지역 추정: ${areas.join(', ')}`)
  return areas
}

const KOREA_DISTRICTS: { name: string; parent: string; lat: [number, number]; lng: [number, number] }[] = [
  // 서울 25개 구
  { name: '강남구', parent: '서울특별시', lat: [37.47, 37.53], lng: [127.01, 127.09] },
  { name: '서초구', parent: '서울특별시', lat: [37.46, 37.51], lng: [126.97, 127.04] },
  { name: '송파구', parent: '서울특별시', lat: [37.49, 37.53], lng: [127.08, 127.15] },
  { name: '강동구', parent: '서울특별시', lat: [37.52, 37.56], lng: [127.11, 127.18] },
  { name: '마포구', parent: '서울특별시', lat: [37.54, 37.57], lng: [126.89, 126.96] },
  { name: '용산구', parent: '서울특별시', lat: [37.52, 37.55], lng: [126.96, 127.01] },
  { name: '종로구', parent: '서울특별시', lat: [37.57, 37.60], lng: [126.96, 127.02] },
  { name: '중구', parent: '서울특별시', lat: [37.55, 37.57], lng: [126.97, 127.01] },
  { name: '성동구', parent: '서울특별시', lat: [37.54, 37.57], lng: [127.02, 127.07] },
  { name: '광진구', parent: '서울특별시', lat: [37.53, 37.56], lng: [127.07, 127.11] },
  { name: '동대문구', parent: '서울특별시', lat: [37.57, 37.60], lng: [127.03, 127.07] },
  { name: '중랑구', parent: '서울특별시', lat: [37.58, 37.62], lng: [127.07, 127.10] },
  { name: '성북구', parent: '서울특별시', lat: [37.58, 37.61], lng: [126.99, 127.03] },
  { name: '강북구', parent: '서울특별시', lat: [37.61, 37.65], lng: [126.99, 127.03] },
  { name: '도봉구', parent: '서울특별시', lat: [37.65, 37.69], lng: [127.01, 127.06] },
  { name: '노원구', parent: '서울특별시', lat: [37.62, 37.66], lng: [127.05, 127.10] },
  { name: '은평구', parent: '서울특별시', lat: [37.59, 37.64], lng: [126.90, 126.95] },
  { name: '서대문구', parent: '서울특별시', lat: [37.56, 37.59], lng: [126.93, 126.97] },
  { name: '영등포구', parent: '서울특별시', lat: [37.51, 37.54], lng: [126.89, 126.93] },
  { name: '동작구', parent: '서울특별시', lat: [37.49, 37.52], lng: [126.93, 126.99] },
  { name: '관악구', parent: '서울특별시', lat: [37.46, 37.49], lng: [126.93, 126.98] },
  { name: '금천구', parent: '서울특별시', lat: [37.44, 37.47], lng: [126.89, 126.92] },
  { name: '구로구', parent: '서울특별시', lat: [37.48, 37.51], lng: [126.85, 126.90] },
  { name: '양천구', parent: '서울특별시', lat: [37.51, 37.54], lng: [126.85, 126.89] },
  { name: '강서구', parent: '서울특별시', lat: [37.54, 37.58], lng: [126.81, 126.86] },
  // 성남시 3개 구
  { name: '분당구', parent: '경기도 성남시', lat: [37.35, 37.42], lng: [127.08, 127.18] },
  { name: '수정구', parent: '경기도 성남시', lat: [37.43, 37.47], lng: [127.10, 127.16] },
  { name: '중원구', parent: '경기도 성남시', lat: [37.42, 37.45], lng: [127.09, 127.14] },
  // 수원시 4개 구
  { name: '장안구', parent: '경기도 수원시', lat: [37.29, 37.32], lng: [126.97, 127.02] },
  { name: '권선구', parent: '경기도 수원시', lat: [37.24, 37.28], lng: [126.94, 127.00] },
  { name: '팔달구', parent: '경기도 수원시', lat: [37.27, 37.30], lng: [126.98, 127.02] },
  { name: '영통구', parent: '경기도 수원시', lat: [37.25, 37.29], lng: [127.01, 127.08] },
  // 용인시 3개 구
  { name: '처인구', parent: '경기도 용인시', lat: [37.15, 37.27], lng: [127.12, 127.25] },
  { name: '기흥구', parent: '경기도 용인시', lat: [37.24, 37.30], lng: [127.07, 127.15] },
  { name: '수지구', parent: '경기도 용인시', lat: [37.30, 37.34], lng: [127.06, 127.12] },
  // 고양시 3개 구
  { name: '덕양구', parent: '경기도 고양시', lat: [37.63, 37.68], lng: [126.82, 126.90] },
  { name: '일산동구', parent: '경기도 고양시', lat: [37.65, 37.70], lng: [126.74, 126.82] },
  { name: '일산서구', parent: '경기도 고양시', lat: [37.66, 37.71], lng: [126.70, 126.77] },
  // 경기 단일 시/군
  { name: '경기도 안양시', parent: '', lat: [37.38, 37.42], lng: [126.90, 126.97] },
  { name: '경기도 부천시', parent: '', lat: [37.48, 37.52], lng: [126.76, 126.84] },
  { name: '경기도 화성시', parent: '', lat: [37.15, 37.28], lng: [126.72, 127.03] },
  { name: '경기도 안산시', parent: '', lat: [37.28, 37.35], lng: [126.77, 126.87] },
  { name: '경기도 남양주시', parent: '', lat: [37.56, 37.70], lng: [127.10, 127.25] },
  { name: '경기도 의정부시', parent: '', lat: [37.72, 37.78], lng: [127.02, 127.08] },
  { name: '경기도 시흥시', parent: '', lat: [37.34, 37.41], lng: [126.73, 126.82] },
  { name: '경기도 파주시', parent: '', lat: [37.71, 37.88], lng: [126.70, 126.82] },
  { name: '경기도 광명시', parent: '', lat: [37.45, 37.49], lng: [126.85, 126.89] },
  { name: '경기도 광주시', parent: '', lat: [37.36, 37.45], lng: [127.20, 127.33] },
  { name: '경기도 하남시', parent: '', lat: [37.51, 37.56], lng: [127.17, 127.24] },
  { name: '경기도 김포시', parent: '', lat: [37.59, 37.67], lng: [126.67, 126.76] },
  { name: '경기도 구리시', parent: '', lat: [37.58, 37.62], lng: [127.12, 127.15] },
  // 광역시
  { name: '인천광역시', parent: '', lat: [37.35, 37.60], lng: [126.55, 126.80] },
  { name: '부산광역시', parent: '', lat: [35.05, 35.25], lng: [128.90, 129.20] },
  { name: '대구광역시', parent: '', lat: [35.80, 35.95], lng: [128.50, 128.75] },
  { name: '대전광역시', parent: '', lat: [36.30, 36.42], lng: [127.30, 127.48] },
  { name: '광주광역시', parent: '', lat: [35.10, 35.22], lng: [126.80, 126.95] },
  { name: '울산광역시', parent: '', lat: [35.48, 35.62], lng: [129.20, 129.45] },
  { name: '세종특별자치시', parent: '', lat: [36.47, 36.62], lng: [126.90, 127.10] },
  { name: '제주특별자치도', parent: '', lat: [33.20, 33.55], lng: [126.15, 126.95] },
]

function estimateAreaFromCoords(lat: number, lng: number): string[] | null {
  const matched: string[] = []

  for (const d of KOREA_DISTRICTS) {
    if (lat >= d.lat[0] && lat <= d.lat[1] && lng >= d.lng[0] && lng <= d.lng[1]) {
      if (d.parent) {
        matched.push(`${d.parent} ${d.name}`)
      } else {
        matched.push(d.name)
      }
    }
  }

  if (matched.length > 0) return matched

  if (lat >= 37.43 && lat <= 37.70 && lng >= 126.80 && lng <= 127.20) return ['서울특별시']
  if (lat >= 37.10 && lat <= 37.90 && lng >= 126.60 && lng <= 127.40) return ['경기도']
  return null
}

async function geocodeAndSave(agent: any): Promise<{ lat: number; lng: number } | null> {
  const address = agent.road_address || agent.lot_address
  if (!address) return null

  const clientId = process.env.NAVER_GEOCODING_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  const clientSecret = process.env.NAVER_GEOCODING_CLIENT_SECRET || process.env.NAVER_MAP_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const url = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`
    const res = await fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key': clientSecret,
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.addresses?.[0]) return null

    const coords = { lat: parseFloat(data.addresses[0].y), lng: parseFloat(data.addresses[0].x) }
    if (isNaN(coords.lat) || isNaN(coords.lng)) return null

    await supabaseAdmin
      .from('agent_master')
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq('id', agent.id)

    return coords
  } catch {
    return null
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

    const dbLimit = mode === 'autocomplete' ? 50 : 50
    const { data: agents, error: agentsError } = await dbQuery.limit(dbLimit)

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

    // 자동완성 모드: 관련성 상위 8건만 반환, 리뷰 조회 생략 (경량 응답)
    if (mode === 'autocomplete') {
      const resultAgents = scoredAgents.slice(0, 8).map(({ _score, ...rest }: any) => rest)
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
