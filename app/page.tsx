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
        setSearchQuery(detail.query)
      }
    }

    const handleLogoClick = () => {
      setSearchQuery('')
    }

    const handleLogout = () => {
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
          <PropertyList searchQuery={searchQuery} />
        </div>
      </main>
      <CameraButton />
    </>
  )
}

