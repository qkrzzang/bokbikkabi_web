'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import PropertyList from '@/components/PropertyList'
import CopyBanner from '@/components/CopyBanner'
import CameraButton from '@/components/CameraButton'
import styles from './page.module.css'
import { supabase } from '@/lib/supabase/client'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
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

        // 오늘 이미 로그인 포인트를 받았는지 확인
        const today = new Date().toISOString().split('T')[0]
        const { data: existingTransactions, error: checkError } = await supabase
          .from('point_transactions')
          .select('id')
          .eq('supabase_user_id', session.user.id)
          .eq('transaction_type', 'DAILY_LOGIN')
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`)
          .limit(1)

        if (checkError) {
          console.error('로그인 포인트 확인 오류:', checkError)
          return
        }

        if (existingTransactions && existingTransactions.length > 0) {
          console.log('오늘 이미 로그인 포인트를 받았습니다.')
          return
        }

        // 포인트 적립 함수 호출
        const { data, error } = await supabase.rpc('award_points', {
          p_user_id: session.user.id,
          p_transaction_type: 'DAILY_LOGIN',
          p_description: '일일 로그인 보상'
        })

        if (error) {
          console.error('로그인 포인트 적립 오류:', error)
        } else {
          console.log('일일 로그인 포인트 5P가 적립되었습니다!')
        }
      } catch (error) {
        console.error('로그인 포인트 적립 예외:', error)
      }
    }

    // 컴포넌트 마운트 시 한 번만 실행
    awardDailyLoginPoints()
  }, [])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <SearchBar onSearch={handleSearch} value={searchQuery} />
          {!searchQuery.trim() && <CopyBanner />}
          <PropertyList 
            searchQuery={searchQuery} 
            autoOpenAgentId={autoOpenAgentId}
            onAutoOpenComplete={() => setAutoOpenAgentId(null)}
          />
        </div>
        <CameraButton />
      </main>
    </>
  )
}

