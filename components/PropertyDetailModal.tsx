'use client'

import { useState, useEffect, useRef } from 'react'
import ReviewModal from './ReviewModal'
import styles from './PropertyDetailModal.module.css'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthCheck } from '@/components/AuthGuard'
import { apiRequest } from '@/lib/api/interceptor'

// 네이버 지도 타입 선언
declare global {
  interface Window {
    naver: any
  }
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

interface PropertyDetailModalProps {
  property: PropertyDetail | null
  isOpen: boolean
  onClose: () => void
}

export default function PropertyDetailModal({
  property,
  isOpen,
  onClose,
}: PropertyDetailModalProps) {
  const { user: authUser } = useAuth()
  const checkAuth = useAuthCheck({ showAlert: true })
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasReviewAccess, setHasReviewAccess] = useState(false)
  const [userReviewCount, setUserReviewCount] = useState(0)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoadingMap, setIsLoadingMap] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
  const [showPointsGuideModal, setShowPointsGuideModal] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const naverMapInstance = useRef<any>(null)

  useEffect(() => {
    const checkSessionAndReviews = async () => {
      setIsLoggedIn(!!authUser)
      
      if (authUser) {
        // 사용자가 작성한 리뷰 개수 확인 (count는 직접 호출)
        const { data: reviewData, error, count } = await supabase
          .from('agent_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('supabase_user_id', authUser.id)
        
        const reviewCount = count || 0
        console.log('[PropertyDetailModal] 사용자 리뷰 개수:', reviewCount)
        setUserReviewCount(reviewCount)
        setHasReviewAccess(reviewCount >= 1) // 1건 이상이면 접근 가능

        // 관심 등록 여부 확인
        if (property) {
          const { data: favoriteData } = await apiRequest(
            () => supabase
              .from('favorite_agents')
              .select('id')
              .eq('supabase_user_id', authUser.id)
              .eq('agent_id', parseInt(property.id))
              .maybeSingle(),
            { requireAuth: true }
          )
          
          setIsFavorite(!!favoriteData)
        }
      }
    }
    
    if (isOpen) {
      checkSessionAndReviews()
    }
  }, [isOpen, property, authUser])

  // 주소를 좌표로 변환 (DB에 좌표가 있으면 사용, 없으면 Geocoding API 호출)
  useEffect(() => {
    if (!isOpen || !isLoggedIn || !property) {
      return
    }

    const fetchCoordinates = async () => {
      setIsLoadingMap(true)
      setCoordinates(null)
      
      try {
        // DB에 좌표가 있으면 바로 사용
        if (property.latitude && property.longitude) {
          setCoordinates({ lat: property.latitude, lng: property.longitude })
          setIsLoadingMap(false)
          return
        }

        // DB에 좌표가 없으면 Geocoding API 호출
        const response = await fetch(`/api/geocode?address=${encodeURIComponent(property.address)}`)
        
        if (!response.ok) {
          setIsLoadingMap(false)
          return
        }

        const data = await response.json()
        
        if (data.lat && data.lng) {
          setCoordinates({ lat: data.lat, lng: data.lng })
        }
      } catch (error) {
        // Geocoding 실패 시 조용히 무시
      } finally {
        setIsLoadingMap(false)
      }
    }

    fetchCoordinates()
  }, [isOpen, isLoggedIn, property])

  // 네이버 지도 초기화 (좌표 확보 후)
  useEffect(() => {
    if (!isOpen || !isLoggedIn || !property || !mapRef.current || !coordinates) {
      return
    }

    // 네이버 지도 API가 로드되었는지 확인
    if (typeof window === 'undefined' || !window.naver || !window.naver.maps) {
      return
    }

    // 네이버 지도 초기화
    const initMap = async () => {
      try {
        // 지도 인스턴스가 이미 있으면 제거
        if (naverMapInstance.current) {
          naverMapInstance.current.destroy()
          naverMapInstance.current = null
        }

        // 주소의 좌표로 지도 중심 설정
        const center = new window.naver.maps.LatLng(coordinates.lat, coordinates.lng)

        // 지도 옵션 설정
        const mapOptions = {
          center: center,
          zoom: 17, // 매우 확대 (건물 단위까지 보임)
          zoomControl: true, // 줌 컨트롤 표시
          zoomControlOptions: {
            position: window.naver.maps.Position.TOP_RIGHT,
          },
          mapTypeControl: false, // 지도 타입 변경 버튼 숨김
          mapTypeId: window.naver.maps.MapTypeId.NORMAL, // 일반 지도로 고정
        }

        // 지도 생성
        const map = new window.naver.maps.Map(mapRef.current, mapOptions)
        naverMapInstance.current = map

        // 마커 생성 (실제 주소의 좌표에 표시)
        const marker = new window.naver.maps.Marker({
          position: center,
          map: map,
          title: property.name,
          icon: {
            content: `
              <div style="position:relative;">
                <div style="width:40px;height:40px;background:#ef4444;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
                <div style="position:absolute;top:8px;left:8px;width:24px;height:24px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div>
              </div>
            `,
            size: new window.naver.maps.Size(40, 40),
            anchor: new window.naver.maps.Point(20, 40),
          },
        })

        // 정보 창 생성 - 클릭하여 정확한 위치 확인 유도
        const encodedAddress = encodeURIComponent(property.address)
        const infoWindow = new window.naver.maps.InfoWindow({
          content: `
            <div style="padding:14px;min-width:240px;max-width:320px;background:#fff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
              <h4 style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#1e293b;">${property.name}</h4>
              <p style="margin:0 0 10px 0;font-size:12px;color:#64748b;line-height:1.5;">${property.address}</p>
              <div 
                onclick="window.open('https://map.naver.com/v5/search/${encodedAddress}', '_blank')"
                style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);border-radius:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s ease;"
                onmouseover="this.style.background='linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)';this.style.transform='translateY(-1px)'"
                onmouseout="this.style.background='linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)';this.style.transform='translateY(0)'"
              >
                <span style="font-size:16px;">📍</span>
                <span>네이버 지도에서 정확한 위치 보기</span>
              </div>
            </div>
          `,
          borderWidth: 0,
          backgroundColor: 'transparent',
          anchorSize: new window.naver.maps.Size(0, 0),
        })

        // 마커 클릭 시 정보 창 토글
        window.naver.maps.Event.addListener(marker, 'click', () => {
          if (infoWindow.getMap()) {
            infoWindow.close()
          } else {
            infoWindow.open(map, marker)
          }
        })

        // 지도 클릭 시 네이버 지도로 이동
        window.naver.maps.Event.addListener(map, 'click', () => {
          const query = encodeURIComponent(property.address)
          window.open(`https://map.naver.com/v5/search/${query}`, '_blank')
        })

        // 초기에 정보 창 표시
        infoWindow.open(map, marker)
      } catch (error) {
        // 지도 초기화 실패 시 조용히 무시
      }
    }

    // 지도 초기화 (네이버 지도 SDK 로드 대기)
    const checkAndInit = () => {
      if (window.naver && window.naver.maps) {
        initMap()
      } else {
        setTimeout(checkAndInit, 500)
      }
    }
    
    const timer = setTimeout(() => {
      checkAndInit()
    }, 300)

    return () => {
      clearTimeout(timer)
      if (naverMapInstance.current) {
        naverMapInstance.current.destroy()
        naverMapInstance.current = null
      }
    }
  }, [isOpen, isLoggedIn, property, coordinates])

  if (!isOpen || !property) return null

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    return (
      <>
        {'★'.repeat(fullStars)}
        {hasHalfStar && '☆'}
        {'☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))}
      </>
    )
  }

  const renderScoreBar = (score: number) => {
    const percentage = (score / 5) * 100
    return (
      <div className={styles.scoreBarContainer}>
        <div className={styles.scoreBar}>
          <div
            className={styles.scoreBarFill}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={styles.scoreValue}>{score}</span>
      </div>
    )
  }

  const handleMapClick = () => {
    // 네이버 지도 검색 링크로 열기
    const query = encodeURIComponent(property.address)
    window.open(`https://map.naver.com/v5/search/${query}`, '_blank')
  }

  const handleRatingClick = async () => {
    if (!property.reviews || property.reviews.length === 0) return
    
    // 인증 체크
    if (!checkAuth()) return
    if (!authUser?.id) return

    try {
      // 1. 사용자 등급 확인
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_grade')
        .eq('supabase_user_id', authUser.id)
        .single()

      if (userError) {
        console.error('사용자 등급 조회 실패:', userError)
        setIsReviewModalOpen(true)
        return
      }

      const userGrade = userData?.user_grade || 'INJOO'

      // 2. 입장까비(IMJANG)인 경우에만 포인트 차감
      if (userGrade === 'IMJANG') {
        // 현재 포인트 확인
        const { data: pointsData, error: pointsError } = await supabase
          .from('user_points')
          .select('available_points')
          .eq('supabase_user_id', authUser.id)
          .single()

        if (pointsError && pointsError.code !== 'PGRST116') {
          console.error('포인트 조회 실패:', pointsError)
          setIsReviewModalOpen(true)
          return
        }

        const currentPoints = pointsData?.available_points || 0

        // 포인트 부족 시 안내 모달 표시
        if (currentPoints < 10) {
          setShowPointsGuideModal(true)
          return
        }

        // 10포인트 차감
        const { error: deductError } = await supabase.rpc('deduct_points', {
          user_id_param: authUser.id,
          points_param: 10,
          reason_param: '리뷰 조회',
          reference_id_param: property.id
        })

        if (deductError) {
          console.error('포인트 차감 실패:', deductError)
          // 실패해도 리뷰는 보여줌
        }
      }

      // 3. 리뷰 모달 열기
      setIsReviewModalOpen(true)
    } catch (error) {
      console.error('리뷰 열기 오류:', error)
      setIsReviewModalOpen(true)
    }
  }

  const handleFavoriteToggle = async () => {
    if (isFavoriteLoading) return
    
    // 인증 체크 - 실패 시 자동으로 alert 및 리다이렉트
    if (!checkAuth()) return

    if (!property) return

    try {
      setIsFavoriteLoading(true)

      if (isFavorite) {
        // 관심 해제
        const { error } = await apiRequest(
          () => supabase
            .from('favorite_agents')
            .delete()
            .eq('supabase_user_id', authUser!.id)
            .eq('agent_id', parseInt(property.id)),
          { requireAuth: true }
        )

        if (!error) {
          setIsFavorite(false)
        }
      } else {
        // 관심 등록
        const { error } = await apiRequest(
          () => supabase
            .from('favorite_agents')
            .insert({
              supabase_user_id: authUser!.id,
              agent_id: parseInt(property.id)
            }),
          { requireAuth: true, showErrorAlert: true }
        )

        if (!error) {
          setIsFavorite(true)
        }
      }
    } catch (error: any) {
      console.error('관심 등록/해제 오류:', error)
      alert('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsFavoriteLoading(false)
    }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeButton} onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className={styles.modalContent}>
            {/* 헤더 - 항상 표시 */}
            <div className={styles.header}>
              <h2 className={styles.propertyName}>{property.name}</h2>
              <div className={styles.addressSection}>
                <span className={styles.address}>{property.address}</span>
              </div>
              {/* 관심 등록 버튼 - 헤더 하단에 배치 */}
              {isLoggedIn && (
                <button
                  className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
                  onClick={handleFavoriteToggle}
                  disabled={isFavoriteLoading}
                  aria-label={isFavorite ? '관심 해제' : '관심 등록'}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={isFavorite ? 'currentColor' : 'none'}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className={styles.favoriteButtonText}>
                    {isFavorite ? '관심 해제' : '관심 등록'}
                  </span>
                </button>
              )}
            </div>

            {/* 로그인하지 않은 사용자: 별점부터 지도까지 흐릿하게 처리 */}
            {!isLoggedIn && (
              <div className={styles.blurredContainer}>
                <div className={styles.blurredContent}>
                  <div className={styles.ratingSection}>
                    <div className={styles.ratingMain}>
                      <span className={styles.ratingStars}>
                        {renderStars(property.rating)}
                      </span>
                      <span className={styles.reviewCountInline}>({property.reviewCount})</span>
                      <span className={styles.viewAll}>전체보기 &gt;</span>
                    </div>
                  </div>

                  {property.praiseTags.length > 0 && (
                    <div className={styles.badgeSection}>
                      <div className={styles.badgeGroup}>
                        <span className={styles.badgeLabel}>칭찬 태그:</span>
                        <div className={styles.badges}>
                          {property.praiseTags.map((tag, index) => (
                            <span key={index} className={styles.badge}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {property.regretTags.length > 0 && (
                    <div className={styles.badgeSection}>
                      <div className={styles.badgeGroup}>
                        <span className={styles.badgeLabel}>아쉬움 태그:</span>
                        <div className={styles.badges}>
                          {property.regretTags.map((tag, index) => (
                            <span key={index} className={`${styles.badge} ${styles.regretBadge}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={styles.evaluationSection}>
                    <h3 className={styles.sectionTitle}>상세 평가</h3>
                    <div className={styles.evaluationList}>
                      {property.detailedEvaluation.map((item, index) => (
                        <div key={index} className={styles.evaluationItem}>
                          <div className={styles.evaluationHeader}>
                            <span className={styles.evaluationCategory}>
                              {item.category}
                            </span>
                            {item.comment && (
                              <span className={styles.evaluationComment}>
                                {item.comment}
                              </span>
                            )}
                          </div>
                          {renderScoreBar(item.score)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.mapSection}>
                    <div className={styles.miniMap}>
                      <div className={styles.mapPlaceholder}>
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={styles.mapIcon}
                        >
                          <path
                            d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z"
                            stroke="#3182f6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="10"
                            r="3"
                            stroke="#3182f6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className={styles.mapText}>지도를 클릭하면 네이버 지도에서 위치를 확인할 수 있습니다</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 가운데 자물쇠 아이콘 */}
                <div className={styles.lockOverlay}>
                  <div className={styles.lockIcon}>
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className={styles.lockMessage}>로그인 후 상세 정보를 확인하세요</p>
                </div>
              </div>
            )}

            {/* 로그인한 사용자: 모든 내용 정상 표시 */}
            {isLoggedIn && (
              <>
                <div className={styles.ratingSection}>
                  {hasReviewAccess ? (
                    property.reviewCount > 0 ? (
                      <div
                        className={styles.ratingMain}
                        onClick={handleRatingClick}
                        style={{ cursor: property.reviews && property.reviews.length > 0 ? 'pointer' : 'default' }}
                      >
                        <span className={styles.ratingStars}>
                          {renderStars(property.rating)}
                        </span>
                        <span className={styles.reviewCountInline}>({property.reviewCount})</span>
                        <span className={styles.viewAll}>전체보기 &gt;</span>
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        padding: '32px 24px',
                        backgroundColor: '#f0f9ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        margin: '0 auto'
                      }}>
                        <div style={{ 
                          fontSize: '48px',
                          marginBottom: '8px'
                        }}>
                          📝
                        </div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 700, 
                          color: '#1e40af', 
                          textAlign: 'center',
                          width: '100%'
                        }}>
                          아직 등록된 리뷰가 없습니다
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#1e3a8a', 
                          lineHeight: '1.6',
                          textAlign: 'center',
                          width: '100%'
                        }}>
                          이 공인중개사무소의 첫 번째 리뷰를<br />
                          작성해보시겠어요?
                        </div>
                      </div>
                    )
                  ) : (
                    <div style={{
                      width: '100%',
                      padding: '32px 24px',
                      backgroundColor: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      margin: '0 auto'
                    }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 700, 
                        color: '#92400e', 
                        textAlign: 'center',
                        width: '100%'
                      }}>
                        🔒 리뷰를 보려면 계약서를 등록하세요
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#78350f', 
                        lineHeight: '1.6',
                        textAlign: 'center',
                        width: '100%'
                      }}>
                        본인의 계약서를 1건 이상 등록하면<br />
                        다른 사용자들의 리뷰를 확인할 수 있습니다.
                      </div>
                    </div>
                  )}
                </div>

                {/* 키워드 뱃지 - 리뷰 접근 권한이 있고 리뷰가 있을 때만 표시 */}
                {hasReviewAccess && property.reviewCount > 0 && property.praiseTags.length > 0 && (
                  <div className={styles.badgeSection}>
                    <div className={styles.badgeGroup}>
                      <span className={styles.badgeLabel}>칭찬 태그:</span>
                      <div className={styles.badges}>
                        {property.praiseTags.map((tag, index) => (
                          <span key={index} className={styles.badge}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {hasReviewAccess && property.reviewCount > 0 && property.regretTags.length > 0 && (
                  <div className={styles.badgeSection}>
                    <div className={styles.badgeGroup}>
                      <span className={styles.badgeLabel}>아쉬움 태그:</span>
                      <div className={styles.badges}>
                        {property.regretTags.map((tag, index) => (
                          <span key={index} className={`${styles.badge} ${styles.regretBadge}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 상세 평가 - 리뷰 접근 권한이 있고 리뷰가 있을 때만 표시 */}
                {hasReviewAccess && property.reviewCount > 0 && (
                  <div className={styles.evaluationSection}>
                    <h3 className={styles.sectionTitle}>상세 평가</h3>
                    <div className={styles.evaluationList}>
                      {property.detailedEvaluation.map((item, index) => (
                        <div key={index} className={styles.evaluationItem}>
                          <div className={styles.evaluationHeader}>
                            <span className={styles.evaluationCategory}>
                              {item.category}
                            </span>
                            {item.comment && (
                              <span className={styles.evaluationComment}>
                                {item.comment}
                              </span>
                            )}
                          </div>
                          {renderScoreBar(item.score)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 네이버 지도 */}
                <div className={styles.mapSection}>
                  <h3 className={styles.sectionTitle}>위치</h3>
                  
                  {isLoadingMap ? (
                    <div style={{
                      width: '100%',
                      height: '300px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          border: '4px solid #e1e8f0',
                          borderTopColor: '#063561',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          margin: '0 auto 12px'
                        }} />
                        <p style={{ color: '#64748b', fontSize: '14px' }}>지도 로딩 중...</p>
                      </div>
                    </div>
                  ) : !coordinates ? (
                    <div 
                      className={styles.miniMap} 
                      onClick={handleMapClick}
                      style={{ height: '300px', cursor: 'pointer' }}
                    >
                      <div className={styles.mapPlaceholder}>
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={styles.mapIcon}
                        >
                          <path
                            d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z"
                            stroke="#7C3AED"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="10"
                            r="3"
                            stroke="#7C3AED"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className={styles.mapText}>
                          클릭하여 네이버 지도에서 위치 확인
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div 
                      ref={mapRef} 
                      className={styles.naverMap}
                      style={{ 
                        width: '100%', 
                        height: '300px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0'
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ReviewModal
        reviews={property.reviews || []}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        propertyName={property.name}
      />

      {/* 포인트 안내 모달 */}
      {showPointsGuideModal && (
        <div className={styles.pointsGuideOverlay} onClick={() => setShowPointsGuideModal(false)}>
          <div className={styles.pointsGuideModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pointsGuideHeader}>
              <div className={styles.pointsGuideIcon}>💰</div>
              <h3 className={styles.pointsGuideTitle}>포인트가 부족합니다</h3>
            </div>
            <div className={styles.pointsGuideBody}>
              <p className={styles.pointsGuideMessage}>
                리뷰를 조회하려면 <strong>10포인트</strong>가 필요합니다.
              </p>
              <div className={styles.pointsGuideSection}>
                <h4 className={styles.pointsGuideSectionTitle}>📌 포인트 획득 방법</h4>
                <ul className={styles.pointsGuideList}>
                  <li>✍️ <strong>리뷰 작성 시 50포인트 획득</strong></li>
                  <li>📋 <strong>부동산 계약서 업로드 후 리뷰 작성 가능</strong></li>
                  <li>⭐ 출석 체크 및 이벤트 참여</li>
                </ul>
              </div>
              <div className={styles.pointsGuideHighlight}>
                <div className={styles.pointsGuideHighlightIcon}>🎉</div>
                <div>
                  <div className={styles.pointsGuideHighlightTitle}>무제한 열람 혜택</div>
                  <div className={styles.pointsGuideHighlightDesc}>
                    리뷰를 1건 이상 작성하면<br />
                    <strong>모든 리뷰를 포인트 차감 없이 무제한으로 볼 수 있습니다!</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.pointsGuideFooter}>
              <button
                className={styles.pointsGuideCloseButton}
                onClick={() => setShowPointsGuideModal(false)}
              >
                닫기
              </button>
              <button
                className={styles.pointsGuideReviewButton}
                onClick={() => {
                  setShowPointsGuideModal(false)
                  // 리뷰 작성 버튼 클릭 이벤트 발생
                  window.dispatchEvent(new Event('review:start'))
                }}
              >
                리뷰 작성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
