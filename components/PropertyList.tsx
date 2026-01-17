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
}

interface PropertyListProps {
  searchQuery: string
}

// 목업 데이터
const mockProperties: Property[] = [
  {
    id: '1',
    name: '미금퍼스트',
    address: '경기도 성남시 분당구 미금일로90번길 10, 1층(구미동)',
    rating: 4.5,
  },
  {
    id: '2',
    name: '기쁨부동산',
    address: '서울특별시 성북구 동소문로 109 (동선동4가)',
    rating: 4.7,
  },
]

// 상세 정보 목업 데이터
const getPropertyDetail = (id: string): PropertyDetail | null => {
  const details: Record<string, PropertyDetail> = {
    '1': {
      id: '1',
      name: '미금퍼스트',
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
    '2': {
      id: '2',
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
  const [selectedProperty, setSelectedProperty] = useState<PropertyDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim()) {
      // 검색어가 없을 때는 부동산 정보를 표시하지 않음
      setProperties([])
      return
    }

    const searchAgents = async () => {
      setLoading(true)
      try {
        // agent_master 테이블에서 agent_name으로 검색
        const { data, error } = await supabase
          .from('agent_master')
          .select('id, agent_name, road_address, lot_address')
          .ilike('agent_name', `%${searchQuery}%`)
          .limit(50) // 최대 50개 결과

        if (error) {
          console.error('검색 오류:', error)
          setProperties([])
          setLoading(false)
          return
        }

        // 검색 결과를 Property 형식으로 변환
        const propertiesData: Property[] = (data || []).map((agent) => ({
          id: agent.id.toString(),
          name: agent.agent_name || '',
          address: agent.road_address || agent.lot_address || '',
          rating: 0, // 기본값 (실제 리뷰 데이터가 있으면 계산)
        }))

        setProperties(propertiesData)
      } catch (error) {
        console.error('검색 중 오류:', error)
        setProperties([])
      } finally {
        setLoading(false)
      }
    }

    // 디바운싱: 300ms 후 검색 실행
    const timeoutId = setTimeout(() => {
      searchAgents()
    }, 300)

    return () => clearTimeout(timeoutId)
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

  if (properties.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>😢</div>
        <p className={styles.emptyText}>
          아직 등록된 리뷰가 없어요. 😢 첫 번째 리뷰의 주인공이 되어주시겠어요?
        </p>
      </div>
    )
  }

  const handlePropertyClick = (property: Property) => {
    const detail = getPropertyDetail(property.id)
    if (detail) {
      setSelectedProperty(detail)
      setIsModalOpen(true)
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
            <div className={styles.propertyRating}>
              <span className={styles.ratingStars}>
                {'★'.repeat(Math.floor(property.rating))}
                {'☆'.repeat(5 - Math.floor(property.rating))}
              </span>
              <span className={styles.ratingValue}>{property.rating}</span>
            </div>
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

