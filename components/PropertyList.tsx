'use client'

import { useEffect, useState } from 'react'
import PropertyDetailModal from './PropertyDetailModal'
import styles from './PropertyList.module.css'
import { supabase } from '@/lib/supabase/client'

interface Property {
  id: string
  name: string
  address: string
  rating: number
  latitude?: number
  longitude?: number
}

interface Review {
  id: string
  author: string
  rating: number
  date: string
  content: string
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
}

// 목업 데이터
const mockProperties: Property[] = [
  {
    id: 'mock-1',
    name: '미금퍼스트공인중개사사무소(테스트)',
    address: '경기도 성남시 분당구 미금일로90번길 10, 1층(구미동)',
    rating: 4.5,
  },
  {
    id: 'mock-2',
    name: '기쁨부동산',
    address: '서울특별시 성북구 동소문로 109 (동선동4가)',
    rating: 4.7,
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

export default function PropertyList({ searchQuery }: PropertyListProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false) // 검색 실행 여부 추적
  const [selectedProperty, setSelectedProperty] = useState<PropertyDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim()) {
      // 검색어가 없을 때는 부동산 정보를 표시하지 않음
      setProperties([])
      setHasSearched(false)
      return
    }

    const searchAgents = async () => {
      setLoading(true)
      
      try {
        const { data, error } = await supabase
          .from('agent_master')
          .select('id, agent_name, road_address, lot_address, latitude, longitude')
          .ilike('agent_name', `%${searchQuery}%`)
          .limit(50)

        if (error) {
          console.error('[검색] DB 조회 오류:', error.message)
          
          // DB 검색이 실패해도 목업 검색 결과는 보여주기
          const q = searchQuery.trim().toLowerCase()
          const mockMatches = mockProperties.filter(
            (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
          )
          setProperties(mockMatches)
          setHasSearched(true)
          setLoading(false)
          return
        }

        // 각 중개사무소의 평균 별점 조회
        const agentIds = (data || []).map((agent: any) => agent.id)
        let ratingsMap = new Map<number, number>()
        
        if (agentIds.length > 0) {
          try {
            const { data: reviewsData, error: reviewsError } = await supabase
              .from('agent_reviews')
              .select('agent_id, fee_satisfaction, expertise, kindness, property_reliability, response_speed')
              .in('agent_id', agentIds)
            
            if (!reviewsError && reviewsData) {
              // 각 중개사무소별 평균 별점 계산
              const agentReviews = new Map<number, number[]>()
              
              reviewsData.forEach((review: any) => {
                const ratings = [
                  review.fee_satisfaction,
                  review.expertise,
                  review.kindness,
                  review.property_reliability,
                  review.response_speed
                ].filter((r: any) => r !== null && r !== undefined) as number[]
                
                if (ratings.length > 0) {
                  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                  if (!agentReviews.has(review.agent_id)) {
                    agentReviews.set(review.agent_id, [])
                  }
                  agentReviews.get(review.agent_id)!.push(avg)
                }
              })
              
              // 각 중개사무소의 전체 평균 계산
              agentReviews.forEach((ratings, agentId) => {
                const overallAvg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                ratingsMap.set(agentId, Math.round(overallAvg * 10) / 10)
              })
              
            }
          } catch (reviewsError) {
            // 리뷰 조회 실패 시 조용히 무시
          }
        }

        // 검색 결과를 Property 형식으로 변환
        const propertiesData: Property[] = (data || []).map((agent: any) => ({
          id: agent.id.toString(),
          name: agent.agent_name || '',
          address: agent.road_address || agent.lot_address || '',
          rating: ratingsMap.get(agent.id) || 0,
          latitude: agent.latitude,
          longitude: agent.longitude,
        }))

        // DB에 결과가 있으면 DB 결과만 사용, 없으면 목업 데이터 사용
        if (propertiesData.length > 0) {
          setProperties(propertiesData)
        } else {
          const q = searchQuery.trim().toLowerCase()
          const mockMatches = mockProperties.filter(
            (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
          )
          setProperties(mockMatches)
        }
        setHasSearched(true)
      } catch (error: any) {
        console.error('[검색] ❌ 예외 발생:', error)
        const q = searchQuery.trim().toLowerCase()
        const mockMatches = mockProperties.filter(
          (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
        )
        console.log(`[검색] 예외 발생, 목업 데이터 사용: ${mockMatches.length}건`)
        setProperties(mockMatches)
        setHasSearched(true)
      } finally {
        setLoading(false)
      }
    }

    // 디바운싱: 300ms 후 검색 실행
    const timeoutId = setTimeout(() => {
      searchAgents()
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [searchQuery])

  // 검색어가 없을 때는 아무것도 표시하지 않음
  if (!searchQuery.trim()) {
    return null
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>검색 중...</p>
      </div>
    )
  }

  if (hasSearched && properties.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>😢</div>
        <p className={styles.emptyText}>
          아직 등록된 리뷰가 없어요. 😢 첫 번째 리뷰의 주인공이 되어주시겠어요?
        </p>
      </div>
    )
  }

  if (!hasSearched) {
    return null
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
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('agent_reviews')
        .select(`
          *,
          user:users!supabase_user_id(email)
        `)
        .eq('agent_id', parseInt(property.id))
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
          score: Math.round(avg * 10) / 10,
        }
      })

      // 전체 평균 별점
      const allScores = reviewsData.flatMap((r: any) => 
        [r.fee_satisfaction, r.expertise, r.kindness, r.property_reliability, r.response_speed]
          .filter(s => s !== null && s !== undefined)
      ) as number[]
      const overallRating = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        : 0

      // 리뷰 변환
      const reviews = reviewsData.map((r: any) => {
        // 작성자 email 마스킹: @도메인 제외, 앞 3자리만 보여주고 나머지는 * 처리
        let maskedAuthor = '익명'
        
        if (r.user && r.user.email) {
          const email = r.user.email
          // @앞부분만 추출 (도메인 제외)
          const localPart = email.split('@')[0]
          
          if (localPart.length >= 3) {
            maskedAuthor = localPart.substring(0, 3) + '*****'
          } else if (localPart.length > 0) {
            maskedAuthor = localPart.substring(0, 1) + '*****'
          }
        }
        
        return {
          id: r.id,
          author: maskedAuthor,
        rating: Math.round(
          ([r.fee_satisfaction, r.expertise, r.kindness, r.property_reliability, r.response_speed]
            .filter(s => s !== null && s !== undefined) as number[])
            .reduce((sum, s) => sum + s, 0) / 5 * 10
        ) / 10,
        date: new Date(r.created_at).toLocaleDateString('ko-KR', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        }).replace(/\. /g, '.'),
        content: r.review_text || '',
        transactionTags: r.transaction_tag ? [r.transaction_tag] : [],
        praiseTags: r.praise_tags || [],
        regretTags: r.regret_tags || [],
        detailedEvaluation: evaluationCategories.map(cat => ({
          category: cat.label,
          score: (r as any)[cat.key] || 0,
        })),
        }
      })

      const propertyDetail: PropertyDetail = {
        id: property.id,
        name: property.name,
        address: property.address,
        rating: Math.round(overallRating * 10) / 10,
        reviewCount: reviewsData.length,
        transactionTags: Array.from(allTransactionTags),
        praiseTags: Array.from(allPraiseTags),
        regretTags: Array.from(allRegretTags),
        detailedEvaluation,
        keySummary: {
          recommendRate: 85, // TODO: 실제 계산 로직 필요
          discountRate: 40, // TODO: 실제 계산 로직 필요
          explanationRate: 90, // TODO: 실제 계산 로직 필요
        },
        reviews,
        latitude: property.latitude,
        longitude: property.longitude,
      }

      setSelectedProperty(propertyDetail)
      setIsModalOpen(true)
    } catch (error) {
      console.error('[상세 조회] 예외 발생:', error)
    }
  }

  return (
    <>
      <div className={styles.propertyList}>
        {properties.map((property) => (
          <div
            key={property.id}
            className={styles.propertyCard}
            onClick={() => handlePropertyClick(property)}
          >
            <div className={styles.propertyHeader}>
              <h3 className={styles.propertyName}>{property.name}</h3>
            </div>
            <p className={styles.propertyAddress}>{property.address}</p>
          </div>
        ))}
      </div>
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

