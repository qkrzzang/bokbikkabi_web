'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import PropertyList from '@/components/PropertyList'
import CopyBanner from '@/components/CopyBanner'
import CameraButton from '@/components/CameraButton'
import { checkUserAccess } from '@/lib/auth-check'
import styles from './page.module.css'

export default function Home() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const accessCheck = await checkUserAccess()
        setHasAccess(accessCheck.hasAccess)
        setIsChecking(false)

        // 로그인했지만 users 테이블에 없어서 접근이 거부된 경우
        if (!accessCheck.hasAccess && accessCheck.user) {
          console.warn('접근 제한:', accessCheck.message)
          
          // 추가 재시도 후에도 실패하면 로그아웃
          setTimeout(async () => {
            const retryCheck = await checkUserAccess()
            if (!retryCheck.hasAccess && retryCheck.user) {
              console.error('사용자가 users 테이블에 없습니다. 로그아웃 처리')
              const { supabase } = await import('@/lib/supabase/client')
              await supabase.auth.signOut()
              setHasAccess(false)
            } else {
              setHasAccess(true)
            }
          }, 2000)
        }
      } catch (error) {
        console.error('접근 확인 중 오류:', error)
        // 오류 발생 시에도 접근 허용 (오류는 로그만 남김)
        setHasAccess(true)
        setIsChecking(false)
      }
    }

    verifyAccess()
  }, [])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e1e8f0',
          borderTopColor: '#063561',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '24px'
        }} />
        <p style={{ color: '#64748b', fontSize: '16px' }}>
          접근 권한 확인 중...
        </p>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    )
  }

  // users 테이블에 없는 로그인 사용자는 접근 불가
  if (!hasAccess) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#1e293b', marginBottom: '16px', fontSize: '24px' }}>
              접근이 제한되었습니다
            </h2>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '16px' }}>
              서비스 이용을 위해 로그인이 필요합니다.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              카카오 또는 구글로 로그인해주세요.
            </p>
          </div>
        </main>
      </>
    )
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

