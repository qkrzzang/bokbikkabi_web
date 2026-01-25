'use client'

import { useState, useEffect, useRef } from 'react'
import ReviewModal from './ReviewModal'
import styles from './PropertyDetailModal.module.css'
import { supabase } from '@/lib/supabase/client'

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
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const naverMapInstance = useRef<any>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    
    if (isOpen) {
      checkSession()
    }
  }, [isOpen])

  // 네이버 지도 초기화
  useEffect(() => {
    if (!isOpen || !isLoggedIn || !property || !mapRef.current) {
      return
    }

    // 네이버 지도 API가 로드되었는지 확인
    if (typeof window === 'undefined' || !window.naver || !window.naver.maps) {
      console.log('[네이버 지도] API가 로드되지 않았습니다.')
      return
    }

    // 네이버 지도 초기화 (간단한 버전 - 클릭 시 네이버 지도에서 검색)
    const initMap = async () => {
      try {
        console.log('[네이버 지도] 초기화 시작')
        console.log('[네이버 지도] 주소:', property.address)
        console.log('[네이버 지도] naver.maps 객체:', window.naver?.maps ? '존재' : '없음')

        // 지도 인스턴스가 이미 있으면 제거
        if (naverMapInstance.current) {
          naverMapInstance.current.destroy()
          naverMapInstance.current = null
        }

        // 서울 중심 좌표 (대한민국 중심 표시)
        const defaultCenter = new window.naver.maps.LatLng(37.5665, 126.9780)

        // 지도 옵션 설정
        const mapOptions = {
          center: defaultCenter,
          zoom: 17, // 매우 확대 (건물 단위까지 보임)
          zoomControl: false, // 줌 컨트롤 숨김
          mapTypeControl: false, // 지도 타입 변경 버튼 숨김
          mapTypeId: window.naver.maps.MapTypeId.NORMAL, // 일반 지도로 고정
        }

        // 지도 생성
        const map = new window.naver.maps.Map(mapRef.current, mapOptions)
        naverMapInstance.current = map

        // 마커 생성 (중심에 표시)
        const marker = new window.naver.maps.Marker({
          position: defaultCenter,
          map: map,
          title: property.name,
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

        console.log('[네이버 지도] 초기화 완료 ✅')
      } catch (error) {
        console.error('[네이버 지도] 초기화 오류:', error)
      }
    }

    // 지도 초기화 (네이버 지도 SDK 로드 대기)
    const checkAndInit = () => {
      if (window.naver && window.naver.maps) {
        console.log('[네이버 지도] SDK 로드 확인 ✅')
        initMap()
      } else {
        console.log('[네이버 지도] SDK 로드 대기 중...')
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
  }, [isOpen, isLoggedIn, property])

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

  const handleRatingClick = () => {
    if (property.reviews && property.reviews.length > 0) {
      setIsReviewModalOpen(true)
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

                  <div className={styles.summarySection}>
                    <h3 className={styles.sectionTitle}>핵심 요약</h3>
                    <div className={styles.summaryList}>
                      <div className={styles.summaryItem}>
                        <div className={`${styles.summaryIcon} ${styles.greenIcon}`} />
                        <span className={styles.summaryText}>
                          {property.keySummary.recommendRate}% 가 이 부동산을 추천해요
                        </span>
                      </div>
                      <div className={styles.summaryItem}>
                        <div className={`${styles.summaryIcon} ${styles.yellowIcon}`} />
                        <span className={styles.summaryText}>
                          {property.keySummary.discountRate}% 가 수수료 할인을 받았어요
                        </span>
                      </div>
                      <div className={styles.summaryItem}>
                        <div className={`${styles.summaryIcon} ${styles.blueIcon}`} />
                        <span className={styles.summaryText}>
                          {property.keySummary.explanationRate}% 가 계약 설명이 꼼꼼했다고 해요
                        </span>
                      </div>
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
                </div>

                {/* 키워드 뱃지 */}
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

                {/* 상세 평가 */}
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

                {/* 핵심 요약 */}
                <div className={styles.summarySection}>
                  <h3 className={styles.sectionTitle}>핵심 요약</h3>
                  <div className={styles.summaryList}>
                    <div className={styles.summaryItem}>
                      <div className={`${styles.summaryIcon} ${styles.greenIcon}`} />
                      <span className={styles.summaryText}>
                        {property.keySummary.recommendRate}% 가 이 부동산을 추천해요
                      </span>
                    </div>
                    <div className={styles.summaryItem}>
                      <div className={`${styles.summaryIcon} ${styles.yellowIcon}`} />
                      <span className={styles.summaryText}>
                        {property.keySummary.discountRate}% 가 수수료 할인을 받았어요
                      </span>
                    </div>
                    <div className={styles.summaryItem}>
                      <div className={`${styles.summaryIcon} ${styles.blueIcon}`} />
                      <span className={styles.summaryText}>
                        {property.keySummary.explanationRate}% 가 계약 설명이 꼼꼼했다고 해요
                      </span>
                    </div>
                  </div>
                </div>

                {/* 네이버 지도 */}
                <div className={styles.mapSection}>
                  <h3 className={styles.sectionTitle}>위치</h3>
                  <div 
                    ref={mapRef} 
                    className={styles.naverMap}
                    style={{ 
                      width: '100%', 
                      height: '300px',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* 네이버 지도 API가 없을 때 대체 UI */}
                    {(!window.naver || !window.naver.maps) && (
                      <div 
                        className={styles.miniMap} 
                        onClick={handleMapClick}
                        style={{ height: '300px' }}
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
                    )}
                  </div>
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
    </>
  )
}
