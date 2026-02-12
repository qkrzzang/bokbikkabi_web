/**
 * Google Analytics 4 (GA4) 유틸리티
 *
 * @next/third-parties/google의 GoogleAnalytics 컴포넌트가
 * gtag.js 로딩과 기본 pageview 추적을 자동으로 처리합니다.
 * 이 파일은 커스텀 이벤트 전송을 위한 헬퍼 함수를 제공합니다.
 *
 * @example
 * import { event } from '@/lib/gtag'
 * event('ocr_fail', { reason: '이미지 흐림' })
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''

/** GA가 활성화되어 있는지 확인 */
export const isGAEnabled = (): boolean => {
  return !!GA_ID && typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/**
 * 커스텀 이벤트 전송
 *
 * @param eventName - 이벤트 이름 (예: 'ocr_fail', 'review_submit', 'login')
 * @param params - 이벤트 매개변수 (key-value)
 *
 * @example
 * // 기본 사용
 * event('button_click', { label: '리뷰 작성' })
 *
 * // OCR 실패 이벤트
 * event('ocr_fail', { reason: 'API 429 Rate Limit', agent_number: '12345' })
 *
 * // 로그인 이벤트
 * event('login', { method: 'kakao' })
 *
 * // 리뷰 작성 완료
 * event('review_submit', { agent_id: 123, rating: 4.5 })
 */
export const event = (
  eventName: string,
  params?: Record<string, string | number | boolean>
): void => {
  if (!isGAEnabled()) {
    // 개발 환경에서는 콘솔에 로그
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GA4 Dev] event: ${eventName}`, params)
    }
    return
  }

  window.gtag('event', eventName, params)
}

/**
 * 페이지뷰 수동 전송 (SPA 라우트 변경 시)
 * 참고: @next/third-parties가 기본 페이지뷰를 자동 추적하므로
 *       대부분의 경우 수동 호출이 필요하지 않습니다.
 */
export const pageview = (url: string): void => {
  if (!isGAEnabled()) return

  window.gtag('config', GA_ID, {
    page_path: url,
  })
}

// ========================================
// 사전 정의된 커스텀 이벤트 함수들
// ========================================

/** OCR 인식 실패 이벤트 */
export const trackOcrFail = (reason: string, details?: string): void => {
  event('ocr_fail', {
    reason,
    ...(details && { details }),
  })
}

/** OCR 인식 성공 이벤트 */
export const trackOcrSuccess = (agentCount: number): void => {
  event('ocr_success', { agent_count: agentCount })
}

/** 로그인 이벤트 */
export const trackLogin = (method: 'kakao' | 'google'): void => {
  event('login', { method })
}

/** 리뷰 작성 완료 이벤트 */
export const trackReviewSubmit = (agentId: number, avgRating: number): void => {
  event('review_submit', { agent_id: agentId, avg_rating: avgRating })
}

/** 검색 이벤트 */
export const trackSearch = (query: string, region?: string): void => {
  event('search', { search_term: query, ...(region && { region }) })
}

/** 광고/제휴 문의 이벤트 */
export const trackInquiry = (type: string): void => {
  event('partnership_inquiry', { inquiry_type: type })
}

// TypeScript 전역 타입 선언
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}
