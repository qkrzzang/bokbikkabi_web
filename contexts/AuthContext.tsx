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
      console.error('[AuthContext] 사용자 타입 조회 오류:', error)
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
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('[AuthContext] 세션 갱신 실패:', error.message)
        return
      }
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
    } catch (error) {
      console.error('[AuthContext] 로그아웃 오류:', error)
    }
  }

  useEffect(() => {
    let mounted = true

    /**
     * 쿠키 기반 세션 초기화
     *
     * @supabase/ssr의 createBrowserClient는 세션을 쿠키에 저장하므로
     * 서버 사이드(미들웨어)에서 이미 토큰 갱신이 완료된 상태입니다.
     * getSession()으로 현재 세션을 읽기만 하면 됩니다.
     */
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession()

        if (!mounted) return

        if (existingSession) {
          console.log('[AuthContext] ✅ 세션 확인:', existingSession.user.email)
          setSession(existingSession)
          setUser(existingSession.user)
          upsertUser(existingSession.user).catch(() => {})
          await fetchUserType(existingSession.user.id)
        } else {
          console.log('[AuthContext] ℹ️ 세션 없음')
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('[AuthContext] 초기화 오류:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, newSession: Session | null) => {
        if (!mounted) return

        console.log('[AuthContext] 인증 이벤트:', event, newSession ? '세션 있음' : '세션 없음')

        if (newSession) {
          setSession(newSession)
          setUser(newSession.user)
          
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            await upsertUser(newSession.user)
            await fetchUserType(newSession.user.id)
          } else if (event === 'TOKEN_REFRESHED') {
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

    /**
     * 탭 전환(visibility change) 시 세션 동기화
     *
     * 쿠키 기반이므로 미들웨어가 토큰 갱신을 처리합니다.
     * 여기서는 React 상태만 최신 세션과 동기화합니다.
     */
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || !mounted) return

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!mounted) return

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
        } else {
          // 세션이 없으면 상태 초기화
          setSession(null)
          setUser(null)
          setUserType(null)
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('[AuthContext] 탭 복귀 오류:', error?.message)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
