import { useState, useEffect } from 'react'

const APP_UA_TOKEN = 'BokbiKkabiApp'

/**
 * 현재 서비스가 모바일 앱(WebView) 내부에서 실행 중인지 감지하는 커스텀 훅.
 *
 * User Agent에 'BokbiKkabiApp' 문자열이 포함되어 있으면 앱으로 판별합니다.
 * SSR 환경에서는 false를 반환하며, 클라이언트 마운트 후 실제 값을 반영합니다.
 *
 * @example
 * const { isApp } = useAppDetect()
 *
 * return (
 *   <>
 *     {isApp && <AppOnlySettings />}
 *     {!isApp && <WebOnlyBanner />}
 *   </>
 * )
 */
export function useAppDetect() {
  const [isApp, setIsApp] = useState(false)

  useEffect(() => {
    setIsApp(navigator.userAgent.includes(APP_UA_TOKEN))
  }, [])

  return { isApp }
}

/**
 * 앱 WebView 여부를 동기적으로 판별하는 유틸리티 함수.
 * 이벤트 핸들러, API 호출 등 훅 밖에서 사용할 때 활용합니다.
 *
 * 주의: SSR 환경(서버 컴포넌트)에서는 사용할 수 없습니다.
 *
 * @example
 * const handleShare = () => {
 *   if (checkIsApp()) {
 *     window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'share', url }))
 *   } else {
 *     navigator.share({ url })
 *   }
 * }
 */
export function checkIsApp(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.userAgent.includes(APP_UA_TOKEN)
}
