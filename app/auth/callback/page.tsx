'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logAccess } from '@/lib/accessLog'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('1. Callback 페이지 도달: 세션 확인 시작')

        // 1. URL에서 에러 확인
        const errorParam = searchParams.get('error')
        const code = searchParams.get('code')
        
        if (errorParam) {
          console.error('OAuth 에러:', errorParam)
          setError(`인증 오류: ${errorParam}`)
          router.push(`/?error=oauth_error&message=${errorParam}`)
          return
        }

        // 2. 세션 확인 (Supabase가 자동으로 URL에서 세션 정보를 처리)
        // code가 있으면 Supabase가 자동으로 세션으로 교환
        let session = null
        let retryCount = 0
        const maxRetries = 5

        while (!session && retryCount < maxRetries) {
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError) {
            console.error('세션 확인 오류:', sessionError)
            setError('세션 확인 중 오류가 발생했습니다.')
            router.push('/?error=session_error')
            return
          }

          if (currentSession) {
            session = currentSession
            break
          }

          // 세션이 아직 준비되지 않았으면 잠시 대기 후 재시도
          if (code && retryCount < maxRetries - 1) {
            console.log(`세션 대기 중... (${retryCount + 1}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, 500))
            retryCount++
          } else {
            break
          }
        }

        if (!session) {
          console.warn('세션 없음: 사용자가 로그인하지 않았습니다.')
          setError('세션을 찾을 수 없습니다.')
          router.push('/?error=no_session')
          return
        }

        console.log('2. 세션 확인 성공:', { userId: session.user.id, provider: session.user.app_metadata?.provider })

        // 3. users 테이블에 사용자 정보 Upsert (반드시 await로 완료 대기)
        console.log('3. users 테이블에 사용자 정보 Upsert 시작')
        try {
          const { upsertUserToUsersTable } = await import('@/lib/auth-check')
          const upsertSuccess = await upsertUserToUsersTable(session.user)
          if (upsertSuccess) {
            console.log('3-1. 사용자 정보 Upsert 완료')
          } else {
            console.warn('3-1. 사용자 정보 Upsert 실패 (계속 진행)')
          }
        } catch (upsertError) {
          console.error('사용자 Upsert 오류 (계속 진행):', upsertError)
          // Upsert 실패해도 로그인은 계속 진행
        }

        // 4. 접속 이력 기록 (session 확인 후)
        console.log('4. 접속 이력 기록 시작')
        try {
          await logAccess({
            action: 'login',
            endpoint: '/auth/callback',
            statusCode: 200,
          })
          console.log('4-1. 접속 이력 기록 완료')
        } catch (logError) {
          console.error('접속 이력 기록 오류 (무시됨):', logError)
          // 접속 이력 기록 실패는 로그인을 막지 않음
        }

        // 4. 메인 페이지로 리다이렉트
        console.log('5. 메인 페이지로 리다이렉트')
        setIsProcessing(false)
        router.push('/')
      } catch (err) {
        console.error('Callback 처리 중 오류:', err)
        setError('처리 중 오류가 발생했습니다.')
        router.push('/?error=callback_error')
      }
    }

    handleCallback()
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
            backgroundColor: '#063561',
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
        borderTopColor: '#063561',
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
