'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './CoupangBanner.module.css'

interface CoupangBannerProps {
  position?: 'top' | 'bottom'
  device?: 'mobile' | 'pc' | 'all'
}

const BANNER_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;}body{display:flex;justify-content:center;align-items:center;min-height:50px;overflow:hidden;background:transparent;}</style>
</head><body>
<script src="https://ads-partners.coupang.com/g.js"></script>
<script>new PartnersCoupang.G({"id":965862,"template":"carousel","trackingCode":"AF8714204","width":"320","height":"50","tsource":""});</script>
</body></html>`

export default function CoupangBanner({ position = 'bottom', device = 'all' }: CoupangBannerProps) {
  const [mounted, setMounted] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !iframeRef.current) return
    const iframe = iframeRef.current
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(BANNER_HTML)
    doc.close()
  }, [mounted])

  if (!mounted) return null

  return (
    <div className={`${styles.wrapper} ${position === 'top' ? styles.top : styles.bottom} ${device === 'mobile' ? styles.mobileOnly : device === 'pc' ? styles.pcOnly : ''}`}>
      <iframe
        ref={iframeRef}
        className={styles.bannerIframe}
        title="쿠팡 파트너스 광고"
        scrolling="no"
        frameBorder="0"
      />
      <p className={styles.notice}>
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  )
}
