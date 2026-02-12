'use client'

import { useState, useEffect } from 'react'
import SearchBar from '@/components/SearchBar'
import PropertyList from '@/components/PropertyList'
import CopyBanner from '@/components/CopyBanner'
import CameraButton from '@/components/CameraButton'
import styles from './page.module.css'
import { supabase } from '@/lib/supabase/client'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchRegion, setSearchRegion] = useState('')
  const [autoOpenAgentId, setAutoOpenAgentId] = useState<number | null>(null)

  useEffect(() => {
    const handleReviewSaved = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.query) {
        setSearchQuery(detail.query)
      }
    }

    const handleLogoClick = () => {
      setSearchQuery('')
      setAutoOpenAgentId(null)
    }

    const handleLogout = () => {
      setSearchQuery('')
      setAutoOpenAgentId(null)
    }

    const handleSearchAndOpenDetail = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.searchQuery && detail?.agentId) {
        setSearchQuery(detail.searchQuery)
        setAutoOpenAgentId(detail.agentId)
      }
    }

    window.addEventListener('review:saved', handleReviewSaved as EventListener)
    window.addEventListener('logo:click', handleLogoClick)
    window.addEventListener('user:logout', handleLogout)
    window.addEventListener('search:and-open-detail', handleSearchAndOpenDetail as EventListener)

    return () => {
      window.removeEventListener('review:saved', handleReviewSaved as EventListener)
      window.removeEventListener('logo:click', handleLogoClick)
      window.removeEventListener('user:logout', handleLogout)
      window.removeEventListener('search:and-open-detail', handleSearchAndOpenDetail as EventListener)
    }
  }, [])

  // 접속 시 5P 적립 (하루 1회)
  useEffect(() => {
    const awardDailyLoginPoints = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // DB 함수를 통해 안전하게 일일 로그인 포인트 지급 확인 및 처리
        const { data, error } = await supabase.rpc('check_and_award_daily_login', {
          p_user_id: session.user.id
        })

        if (error) {
          console.error('로그인 포인트 처리 오류:', error)
          return
        }

        if (data && data.success) {
          console.log(`일일 로그인 포인트 ${data.points}P가 적립되었습니다!`)
        } else {
          console.log(data?.message || '오늘 이미 로그인 포인트를 받았습니다.')
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('로그인 포인트 적립 예외:', error)
      }
    }

    // 컴포넌트 마운트 시 한 번만 실행
    awardDailyLoginPoints()
  }, [])

  // Chrome 확장 프로그램 오류 무시
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      // Chrome 확장 프로그램 관련 오류 무시
      if (e.message && (
        e.message.includes('message channel closed') ||
        e.message.includes('asynchronous response') ||
        e.message.includes('listener indicated')
      )) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        console.log('[무시됨] Chrome 확장 프로그램 오류:', e.message)
        return true
      }
    }
    
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      const message = e.reason?.message || String(e.reason)
      if (message && (
        message.includes('message channel closed') ||
        message.includes('asynchronous response') ||
        message.includes('listener indicated')
      )) {
        e.preventDefault()
        e.stopPropagation()
        console.log('[무시됨] Chrome 확장 프로그램 Promise 오류:', message)
      }
    }
    
    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const handleSearch = (query: string, region?: string) => {
    setSearchQuery(query)
    if (region !== undefined) setSearchRegion(region)
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <SearchBar onSearch={handleSearch} value={searchQuery} />
        {!searchQuery.trim() && <CopyBanner />}
        <PropertyList 
          searchQuery={searchQuery}
          searchRegion={searchRegion}
          autoOpenAgentId={autoOpenAgentId}
          onAutoOpenComplete={() => setAutoOpenAgentId(null)}
        />
      </div>
      <CameraButton />
    </main>
  )
}

