'use client'

import { useEffect } from 'react'

export default function PWAInstallPrompt() {
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth <= 768

    if (isMobile) {
      // 모바일: Service Worker 등록 (PWA 기능 활성화)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('[SW] 등록 성공:', reg.scope))
          .catch((err) => console.error('[SW] 등록 실패:', err))
      }
    }
    // PC: Service Worker를 등록하지 않음 (설치 프롬프트 자체가 발생하지 않게)
    // beforeinstallprompt 차단은 Sidebar.tsx에서 처리
  }, [])

  return null
}
