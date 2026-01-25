'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logAccess } from '@/lib/accessLog'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    
    const handleCallback = async () => {
      try {
        console.log('[콜백] ===== 카카오 OAuth 콜백 처리 시작 =====')
        console.log('[콜백] 1. 현재 URL:', window.location.href)
        console.log('[콜백] 2. Hash:', window.location.hash.substring(0, 100))
        console.log('[콜백] 3. Search:', window.location.search)
        console.log('[콜백] 4. Origin:', window.location.origin)
        
        // 오류 확인
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (errorParam) {
          console.error('[콜백] ❌ OAuth 오류:', errorParam)
          console.error('[콜백] 오류 설명:', errorDescription)
          if (isMounted) {
            setError(`인증 오류: ${errorDescription || errorParam}`)
            setTimeout(() => router.replace('/'), 3000)
          }
          return
        }

        // Hash에 access_token이 있는지 확인
        const hasAccessToken = window.location.hash.includes('access_token')
        const hasCode = searchParams.get('code')
        
        console.log('[콜백] 5. 인증 데이터 확인:', { 
          hasAccessToken, 
          hasCode: !!hasCode,
          codeLength: hasCode?.length || 0
        })
        
        if (!hasAccessToken && !hasCode) {
          console.error('[콜백] ❌ 인증 데이터 없음 - 홈으로 리다이렉트')
          if (isMounted) {
            router.replace('/')
          }
          return
        }

        // Supabase 자동 처리 대기
        console.log('[콜백] 6. Supabase 세션 처리 대기...')
        
        // 먼저 즉시 세션 확인 (코드 교환 완료 여부)
        const { data: { session: immediateSession } } = await supabase.auth.getSession()
        
        if (immediateSession) {
          console.log('[콜백] ✅ 즉시 세션 확인 성공!')
          console.log('[콜백] User ID:', immediateSession.user.id)
          console.log('[콜백] Email:', immediateSession.user.email)
          console.log('[콜백] Provider:', immediateSession.user.app_metadata?.provider)
          
          // Users 테이블 Upsert
          try {
            const { upsertUserToUsersTable } = await import('@/lib/auth-check')
            await upsertUserToUsersTable(immediateSession.user)
            console.log('[콜백] Users 테이블 Upsert 완료')
          } catch (upsertError) {
            console.error('[콜백] Users 테이블 Upsert 실패:', upsertError)
          }
          
          // 메인으로 리다이렉트
          if (isMounted) {
            console.log('[콜백] 7. 메인 페이지로 이동')
            setIsProcessing(false)
            router.replace('/')
          }
          return
        }
        
        console.log('[콜백] 세션 없음 - onAuthStateChange 대기')
        
        // onAuthStateChange로 실시간 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[콜백] 인증 이벤트:', event)
          console.log('[콜백] 세션:', session ? 'O' : 'X')
          
          if (event === 'SIGNED_IN' && session && isMounted) {
            console.log('[콜백] ✅ SIGNED_IN 이벤트 수신!')
            console.log('[콜백] User ID:', session.user.id)
            
            // Users 테이블 Upsert
            try {
              const { upsertUserToUsersTable } = await import('@/lib/auth-check')
              await upsertUserToUsersTable(session.user)
              console.log('[콜백] Users 테이블 Upsert 완료')
            } catch (upsertError) {
              console.error('[콜백] Users 테이블 Upsert 실패:', upsertError)
            }
            
            // 리다이렉트
            setTimeout(() => {
              if (isMounted) {
                console.log('[콜백] 메인 페이지로 이동')
                setIsProcessing(false)
                router.replace('/')
              }
            }, 500)
            
            subscription.unsubscribe()
          }
        })
        
        // 백업: 5초 후 직접 세션 확인
        setTimeout(async () => {
          if (!isMounted) {
            subscription.unsubscribe()
            return
          }
          
          console.log('[콜백] 8. 백업 세션 확인 (5초 경과)')
          const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
          
          if (session) {
            console.log('[콜백] ✅ 백업 확인: 세션 있음! 메인 이동')
            console.log('[콜백] User:', session.user.email)
            
            try {
              const { upsertUserToUsersTable } = await import('@/lib/auth-check')
              await upsertUserToUsersTable(session.user)
            } catch (upsertError) {
              console.error('[콜백] Upsert 실패:', upsertError)
            }
            
            setIsProcessing(false)
            router.replace('/')
          } else {
            console.error('[콜백] ❌ 백업 확인: 세션 없음 - 로그인 실패')
            console.error('[콜백] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
            console.error('[콜백] 가능한 원인:')
            console.error('  1. Supabase 프로젝트의 Redirect URL 설정 확인')
            console.error('  2. 카카오 Developers의 Redirect URI 설정 확인')
            console.error('  3. Site URL 설정 확인')
            setError('로그인 처리 실패 - 설정을 확인해주세요')
            setTimeout(() => router.replace('/'), 3000)
          }
          
          subscription.unsubscribe()
        }, 5000)
      } catch (err) {
        console.error('[콜백] 예외 발생:', err)
        if (isMounted) {
          setError('로그인 처리 중 오류 발생')
          setTimeout(() => router.replace('/'), 2000)
        }
      }
    }

    handleCallback()
    
    return () => {
      isMounted = false
    }
  }, [router, searchParams])

  if (error) {
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
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>오류 발생</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#7C3AED',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          홈으로 이동
        </button>
      </div>
    )
  }

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
        borderTopColor: '#7C3AED',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '24px'
      }} />
      <p style={{ color: '#64748b', fontSize: '16px' }}>
        로그인 처리 중...
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

export default function CallbackPage() {
  return (
    <Suspense fallback={
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
          borderTopColor: '#7C3AED',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '24px'
        }} />
        <p style={{ color: '#64748b', fontSize: '16px' }}>
          로딩 중...
        </p>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
