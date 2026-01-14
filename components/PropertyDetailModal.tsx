'use client'

import { useState } from 'react'
import ReviewModal from './ReviewModal'
import styles from './PropertyDetailModal.module.css'

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
            {/* 헤더 */}
            <div className={styles.header}>
              <h2 className={styles.propertyName}>{property.name}</h2>
              <div className={styles.addressSection}>
                <span className={styles.address}>{property.address}</span>
              </div>
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

            {/* 미니맵 */}
            <div className={styles.mapSection}>
              <div className={styles.miniMap} onClick={handleMapClick}>
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
