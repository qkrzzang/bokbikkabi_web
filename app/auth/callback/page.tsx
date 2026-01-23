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
        console.log('[콜백] 1. 시작')
        console.log('[콜백] URL:', window.location.href.substring(0, 100))
        console.log('[콜백] Hash 길이:', window.location.hash.length)
        
        // 오류 확인
        const errorParam = searchParams.get('error')
        if (errorParam) {
          console.error('[콜백] OAuth 오류:', errorParam)
          if (isMounted) {
            setError('인증 오류')
            setTimeout(() => router.replace('/'), 2000)
          }
          return
        }

        // Hash에 access_token이 있는지 확인
        const hasAccessToken = window.location.hash.includes('access_token')
        const hasCode = searchParams.get('code')
        
        console.log('[콜백] 2. 인증 데이터:', { hasAccessToken, hasCode })
        
        if (!hasAccessToken && !hasCode) {
          console.error('[콜백] 인증 데이터 없음')
          if (isMounted) {
            router.replace('/')
          }
          return
        }

        // Supabase 자동 처리 대기
        console.log('[콜백] 3. Supabase 자동 처리 대기 중...')
        
        // onAuthStateChange로 실시간 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[콜백] 이벤트:', event)
          
          if (event === 'SIGNED_IN' && session && isMounted) {
            console.log('[콜백] 4. 로그인 완료! userId:', session.user.id)
            
            // Upsert
            import('@/lib/auth-check')
              .then(({ upsertUserToUsersTable }) => upsertUserToUsersTable(session.user))
              .catch(() => {})
            
            // 리다이렉트
            setTimeout(() => {
              if (isMounted) {
                console.log('[콜백] 5. 메인 이동')
                setIsProcessing(false)
                router.replace('/')
              }
            }, 300)
          }
        })
        
        // 백업: 3초 후 직접 세션 확인
        setTimeout(async () => {
          if (!isMounted) {
            subscription.unsubscribe()
            return
          }
          
          console.log('[콜백] 6. 백업 세션 확인')
          const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
          
          if (session) {
            console.log('[콜백] 7. 세션 있음! 메인 이동')
            
            import('@/lib/auth-check')
              .then(({ upsertUserToUsersTable }) => upsertUserToUsersTable(session.user))
              .catch(() => {})
            
            setIsProcessing(false)
            router.replace('/')
          } else {
            console.error('[콜백] 8. 세션 없음')
            setError('로그인 처리 실패')
            setTimeout(() => router.replace('/'), 2000)
          }
          
          subscription.unsubscribe()
        }, 3000)
      } catch (err) {
        console.error('[콜백] 오류:', err)
        if (isMounted) {
          setTimeout(() => router.replace('/'), 1000)
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
