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
   * 홈으로 이동 (router.replace 사용 → 뒤로가기 시 콜백 페이지로 돌아가지 않음)
   * 세션이 localStorage에 완전히 저장된 후 이동해야 AuthContext가 세션을 읽을 수 있음
   */
  const goHome = async () => {
    if (redirected.current) return
    redirected.current = true

    // URL에서 code 파라미터 즉시 제거 (뒤로가기 방지)
    try {
      window.history.replaceState({}, '', '/auth/callback')
    } catch {}

    // 세션이 localStorage에 완전히 저장될 때까지 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 100))

    // SPA 내비게이션으로 이동 (전체 페이지 리로드 없이)
    router.replace('/')
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

    // ★ detectSessionInUrl: true이므로 Supabase가 자동 코드 교환 수행
    //   onAuthStateChange로 SIGNED_IN 이벤트 감지 후 리디렉트
    console.log('[콜백] ✅ 인증 파라미터 있음, detectSessionInUrl 자동 교환 대기...')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!isMounted || redirected.current) return

      console.log('[콜백] 🔔 인증 이벤트:', event, session ? '세션 있음' : '세션 없음')

      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        console.log('[콜백] ✅ 로그인 성공! User:', session.user.email)
        subscription.unsubscribe()
        clearInterval(checkInterval)
        goHome()
      }
    })

    // 안전장치: 폴링 (최대 8초)
    let checkCount = 0
    const checkInterval = setInterval(async () => {
      if (redirected.current || !isMounted) {
        clearInterval(checkInterval)
        return
      }
      checkCount++
      console.log('[콜백] 🔍 폴링', checkCount, '회차...')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('[콜백] ✅ 폴링으로 세션 감지:', session.user.email)
          clearInterval(checkInterval)
          subscription.unsubscribe()
          goHome()
        } else if (checkCount >= 8) {
          console.log('[콜백] ⏰ 타임아웃 - 홈으로 이동')
          clearInterval(checkInterval)
          subscription.unsubscribe()
          goHome()
        }
      } catch (err) {
        console.log('[콜백] ❌ 폴링 오류:', err)
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
