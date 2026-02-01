'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import PropertyList from '@/components/PropertyList'
import CopyBanner from '@/components/CopyBanner'
import CameraButton from '@/components/CameraButton'
import styles from './page.module.css'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleReviewSaved = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.query) {
        console.log(`[메인] 리뷰 저장 이벤트: "${detail.query}"`)
        setSearchQuery(detail.query)
      }
    }

    const handleLogoClick = () => {
      console.log(`[메인] 로고 클릭 - 검색 초기화`)
      setSearchQuery('')
    }

    const handleLogout = () => {
      console.log(`[메인] 로그아웃 - 화면 초기화`)
      setSearchQuery('')
    }

    window.addEventListener('review:saved', handleReviewSaved as EventListener)
    window.addEventListener('logo:click', handleLogoClick)
    window.addEventListener('user:logout', handleLogout)

    return () => {
      window.removeEventListener('review:saved', handleReviewSaved as EventListener)
      window.removeEventListener('logo:click', handleLogoClick)
      window.removeEventListener('user:logout', handleLogout)
    }
  }, [])

  // searchQuery 변경 로그
  useEffect(() => {
    console.log(`[메인] searchQuery 상태 변경: "${searchQuery}"`)
  }, [searchQuery])

  const handleSearch = (query: string) => {
    console.log(`[메인] 검색 실행: "${query}"`)
    setSearchQuery(query)
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <SearchBar onSearch={handleSearch} value={searchQuery} />
          {!searchQuery.trim() && <CopyBanner />}
          <PropertyList searchQuery={searchQuery} />
        </div>
        <CameraButton />
      </main>
    </>
  )
}

