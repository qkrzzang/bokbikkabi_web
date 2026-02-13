'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const redirected = useRef(false)

  /**
   * 홈으로 이동 (전체 페이지 리로드)
   * 
   * ★ 핵심: window.location.href 사용 (SPA 내비게이션 X)
   *   - router.replace('/')는 AuthProvider를 재마운트하지 않음
   *   - 코드 교환 완료 전에 initializeAuth가 이미 실행되어 세션 없이 isLoading=false 설정
   *   - 전체 리로드하면 AuthProvider가 새로 마운트되어 localStorage의 세션을 확실히 읽음
   */
  const goHome = async () => {
    if (redirected.current) return
    redirected.current = true

    // 세션이 localStorage에 완전히 저장될 때까지 충분히 대기
    await new Promise(resolve => setTimeout(resolve, 300))

    // ★ 전체 페이지 리로드로 이동 (AuthContext가 새로 초기화됨)
    window.location.href = '/'
  }

  useEffect(() => {
    let isMounted = true
    console.log('[콜백] 🚀 useEffect 시작')

    // 오류 확인
    const errorParam = searchParams.get('error')
    if (errorParam) {
      console.log('[콜백] ❌ OAuth 오류:', errorParam)
      setError(`인증 오류: ${searchParams.get('error_description') || errorParam}`)
      setTimeout(goHome, 3000)
      return
    }

    const code = searchParams.get('code')
    const hasAccessToken = window.location.hash.includes('access_token')

    if (!code && !hasAccessToken) {
      console.log('[콜백] ℹ️ 인증 파라미터 없음, 홈으로 이동')
      goHome()
      return
    }

    // ★ detectSessionInUrl: true + noOpLock 조합의 문제
    //   noOpLock으로 내부 동기화가 없어져서 코드 교환 완료 전에 getSession()이 호출됨
    //   해결: 더 빠른 폴링으로 세션 확보를 즉시 감지
    console.log('[콜백] ✅ 인증 파라미터 있음, 적극적 폴링으로 세션 대기...')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!isMounted || redirected.current) return

      console.log('[콜백] 🔔 인증 이벤트:', event, session ? '세션 있음' : '세션 없음')

      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        console.log('[콜백] ✅ 로그인 성공! User:', session.user.email)
        subscription.unsubscribe()
        clearInterval(checkInterval)
        // 세션 확보 후 약간의 대기 (localStorage 완전 저장 보장)
        setTimeout(() => goHome(), 200)
      }
    })

    // 핵심: 100ms 간격의 빠른 폴링으로 세션 즉시 감지 (최대 50회 = 5초)
    let checkCount = 0
    const checkInterval = setInterval(async () => {
      if (redirected.current || !isMounted) {
        clearInterval(checkInterval)
        return
      }
      checkCount++
      
      if (checkCount % 5 === 0) {
        console.log('[콜백] 🔍 폴링', checkCount, '회차...')
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('[콜백] ✅ 폴링으로 세션 감지! (', checkCount, '회차, ', checkCount * 100, 'ms)')
          console.log('[콜백] 👤 User:', session.user.email)
          clearInterval(checkInterval)
          subscription.unsubscribe()
          // 세션 확보 후 약간의 대기 (localStorage 완전 저장 보장)
          setTimeout(() => goHome(), 200)
        } else if (checkCount >= 50) {
          console.log('[콜백] ⏰ 타임아웃 (5초) - 홈으로 이동')
          clearInterval(checkInterval)
          subscription.unsubscribe()
          goHome()
        }
      } catch (err) {
        console.log('[콜백] ❌ 폴링 오류:', err)
      }
    }, 100) // 100ms 간격

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearInterval(checkInterval)
    }
  }, [router, searchParams])

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '20px', textAlign: 'center'
      }}>
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>오류 발생</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
        <button onClick={() => { window.location.href = '/' }} style={{
          padding: '10px 20px', backgroundColor: '#7C3AED', color: '#fff',
          border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
        }}>홈으로 이동</button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '20px', textAlign: 'center'
    }}>
      <div style={{
        width: '48px', height: '48px', border: '4px solid #e1e8f0',
        borderTopColor: '#7C3AED', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', marginBottom: '24px'
      }} />
      <p style={{ color: '#64748b', fontSize: '16px' }}>로그인 처리 중...</p>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

async function upsertUser(user: any) {
  try {
    const { upsertUserToUsersTable } = await import('@/lib/auth-check')
    await upsertUserToUsersTable(user)
  } catch (err) {
    console.error('[콜백] Users Upsert 실패:', err)
  }
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '20px', textAlign: 'center'
      }}>
        <div style={{
          width: '48px', height: '48px', border: '4px solid #e1e8f0',
          borderTopColor: '#7C3AED', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', marginBottom: '24px'
        }} />
        <p style={{ color: '#64748b', fontSize: '16px' }}>로딩 중...</p>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
