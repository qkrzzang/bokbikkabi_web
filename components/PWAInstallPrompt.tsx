'use client'

import { useEffect } from 'react'

export default function PWAInstallPrompt() {
  useEffect(() => {
    // Service Worker 등록 (PWA 요건 충족)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[SW] 등록 성공:', reg.scope))
        .catch((err) => console.error('[SW] 등록 실패:', err))
    }
  }, [])

  return null
}
