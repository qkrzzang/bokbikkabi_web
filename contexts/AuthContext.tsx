'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/contexts/AlertContext'

interface AuthContextType {
  user: User | null
  session: Session | null
  userType: string | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 사용자 타입 조회
  const fetchUserType = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('supabase_user_id', userId)
        .maybeSingle()

      if (!error && data) {
        setUserType(data.user_type || 'USER')
      } else {
        setUserType('USER')
      }
    } catch (error) {
      console.error('사용자 타입 조회 오류:', error)
      setUserType('USER')
    }
  }

  // users 테이블에 Upsert
  const upsertUser = async (authUser: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert(
          {
            supabase_user_id: authUser.id,
            email: authUser.email || '',
            provider: authUser.app_metadata?.provider || 'email',
            last_login_at: new Date().toISOString(),
          },
          {
            onConflict: 'supabase_user_id',
          }
        )

      if (error) {
        console.error('[AuthContext] users 테이블 upsert 오류:', error)
      }
    } catch (error) {
      console.error('[AuthContext] upsertUser 예외:', error)
    }
  }

  // 세션 새로고침
  const refreshSession = async () => {
    try {
      const { data: { session: newSession } } = await supabase.auth.getSession()
      if (newSession) {
        setSession(newSession)
        setUser(newSession.user)
        await fetchUserType(newSession.user.id)
      }
    } catch (error) {
      console.error('[AuthContext] 세션 새로고침 오류:', error)
    }
  }

  // 로그아웃
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setUserType(null)
      router.push('/')
    } catch (error) {
      console.error('[AuthContext] 로그아웃 오류:', error)
    }
  }

  useEffect(() => {
    let mounted = true
    console.log('[AuthContext] 🚀 useEffect 시작')

    /**
     * URL에서 OAuth code 파라미터를 깨끗이 제거
     * - 인증 코드가 남아 있으면 Supabase가 중복 교환을 시도하여 에러 발생
     */
    const cleanUrlParams = () => {
      if (typeof window === 'undefined') return
      const url = new URL(window.location.href)
      const hasAuthParams = url.searchParams.has('code') || url.hash.includes('access_token')
      if (hasAuthParams) {
        url.searchParams.delete('code')
        url.hash = ''
        window.history.replaceState({}, '', url.pathname)
        console.log('[AuthContext] ✅ URL 인증 파라미터 정리 완료')
      }
    }

    // 초기 세션 로드
    const initializeAuth = async () => {
      console.log('[AuthContext] 📝 initializeAuth 시작')
      try {
        const urlCode = typeof window !== 'undefined'
          ? new URL(window.location.href).searchParams.get('code')
          : null

        if (urlCode) {
          console.log('[AuthContext] 🔑 URL에 인증 코드 있음, detectSessionInUrl이 자동 교환 수행 중...')
          // detectSessionInUrl: true 설정으로 Supabase가 자동 코드 교환 수행
          // getSession()이 교환 완료까지 대기함
        }

        console.log('[AuthContext] 🔍 getSession() 호출 (detectSessionInUrl 완료 대기)...')
        const sessionStartTime = Date.now()
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        const sessionElapsed = Date.now() - sessionStartTime
        console.log('[AuthContext] ⚡ getSession() 완료 (' + sessionElapsed + 'ms)')

        if (!mounted) {
          console.log('[AuthContext] ⚠️ 컴포넌트 언마운트됨, 중단')
          return
        }

        if (existingSession) {
          console.log('[AuthContext] ✅ 기존 세션 확인:', existingSession.user.email)
          console.log('[AuthContext] 📊 세션 상태 설정 중...')
          setSession(existingSession)
          setUser(existingSession.user)
          console.log('[AuthContext] 💾 사용자 DB upsert 시작 (비동기)...')
          upsertUser(existingSession.user).catch(() => {})
          console.log('[AuthContext] 👤 사용자 타입 조회 시작...')
          await fetchUserType(existingSession.user.id)
          console.log('[AuthContext] ✅ 초기화 완료 (기존 세션 경로)')
        } else {
          console.log('[AuthContext] ℹ️ 세션 없음')
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.log('[AuthContext] ⚠️ AbortError 무시')
          return
        }
        console.error('[AuthContext] 💥 초기화 오류:', error)
        cleanUrlParams()
      } finally {
        if (mounted) {
          console.log('[AuthContext] 🏁 isLoading = false 설정')
          setIsLoading(false)
        }
      }
    }

    console.log('[AuthContext] 🎬 initializeAuth() 호출')
    initializeAuth()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, newSession: Session | null) => {
        if (!mounted) return

        console.log('[AuthContext] 인증 이벤트:', event)

        // 인증 이벤트 발생 시 URL 정리
        cleanUrlParams()

        if (newSession) {
          setSession(newSession)
          setUser(newSession.user)
          
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            await upsertUser(newSession.user)
            await fetchUserType(newSession.user.id)
          }
        } else {
          setSession(null)
          setUser(null)
          setUserType(null)
        }

        setIsLoading(false)
      }
    )

    // ===== 세션 유지 전략 =====

    // 1) 탭 전환(visibility change) 시 세션 자동 복구
    //    사용자가 탭을 떠났다가 돌아올 때 세션이 만료되었으면 자동 갱신
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mounted) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (currentSession) {
            // 토큰 만료가 임박하면(5분 이내) 미리 갱신
            const expiresAt = currentSession.expires_at
            const now = Math.floor(Date.now() / 1000)
            if (expiresAt && expiresAt - now < 300) {
              console.log('[AuthContext] 토큰 만료 임박, 갱신 시도...')
              const { data } = await supabase.auth.refreshSession()
              if (data.session) {
                setSession(data.session)
                setUser(data.session.user)
              }
            } else {
              setSession(currentSession)
              setUser(currentSession.user)
            }
          }
        } catch (error: any) {
          if (error?.name === 'AbortError') return
          console.error('[AuthContext] 탭 복귀 시 세션 확인 오류:', error)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 2) 주기적 heartbeat (4분마다)
    //    Supabase JWT 기본 만료 3600초(1시간), 미리미리 갱신하여 끊김 방지
    const heartbeatInterval = setInterval(async () => {
      if (!mounted || document.visibilityState === 'hidden') return
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession) {
          const expiresAt = currentSession.expires_at
          const now = Math.floor(Date.now() / 1000)
          // 만료 10분 전이면 갱신
          if (expiresAt && expiresAt - now < 600) {
            console.log('[AuthContext] Heartbeat: 토큰 갱신')
            await supabase.auth.refreshSession()
          }
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        // 네트워크 오류 등은 무시 (다음 heartbeat에서 재시도)
      }
    }, 4 * 60 * 1000) // 4분

    // 3) 온라인 복귀 시 즉시 세션 확인
    const handleOnline = async () => {
      if (!mounted) return
      console.log('[AuthContext] 네트워크 복귀, 세션 확인...')
      try {
        const { data } = await supabase.auth.refreshSession()
        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('[AuthContext] 네트워크 복귀 시 세션 갱신 오류:', error)
      }
    }
    window.addEventListener('online', handleOnline)

    return () => {
      mounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(heartbeatInterval)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const value = {
    user,
    session,
    userType,
    isLoading,
    signOut,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      <div className="appLayout">
        {children}
      </div>
    </AuthContext.Provider>
  )
}

// Custom Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 인증 필수 HOC (Higher-Order Component)
export function requireAuth<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo: string = '/'
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const { showWarning } = useAlert()

    useEffect(() => {
      if (!isLoading && !user) {
        showWarning('로그인이 필요합니다.')
        router.push(redirectTo)
      }
    }, [user, isLoading, router, showWarning])

    if (isLoading) {
      return <div>로딩 중...</div>
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
}
