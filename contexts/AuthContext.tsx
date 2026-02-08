'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

    // 초기 세션 로드
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()

        if (!mounted) return

        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
          await upsertUser(initialSession.user)
          await fetchUserType(initialSession.user.id)
        }
      } catch (error) {
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

        console.log('[AuthContext] 인증 이벤트:', event)

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

    return () => {
      mounted = false
      subscription.unsubscribe()
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

    useEffect(() => {
      if (!isLoading && !user) {
        alert('로그인이 필요합니다.')
        router.push(redirectTo)
      }
    }, [user, isLoading, router])

    if (isLoading) {
      return <div>로딩 중...</div>
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
}
