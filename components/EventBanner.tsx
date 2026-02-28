'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './EventBanner.module.css'

export default function EventBanner() {
  const [config, setConfig] = useState<{ code_name: string } | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/event-banner?t=${Date.now()}`, { cache: 'no-store' })
      const { config: data } = await res.json()
      if (data?.code_name) {
        setConfig(data)
      } else {
        setConfig(null)
      }
    } catch {
      setConfig(null)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // 콘텐츠 노출 관리에서 저장 시 재조회
  useEffect(() => {
    const handler = () => fetchConfig()
    window.addEventListener('visibility:changed', handler)
    return () => window.removeEventListener('visibility:changed', handler)
  }, [fetchConfig])

  if (!config) return null

  return (
    <div className={styles.banner}>
      <span className={styles.icon}>🎁</span>
      <span className={styles.text}>{config.code_name}</span>
    </div>
  )
}
