'use client'

import styles from './ReviewModal.module.css'

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

interface ReviewModalProps {
  reviews: Review[]
  isOpen: boolean
  onClose: () => void
  propertyName: string
}

export default function ReviewModal({
  reviews,
  isOpen,
  onClose,
  propertyName,
}: ReviewModalProps) {
  if (!isOpen) return null

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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{propertyName} 상세 리뷰</h2>
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
        </div>

        <div className={styles.modalContent}>
          {reviews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>아직 리뷰가 없습니다.</p>
            </div>
          ) : (
            <div className={styles.reviewList}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewAuthorInfo}>
                      <span className={styles.reviewAuthor}>{review.author}</span>
                      <div className={styles.reviewRating}>
                        <span className={styles.reviewStars}>
                          {renderStars(review.rating)}
                        </span>
                      </div>
                    </div>
                    <span className={styles.reviewDate}>{review.date}</span>
                  </div>
                  {/* 거래 상황 태그 */}
                  {review.transactionTags && review.transactionTags.length > 0 && (
                    <div className={styles.reviewTagSection}>
                      <span className={styles.tagLabel}>거래 상황 태그:</span>
                      <div className={styles.reviewTags}>
                        {review.transactionTags.map((tag, index) => (
                          <span key={index} className={styles.reviewTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 칭찬 태그 */}
                  {review.praiseTags && review.praiseTags.length > 0 && (
                    <div className={styles.reviewTagSection}>
                      <span className={styles.tagLabel}>칭찬 태그:</span>
                      <div className={styles.reviewTags}>
                        {review.praiseTags.map((tag, index) => (
                          <span key={index} className={styles.reviewTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 아쉬움 태그 */}
                  {review.regretTags && review.regretTags.length > 0 && (
                    <div className={styles.reviewTagSection}>
                      <span className={styles.tagLabel}>아쉬움 태그:</span>
                      <div className={styles.reviewTags}>
                        {review.regretTags.map((tag, index) => (
                          <span key={index} className={`${styles.reviewTag} ${styles.regretTag}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 상세 평가 */}
                  {review.detailedEvaluation && review.detailedEvaluation.length > 0 && (
                    <div className={styles.reviewEvaluation}>
                      {review.detailedEvaluation.map((item, index) => (
                        <div key={index} className={styles.reviewEvaluationItem}>
                          <span className={styles.evaluationCategory}>{item.category}</span>
                          {renderScoreBar(item.score)}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={styles.reviewContent}>{review.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

