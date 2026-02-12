'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const redirected = useRef(false)

  const goHome = () => {
    if (!redirected.current) {
      redirected.current = true
      window.location.href = '/'
    }
  }

  useEffect(() => {
    let isMounted = true

    // 오류 확인
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(`인증 오류: ${searchParams.get('error_description') || errorParam}`)
      setTimeout(goHome, 3000)
      return
    }

    const code = searchParams.get('code')
    const hasAccessToken = window.location.hash.includes('access_token')

    if (!code && !hasAccessToken) {
      goHome()
      return
    }

    // Supabase 클라이언트가 detectSessionInUrl로 자동 코드 교환을 수행함
    // onAuthStateChange로 완료를 감지하여 리디렉트
    console.log('[콜백] 세션 처리 대기...')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!isMounted || redirected.current) return

      console.log('[콜백] 인증 이벤트:', event, session ? 'O' : 'X')

      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        console.log('[콜백] 로그인 성공! User:', session.user.email)
        subscription.unsubscribe()
        // upsert는 AuthContext에서 처리하므로 여기서는 기다리지 않고 즉시 이동
        upsertUser(session.user).catch(() => {})
        goHome()
      }
    })

    // 안전장치: 1초 간격으로 세션 확인 (최대 5회)
    let checkCount = 0
    const checkInterval = setInterval(async () => {
      if (redirected.current || !isMounted) {
        clearInterval(checkInterval)
        return
      }
      checkCount++
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('[콜백] 폴링으로 세션 감지! User:', session.user.email)
          clearInterval(checkInterval)
          subscription.unsubscribe()
          upsertUser(session.user).catch(() => {})
          goHome()
        } else if (checkCount >= 5) {
          console.log('[콜백] 타임아웃 - 홈으로 이동')
          clearInterval(checkInterval)
          subscription.unsubscribe()
          goHome()
        }
      } catch {
        // 네트워크 오류 등 무시, 다음 폴링에서 재시도
      }
    }, 1000)

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
