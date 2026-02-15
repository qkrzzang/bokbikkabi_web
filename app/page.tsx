'use client'

import { useState, useEffect } from 'react'
import SearchBar from '@/components/SearchBar'
import PropertyList from '@/components/PropertyList'
import CopyBanner from '@/components/CopyBanner'
import CameraButton from '@/components/CameraButton'
import styles from './page.module.css'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

const REGION_VALUES = [
  '서울특별시', '경기도', '인천광역시', '부산광역시', '대구광역시',
  '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '강원특별자치도', '충청북도', '충청남도', '전북특별자치도',
  '전라남도', '경상북도', '경상남도', '제주특별자치도',
]

function extractRegion(address: string): string {
  if (!address) return ''
  for (const region of REGION_VALUES) {
    if (address.includes(region)) return region
  }
  // 축약형 매칭 (예: "경기 성남시" → "경기도")
  const shortMap: Record<string, string> = {
    '서울': '서울특별시', '경기': '경기도', '인천': '인천광역시',
    '부산': '부산광역시', '대구': '대구광역시', '광주': '광주광역시',
    '대전': '대전광역시', '울산': '울산광역시', '세종': '세종특별자치시',
    '강원': '강원특별자치도', '충북': '충청북도', '충남': '충청남도',
    '전북': '전북특별자치도', '전남': '전라남도', '경북': '경상북도',
    '경남': '경상남도', '제주': '제주특별자치도',
  }
  for (const [short, full] of Object.entries(shortMap)) {
    if (address.startsWith(short)) return full
  }
  return ''
}

export default function Home() {
  const { user, isLoading } = useAuth()
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
      setSearchRegion('')
      setAutoOpenAgentId(null)
      
      // 완전한 초기화를 위해 페이지 새로고침
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
    }

    const handleSearchAndOpenDetail = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.searchQuery && detail?.agentId) {
        setSearchQuery(detail.searchQuery)
        setAutoOpenAgentId(detail.agentId)
        // 주소에서 지역 자동 선택
        if (detail.roadAddress) {
          const region = extractRegion(detail.roadAddress)
          setSearchRegion(region)
        }
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

  // 접속 시 5P 적립 (하루 1회) - 인증 완료 후 실행
  useEffect(() => {
    // 인증 로딩 중이거나 사용자가 없으면 실행하지 않음
    if (isLoading || !user) return

    const awardDailyLoginPoints = async () => {
      try {
        // DB 함수를 통해 안전하게 일일 로그인 포인트 지급 확인 및 처리
        const { data, error } = await supabase.rpc('check_and_award_daily_login', {
          p_user_id: user.id
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

    awardDailyLoginPoints()
  }, [user, isLoading])

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
        <SearchBar onSearch={handleSearch} value={searchQuery} regionValue={searchRegion} />
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

