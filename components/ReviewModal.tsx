'use client'

import { useState } from 'react'
import styles from './ReviewModal.module.css'

interface Review {
  id: string
  author: string
  rating: number
  date: string
  content: string
  helpfulCount?: number
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

  const [reportingReview, setReportingReview] = useState<Review | null>(null)
  const [reportReason, setReportReason] = useState<'fake' | 'privacy' | 'other' | ''>('')
  const [reportText, setReportText] = useState('')
  const [reportError, setReportError] = useState<string | null>(null)

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

  const openReport = (review: Review) => {
    setReportingReview(review)
    setReportReason('')
    setReportText('')
    setReportError(null)
  }

  const closeReport = () => {
    setReportingReview(null)
    setReportReason('')
    setReportText('')
    setReportError(null)
  }

  const submitReport = () => {
    if (!reportReason) {
      setReportError('신고 사유를 선택해주세요.')
      return
    }
    if (!reportText.trim()) {
      setReportError('신고하시는 이유를 입력해주세요.')
      return
    }

    alert('신고가 접수되었습니다. (목)')
    closeReport()
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
                      <div className={styles.authorRow}>
                        <span className={styles.reviewAuthor}>{review.author}</span>
                        <span className={styles.userLevelBadge} aria-label="작성자 등급: 인주까비">
                          인주까비
                        </span>
                      </div>
                      <div className={styles.reviewRating}>
                        <span className={styles.reviewStars}>
                          {renderStars(review.rating)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.reviewMetaRight}>
                      <span className={styles.reviewDate}>{review.date}</span>
                      <span className={styles.verified} aria-label="계약 인증">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={styles.verifiedIcon}
                        >
                          <path
                            d="M20 6L9 17L4 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        계약 인증
                      </span>
                    </div>
                  </div>
                  {/* 거래 상황 태그 */}
                  {review.transactionTags && review.transactionTags.length > 0 && (
                    <div className={styles.reviewTagSection}>
                      <span className={styles.tagLabel}>거래 상황 태그:</span>
                      <div className={styles.reviewTags}>
                        {review.transactionTags.map((tag, index) => (
                          <span key={index} className={`${styles.tag} ${styles.transactionTag}`}>
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
                          <span key={index} className={`${styles.tag} ${styles.praiseTag}`}>
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
                          <span key={index} className={`${styles.tag} ${styles.regretTag}`}>
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

                  <div className={styles.reviewActions}>
                    <div className={styles.helpfulPrompt}>이 리뷰가 도움이 되었나요?</div>
                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={styles.helpfulButton}
                        onClick={() => alert('도움돼요 (목)')}
                      >
                        <span className={styles.helpfulIcon} aria-hidden="true">👍</span>
                        도움돼요 {review.helpfulCount ?? 3}
                      </button>
                      <button
                        type="button"
                        className={styles.reportLink}
                        onClick={() => openReport(review)}
                      >
                        신고하기
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 신고하기 모달 */}
      {reportingReview && (
        <div className={styles.reportOverlay} onClick={closeReport}>
          <div className={styles.reportModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.reportHeader}>
              <div className={styles.reportTitle}>신고하기</div>
              <button className={styles.reportClose} type="button" onClick={closeReport} aria-label="닫기">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

            <div className={styles.reportBody}>
              <div className={styles.reportHint}>
                대상: {reportingReview.author} · {reportingReview.date}
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>신고하는 사유가 무엇인가요? (필수)</div>
                <div className={styles.reasonList} role="radiogroup" aria-label="신고 사유">
                  <label className={styles.reasonItem}>
                    <input
                      type="radio"
                      name="reportReason"
                      value="fake"
                      checked={reportReason === 'fake'}
                      onChange={() => setReportReason('fake')}
                    />
                    <span>허위 정보</span>
                  </label>
                  <label className={styles.reasonItem}>
                    <input
                      type="radio"
                      name="reportReason"
                      value="privacy"
                      checked={reportReason === 'privacy'}
                      onChange={() => setReportReason('privacy')}
                    />
                    <span>개인정보 누출 위험</span>
                  </label>
                  <label className={styles.reasonItem}>
                    <input
                      type="radio"
                      name="reportReason"
                      value="other"
                      checked={reportReason === 'other'}
                      onChange={() => setReportReason('other')}
                    />
                    <span>기타</span>
                  </label>
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>신고하시는 이유를 알려주세요 (필수)</div>
                <textarea
                  className={styles.reportTextarea}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={4}
                  placeholder="신고 사유를 구체적으로 작성해주세요."
                />
              </div>

              {reportError && <div className={styles.reportError}>{reportError}</div>}

              <button className={styles.reportSubmit} type="button" onClick={submitReport}>
                신고하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

