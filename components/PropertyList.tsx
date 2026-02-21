'use client'

import { useEffect, useState, useRef } from 'react'
import PropertyDetailModal from './PropertyDetailModal'
import styles from './PropertyList.module.css'
import { supabase } from '@/lib/supabase/client'
import { useAlert } from '@/contexts/AlertContext'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'

interface Property {
  id: string
  name: string
  address: string
  rating: number
  reviewCount: number
  latitude?: number
  longitude?: number
}

interface Review {
  id: string
  author: string
  rating: number
  date: string
  content: string
  userLevel?: string
  transactionTags?: string[]
  praiseTags?: string[]
  regretTags?: string[]
  detailedEvaluation?: {
    category: string
    score: number
    }[]
}

interface PropertyDetail {
  id: string
  name: string
  address: string
  rating: number
  reviewCount: number
  transactionTags: string[]
  praiseTags: string[]
  regretTags: string[]
  detailedEvaluation: {
    category: string
    score: number
    comment?: string
  }[]
  keySummary: {
    recommendRate: number
    discountRate: number
    explanationRate: number
  }
  reviews?: Review[]
  latitude?: number
  longitude?: number
}

interface PropertyListProps {
  searchQuery: string
  searchRegion?: string
  autoOpenAgentId?: number | null
  onAutoOpenComplete?: () => void
}

// 목업 데이터
const mockProperties: Property[] = [
  {
    id: 'mock-1',
    name: '미금퍼스트공인중개사사무소(테스트)',
    address: '경기도 성남시 분당구 미금일로90번길 10, 1층(구미동)',
    rating: 4.5,
    reviewCount: 3,
  },
  {
    id: 'mock-2',
    name: '기쁨부동산',
    address: '서울특별시 성북구 동소문로 109 (동선동4가)',
    rating: 4.7,
    reviewCount: 5,
  },
]

// 상세 정보 목업 데이터
const getPropertyDetail = (id: string): PropertyDetail | null => {
  const details: Record<string, PropertyDetail> = {
    'mock-1': {
      id: 'mock-1',
      name: '미금퍼스트공인중개사사무소(테스트)',
      address: '경기도 성남시 분당구 미금일로90번길 10, 1층(구미동)',
      rating: 4.5,
      reviewCount: 152,
      transactionTags: ['#전월세', '#급하게구함'],
      praiseTags: ['#네고의신', '#대출전문가', '#주말상담가능'],
      regretTags: ['#연락두절', '#허위매물'],
      detailedEvaluation: [
        { category: '수수료 만족도', score: 3.5, comment: '(조금 아쉬워요)' },
        { category: '전문성/지식', score: 4.8, comment: '(법잘알!)' },
        { category: '친절/태도', score: 4.0 },
        { category: '매물 신뢰도', score: 3.0 },
        { category: '응답 속도', score: 4.9 },
      ],
      keySummary: {
        recommendRate: 85,
        discountRate: 40,
        explanationRate: 98,
      },
      reviews: [
        {
          id: '1',
          author: 'qkr*****',
          rating: 5,
          date: '2024.01.15',
          content: '정말 친절하고 전문적인 중개사분이세요. 전월세 계약이었는데도 불구하고 차근차근 설명해주시고, 계약서도 꼼꼼히 검토해주셨습니다. 특히 대출 관련해서도 조언을 많이 해주셔서 도움이 많이 되었어요. 추천합니다!',
          transactionTags: ['#전월세'],
          praiseTags: ['#네고의신', '#대출전문가'],
          regretTags: [],
          detailedEvaluation: [
            { category: '수수료 만족도', score: 5.0 },
            { category: '전문성/지식', score: 5.0 },
            { category: '친절/태도', score: 5.0 },
            { category: '매물 신뢰도', score: 4.5 },
            { category: '응답 속도', score: 5.0 },
          ],
        },
        {
          id: '2',
          author: 'hong****',
          rating: 4,
          date: '2024.01.10',
          content: '수수료 협의 부분에서 조금 아쉬웠지만, 전반적으로 만족스러운 거래였습니다. 중개사분이 법률 지식이 뛰어나셔서 계약 과정에서 불안했던 부분들을 잘 해결해주셨고, 매물 정보도 정확하게 제공해주셨어요. 응답 속도가 빠르신 것도 장점입니다.',
          transactionTags: ['#전월세'],
          praiseTags: ['#전문성/지식'],
          regretTags: [],
          detailedEvaluation: [
            { category: '수수료 만족도', score: 3.5 },
            { category: '전문성/지식', score: 5.0 },
            { category: '친절/태도', score: 4.0 },
            { category: '매물 신뢰도', score: 4.0 },
            { category: '응답 속도', score: 4.5 },
          ],
        },
        {
          id: '3',
          author: 'kim12****',
          rating: 4.5,
          date: '2024.01.05',
          content: '급하게 집을 구해야 하는 상황이었는데, 빠르게 좋은 매물을 찾아주셨어요. 주말에도 상담이 가능하셔서 정말 감사했습니다. 다만 처음에 연락이 잘 안 되었던 부분이 있어서 아쉬웠지만, 이후로는 원활하게 소통이 되었습니다. 전반적으로 추천합니다!',
          transactionTags: ['#급하게구함'],
          praiseTags: ['#주말상담가능'],
          regretTags: ['#연락두절'],
          detailedEvaluation: [
            { category: '수수료 만족도', score: 4.0 },
            { category: '전문성/지식', score: 4.5 },
            { category: '친절/태도', score: 4.5 },
            { category: '매물 신뢰도', score: 4.0 },
            { category: '응답 속도', score: 3.5 },
          ],
        },
      ],
    },
    'mock-2': {
      id: 'mock-2',
      name: '기쁨부동산',
      address: '서울특별시 성북구 동소문로 109 (동선동4가)',
      rating: 4.7,
      reviewCount: 89,
      transactionTags: ['#첫거래', '#조건까다로움'],
      praiseTags: ['#동네토박이', '#차로픽업', '#주말상담가능'],
      regretTags: ['#설명부족', '#강매유도'],
      detailedEvaluation: [
        { category: '수수료 만족도', score: 4.5 },
        { category: '전문성/지식', score: 4.6 },
        { category: '친절/태도', score: 4.8, comment: '(매우 친절해요!)' },
        { category: '매물 신뢰도', score: 4.2 },
        { category: '응답 속도', score: 4.5 },
      ],
      keySummary: {
        recommendRate: 92,
        discountRate: 55,
        explanationRate: 75,
      },
      reviews: [
        {
          id: '4',
          author: 'park***',
          rating: 5,
          date: '2024.01.20',
          content: '첫 집 구매라서 걱정이 많았는데, 중개사분이 너무 친절하게 모든 것을 설명해주셨어요. 동네 정보도 자세히 알려주시고, 직접 차로 픽업까지 해주셔서 정말 감사했습니다. 계약 설명도 꼼꼼히 해주셔서 안심하고 계약할 수 있었습니다. 강력 추천합니다!',
          transactionTags: ['#첫거래'],
          praiseTags: ['#동네토박이', '#차로픽업'],
          regretTags: [],
          detailedEvaluation: [
            { category: '수수료 만족도', score: 4.5 },
            { category: '전문성/지식', score: 5.0 },
            { category: '친절/태도', score: 5.0 },
            { category: '매물 신뢰도', score: 4.5 },
            { category: '응답 속도', score: 5.0 },
          ],
        },
        {
          id: '5',
          author: 'lee2024**',
          rating: 4.5,
          date: '2024.01.18',
          content: '조건이 까다로웠는데도 불구하고 최선을 다해서 매물을 찾아주셨어요. 중개사분이 이 동네에서 오래 일하셔서 동네 사정을 잘 아시는 것 같았습니다. 수수료 할인도 해주셔서 감사했고, 전반적으로 만족스러운 거래였습니다. 다만 처음 설명이 조금 부족했던 것 같아 아쉬웠어요.',
          transactionTags: ['#조건까다로움'],
          praiseTags: ['#동네토박이'],
          regretTags: ['#설명부족'],
          detailedEvaluation: [
            { category: '수수료 만족도', score: 4.5 },
            { category: '전문성/지식', score: 4.5 },
            { category: '친절/태도', score: 4.5 },
            { category: '매물 신뢰도', score: 4.5 },
            { category: '응답 속도', score: 4.5 },
          ],
        },
        {
          id: '6',
          author: 'choi123***',
          rating: 4,
          date: '2024.01.12',
          content: '주말에도 상담 가능하셔서 좋았습니다. 중개사분이 친절하시고 응답도 빠르셨어요. 매물 품질도 괜찮았고, 첫 거래라 걱정이 많았는데 잘 진행되었습니다. 다만 어떤 부분에서는 설명이 조금 부족했던 것 같아 아쉬웠지만, 전반적으로는 만족스러웠어요.',
          transactionTags: ['#첫거래'],
          praiseTags: ['#주말상담가능'],
          regretTags: ['#설명부족'],
          detailedEvaluation: [
            { category: '수수료 만족도', score: 4.0 },
            { category: '전문성/지식', score: 4.0 },
            { category: '친절/태도', score: 4.5 },
            { category: '매물 신뢰도', score: 4.0 },
            { category: '응답 속도', score: 4.5 },
          ],
        },
      ],
    },
  }
  return details[id] || null
}

export default function PropertyList({ searchQuery, searchRegion, autoOpenAgentId, onAutoOpenComplete }: PropertyListProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false) // 검색 실행 여부 추적
  const [selectedProperty, setSelectedProperty] = useState<PropertyDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { showError } = useAlert()
  const { user, isLoading: authLoading } = useAuth()

  // ── Debounce & Stale-response 방어용 Ref ──
  // searchQuery를 300ms 디바운스하여 빠른 연속 입력 시 API 호출 최소화
  const debouncedQuery = useDebounce(searchQuery, 300)
  // 최신 raw searchQuery를 ref로 유지 (비동기 응답 도착 시 stale 여부 판별)
  const latestQueryRef = useRef(searchQuery)
  latestQueryRef.current = searchQuery

  // 관심 부동산에서 클릭 시 상세 모달 열기
  // ID로 부동산 상세 정보 로드 (관심 부동산에서 호출)
  const loadPropertyDetailById = async (agentId: number) => {
    try {
      // agent_master에서 기본 정보 조회
      const { data: agentData, error: agentError } = await supabase
        .from('agent_master')
        .select('id, agent_name, road_address, lot_address, latitude, longitude')
        .eq('id', agentId)
        .single()

      if (agentError || !agentData) {
        console.error('[관심 부동산] 부동산 정보 조회 오류:', agentError)
        showError('부동산 정보를 불러올 수 없습니다.')
        return
      }

      const property: Property = {
        id: agentData.id.toString(),
        name: agentData.agent_name,
        address: agentData.road_address || agentData.lot_address || '',
        rating: 0,
        reviewCount: 0,
        latitude: agentData.latitude,
        longitude: agentData.longitude,
      }

      await handlePropertyClick(property)
    } catch (error) {
      console.error('[관심 부동산] 오류:', error)
      showError('부동산 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }

  const handlePropertyClick = async (property: Property) => {
    // 목업 데이터가 있으면 그대로 사용
    const mockDetail = getPropertyDetail(property.id)
    if (mockDetail) {
      setSelectedProperty(mockDetail)
      setIsModalOpen(true)
      return
    }

    // 실제 DB 데이터 조회
    try {
      // 사용자 등급 코드 매핑 정보 조회
      const { data: userGradeCodes } = await supabase
        .from('common_code_detail')
        .select('code_value, code_name')
        .eq('code_group', 'USER_GRADE')
        .eq('use_yn', 'Y')

      // 코드 매핑 객체 생성
      const gradeMap: Record<string, string> = {}
      userGradeCodes?.forEach((code: any) => {
        gradeMap[code.code_value] = code.code_name
      })

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('agent_reviews')
        .select(`
          *,
          user:users!supabase_user_id(email, user_grade)
        `)
        .eq('agent_id', parseInt(property.id))
        .or('is_hidden.is.null,is_hidden.eq.false')
        .order('created_at', { ascending: false })

      // 리뷰가 없어도 팝업 표시 (빈 리뷰로)
      const hasReviews = !reviewsError && reviewsData && reviewsData.length > 0

      // 리뷰가 없는 경우 기본 PropertyDetail 생성
      if (!hasReviews) {
        const emptyPropertyDetail: PropertyDetail = {
          id: property.id,
          name: property.name,
          address: property.address,
          rating: 0,
          reviewCount: 0,
          transactionTags: [],
          praiseTags: [],
          regretTags: [],
          detailedEvaluation: [],
          keySummary: {
            recommendRate: 0,
            discountRate: 0,
            explanationRate: 0,
          },
          reviews: [],
          latitude: property.latitude,
          longitude: property.longitude,
        }
        
        setSelectedProperty(emptyPropertyDetail)
        setIsModalOpen(true)
        return
      }

      // 태그 집계
      const allTransactionTags = new Set<string>()
      const allPraiseTags = new Set<string>()
      const allRegretTags = new Set<string>()
      
      reviewsData.forEach((review: any) => {
        if (review.transaction_tag) allTransactionTags.add(review.transaction_tag)
        if (review.praise_tags) review.praise_tags.forEach((tag: string) => allPraiseTags.add(tag))
        if (review.regret_tags) review.regret_tags.forEach((tag: string) => allRegretTags.add(tag))
      })

      // 평가 항목별 평균 계산
      const evaluationCategories = [
        { key: 'fee_satisfaction', label: '수수료 만족도' },
        { key: 'expertise', label: '전문성/지식' },
        { key: 'kindness', label: '친절/태도' },
        { key: 'property_reliability', label: '매물 신뢰도' },
        { key: 'response_speed', label: '응답 속도' },
      ]

      const detailedEvaluation = evaluationCategories.map(cat => {
        const scores = reviewsData
          .map((r: any) => r[cat.key])
          .filter((s: any) => s !== null && s !== undefined) as number[]
        const avg = scores.length > 0 
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
          : 0
        return {
          category: cat.label,
          score: Number(avg.toFixed(1)),
        }
      })

      // 전체 평균 별점
      const allScores = detailedEvaluation.map(e => e.score).filter(s => s > 0)
      const avgRating = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        : 0

      // Review 타입으로 변환
      const reviews: Review[] = reviewsData.map((r: any) => {
        const userEmail = r.user?.email || 'anonymous@example.com'
        const nickname = userEmail.split('@')[0]
        const userGradeCode = r.user?.user_grade || 'INJOO'
        const userGrade = gradeMap[userGradeCode] || '인주까비'
        
        const reviewEval = evaluationCategories.map(cat => ({
          category: cat.label,
          score: r[cat.key] || 0,
        }))

        return {
          id: r.id.toString(),
          author: nickname,
          rating: reviewEval.length > 0 
            ? reviewEval.reduce((sum, e) => sum + e.score, 0) / reviewEval.length 
            : 0,
          date: new Date(r.created_at).toLocaleDateString('ko-KR'),
          content: r.review_text || '',
          helpfulCount: r.helpful_count || 0,
          userLevel: userGrade,
          transactionTags: r.transaction_tag ? [r.transaction_tag] : [],
          praiseTags: r.praise_tags || [],
          regretTags: r.regret_tags || [],
          detailedEvaluation: reviewEval,
        }
      })

      const propertyDetail: PropertyDetail = {
        id: property.id,
        name: property.name,
        address: property.address,
        rating: Number(avgRating.toFixed(1)),
        reviewCount: reviewsData.length,
        transactionTags: Array.from(allTransactionTags),
        praiseTags: Array.from(allPraiseTags),
        regretTags: Array.from(allRegretTags),
        detailedEvaluation,
        keySummary: {
          recommendRate: 0,
          discountRate: 0,
          explanationRate: 0,
        },
        reviews,
        latitude: property.latitude,
        longitude: property.longitude,
      }

      setSelectedProperty(propertyDetail)
      setIsModalOpen(true)
    } catch (error) {
      console.error('[상세 정보] 조회 오류:', error)
      showError('부동산 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }

  // 검색 완료 후 자동으로 특정 부동산 상세 모달 열기
  useEffect(() => {
    if (autoOpenAgentId && properties.length > 0 && !loading) {
      // 검색 결과에서 해당 부동산 찾기
      const targetProperty = properties.find(p => parseInt(p.id) === autoOpenAgentId)
      
      if (targetProperty) {
        // 약간의 딜레이 후 모달 열기 (검색 결과 렌더링 후)
        setTimeout(async () => {
          await handlePropertyClick(targetProperty)
          if (onAutoOpenComplete) {
            onAutoOpenComplete()
          }
        }, 100)
      } else {
        // ID로 직접 로드
        setTimeout(async () => {
          await loadPropertyDetailById(autoOpenAgentId)
          if (onAutoOpenComplete) {
            onAutoOpenComplete()
          }
        }, 100)
      }
    }
  }, [properties, loading, autoOpenAgentId])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Effect 1: 검색어 초기화 (즉시 실행)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // raw searchQuery에 의존 → 디바운스 없이 즉시 반응.
  // authLoading 변경에 의한 중복 실행을 방지하기 위해 분리됨.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setProperties([])
      setHasSearched(false)
      setLoading(false) // 진행 중이던 로딩 상태도 즉시 해제
    }
  }, [searchQuery])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Effect 2: 검색 실행 (디바운스 + AbortController)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 의존성: debouncedQuery (300ms 디바운스 적용됨), searchRegion, authLoading
  //
  // [흐름]
  // 1. 사용자 입력 → searchQuery 즉시 변경
  // 2. 300ms 무입력 → debouncedQuery 업데이트 → 이 Effect 트리거
  // 3. 의존성 변경 시 cleanup → 진행 중인 fetch abort + cancelled 플래그
  // 4. 새 AbortController로 fresh request 시작
  //
  // [Race Condition 방어]
  // - cleanup에서 controller.abort() → 이전 요청 즉시 취소
  // - cancelled 플래그 → abort 후 상태 업데이트 차단
  // - latestQueryRef → 응답 도착 시점에 검색어가 비워진 경우 무시
  //
  useEffect(() => {
    // ── Guard 1: 검색어 없음 ──
    if (!debouncedQuery.trim()) return

    // ── Guard 2: 인증 초기화 대기 ──
    // AuthProvider가 세션 검증을 완료할 때까지 API 호출 보류.
    // authLoading이 false가 되면 user가 null(비로그인) 또는 User 객체(로그인)로 확정됨.
    if (authLoading) return

    // ── Guard 3: 비로그인 상태 명시적 분기 ──
    // 검색 API(/api/search-agents)는 공개 엔드포인트로, 비로그인 사용자도 검색 가능.
    // 인증이 필요한 기능(관심 등록, 리뷰 작성 등)은 각 모달/컴포넌트에서 별도 체크.
    //
    // ⚠️ 만약 향후 인증 필수로 변경 시 아래 주석을 해제:
    // if (!user) {
    //   setProperties([])
    //   setHasSearched(true) // "결과 없음" 대신 로그인 유도 UI 표시 가능
    //   return
    // }

    // ── AbortController: effect 레벨에서 관리 ──
    let cancelled = false
    const controller = new AbortController()

    // 15초 타임아웃: 시간 초과 시 abort (네트워크 장애 방어)
    const timeoutId = setTimeout(() => {
      if (!cancelled) controller.abort()
    }, 15000)

    const searchAgents = async () => {
      setLoading(true)

      try {
        const params = new URLSearchParams({ q: debouncedQuery })
        if (searchRegion) params.set('region', searchRegion)

        const res = await fetch(`/api/search-agents?${params.toString()}`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        // ── Stale response 방어 ──
        // fetch 완료 시점에 effect가 이미 cleanup되었거나,
        // 사용자가 검색어를 비운 경우 상태 업데이트를 차단.
        if (cancelled || !latestQueryRef.current.trim()) return

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `API ${res.status}`)
        }

        const { data, reviews, reviewCounts } = await res.json()

        // 검색 결과를 Property 형식으로 변환
        const ratingsMap = reviews as Record<number, number>
        const countsMap = (reviewCounts || {}) as Record<number, number>
        const propertiesData: Property[] = (data || []).map((agent: any) => ({
          id: agent.id.toString(),
          name: agent.agent_name || '',
          address: agent.road_address || agent.lot_address || '',
          rating: ratingsMap[agent.id] || 0,
          reviewCount: countsMap[agent.id] || 0,
          latitude: agent.latitude,
          longitude: agent.longitude,
        }))

        // DB에 결과가 있으면 DB 결과만 사용, 없으면 목업 데이터 사용
        if (propertiesData.length > 0) {
          setProperties(propertiesData)
        } else {
          const q = debouncedQuery.trim().toLowerCase()
          const mockMatches = mockProperties.filter(
            (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
          )
          setProperties(mockMatches)
        }
        setHasSearched(true)
      } catch (error: any) {
        clearTimeout(timeoutId)

        // cleanup에 의한 abort는 조용히 무시 (정상적인 취소)
        if (cancelled || !latestQueryRef.current.trim()) return

        if (error?.name === 'AbortError') {
          // cancelled가 false인데 AbortError → 15초 타임아웃에 의한 abort
          console.warn('[PropertyList] API 타임아웃 (15초)')
        } else {
          console.error('[PropertyList] 검색 오류:', error?.message)
        }

        // 에러 시 목업 데이터로 폴백
        const q = debouncedQuery.trim().toLowerCase()
        const mockMatches = mockProperties.filter(
          (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
        )
        setProperties(mockMatches)
        setHasSearched(true)
      } finally {
        // cancelled 또는 검색어가 비워진 경우 loading 해제하지 않음
        // (Effect 1이 이미 setLoading(false)를 처리)
        if (!cancelled && latestQueryRef.current.trim()) {
          setLoading(false)
        }
      }
    }

    searchAgents()

    // ── Cleanup ──
    // 의존성 변경 또는 언마운트 시:
    // 1. cancelled=true → 응답 도착해도 상태 업데이트 차단
    // 2. controller.abort() → 진행 중인 fetch 즉시 취소
    // 3. clearTimeout → 타임아웃 타이머 해제
    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [debouncedQuery, searchRegion, authLoading])

  // 검색어가 없을 때는 아무것도 표시하지 않음
  if (!searchQuery.trim()) {
    return null
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className="iconLoader">
          <div className="iconLoaderIcons">
            <span>🏠</span><span>🔍</span><span>📄</span><span>🏦</span><span>🔑</span><span>😊</span>
          </div>
          <p style={{ fontSize: '14px', color: '#64748b' }}>검색 중...</p>
        </div>
      </div>
    )
  }

  if (hasSearched && properties.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🔍</div>
        <p className={styles.emptyText}>
          '{searchQuery}'으로 검색된 공인중개사사무소가 없어요.
        </p>
      </div>
    )
  }

  if (!hasSearched) {
    return null
  }

  // 주소에서 '구' 단위 추출 (예: "서울특별시 용산구 ..." → "용산구")
  const extractDistrict = (address: string): string | null => {
    if (!address) return null
    const match = address.match(/([가-힣]+[구군시])\s/)
    if (match) {
      // 광역시/도 단위 제외 (예: "서울특별시"는 건너뜀)
      const district = match[1]
      if (district.endsWith('구') || district.endsWith('군')) return district
      // "시" 단위: 성남시, 수원시 등 (광역시 제외)
      if (district.endsWith('시') && !district.includes('특별') && !district.includes('광역')) return district
    }
    // 두 번째 패턴: "OO도 OO시 OO구"
    const match2 = address.match(/\s([가-힣]+구)/)
    return match2 ? match2[1] : null
  }

  // 키워드 하이라이팅 (검색어 토큰을 보라색 볼드로 강조)
  const highlightText = (text: string, query: string) => {
    if (!query.trim() || !text) return <>{text}</>
    const tokens = query.split(/\s+/).filter(t => t.length > 0)
    if (tokens.length === 0) return <>{text}</>

    // 모든 토큰을 하나의 정규식으로 결합
    const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
    const parts = text.split(regex)

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className={styles.highlight}>{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    )
  }

  return (
    <>
      <div className={styles.propertyList}>
        {properties.map((property) => {
          const district = extractDistrict(property.address)

          return (
            <div
              key={property.id}
              className={styles.propertyCard}
              onClick={() => handlePropertyClick(property)}
            >
              <div className={styles.propertyHeader}>
                {district && (
                  <span className={styles.districtBadge}>{district}</span>
                )}
                <h3 className={styles.propertyName}>
                  {highlightText(property.name, searchQuery)}
                </h3>
              </div>
              <p className={styles.propertyAddress}>
                {highlightText(property.address, searchQuery)}
              </p>
              {(property.rating > 0 || property.reviewCount > 0) && (
                <div className={styles.propertyRating}>
                  {property.rating > 0 ? (
                    <>
                      <span className={styles.ratingStars}>
                        {'★'.repeat(Math.round(property.rating))}
                        {'☆'.repeat(5 - Math.round(property.rating))}
                      </span>
                      <span className={styles.ratingValue}>{property.rating.toFixed(1)}</span>
                    </>
                  ) : (
                    <span className={styles.ratingStars}>☆☆☆☆☆</span>
                  )}
                  {property.reviewCount > 0 && (
                    <span className={styles.reviewCount}>
                      리뷰 {property.reviewCount}건
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

