'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import PropertyList from '@/components/PropertyList'
import CopyBanner from '@/components/CopyBanner'
import CameraButton from '@/components/CameraButton'
import styles from './page.module.css'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <SearchBar onSearch={handleSearch} />
          {!searchQuery.trim() && <CopyBanner />}
          <PropertyList searchQuery={searchQuery} />
        </div>
        <CameraButton />
      </main>
    </>
  )
}

