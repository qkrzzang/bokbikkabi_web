'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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
  // ★ 동시 실행 방지 플래그 (visibility/online 핸들러 중복 실행 차단)
  const isRecovering = useRef(false)

  // 사용자 타입 조회
  const fetchUserType = async (userId: string) => {
    console.log('[AuthContext] 🔍 fetchUserType 시작:', userId)
    try {
      const startTime = Date.now()
      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('supabase_user_id', userId)
        .maybeSingle()
      const elapsed = Date.now() - startTime
      console.log('[AuthContext] ⚡ fetchUserType 완료 (' + elapsed + 'ms)')

      if (!error && data) {
        console.log('[AuthContext] ✅ user_type:', data.user_type || 'USER')
        setUserType(data.user_type || 'USER')
      } else {
        console.log('[AuthContext] ⚠️ user_type 조회 실패, 기본값 USER 사용')
        setUserType('USER')
      }
    } catch (error) {
      console.error('[AuthContext] ❌ 사용자 타입 조회 오류:', error)
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

  // 세션 새로고침 (★ 실제 토큰 갱신 - getSession()은 캐시만 읽음)
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

  // 로그아웃 (★ 상태만 정리, 네비게이션은 호출자가 window.location.href='/'로 처리)
  //   router.push('/')를 제거한 이유:
  //   - 호출자가 이미 user:logout 이벤트 → window.location.href='/' 로 전체 리로드
  //   - router.push와 location.href가 동시에 실행되면 레이스 컨디션 발생
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

        console.log('[AuthContext] 🔔 인증 이벤트:', event, newSession ? '세션 있음' : '세션 없음')

        // 인증 이벤트 발생 시 URL 정리
        cleanUrlParams()

        if (newSession) {
          console.log('[AuthContext] 📊 onAuthStateChange: 세션 설정 (event=' + event + ')')
          setSession(newSession)
          setUser(newSession.user)
          
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            console.log('[AuthContext] 💾 onAuthStateChange: upsert + fetchUserType')
            await upsertUser(newSession.user)
            await fetchUserType(newSession.user.id)
          } else if (event === 'TOKEN_REFRESHED') {
            // ★ 토큰 갱신 시에도 userType 동기화 (탭 복귀 후 상태 유지)
            console.log('[AuthContext] 🔄 onAuthStateChange: TOKEN_REFRESHED')
            await fetchUserType(newSession.user.id)
          }
        } else {
          console.log('[AuthContext] ℹ️ onAuthStateChange: 세션 제거')
          setSession(null)
          setUser(null)
          setUserType(null)
        }

        console.log('[AuthContext] 🏁 onAuthStateChange: isLoading = false')
        setIsLoading(false)
      }
    )

    // ===== 세션 유지 전략 (v3 - 안정화) =====

    /**
     * 1) 탭 전환(visibility change) 시 세션 자동 복구
     *    ★ isRecovering ref로 동시 실행 방지 (visibility + online이 동시에 발생 가능)
     */
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || !mounted) return
      if (isRecovering.current) return // 다른 핸들러가 이미 실행 중
      isRecovering.current = true

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!currentSession) {
          // 세션이 없으면 refreshSession으로 Refresh Token 기반 복구 시도
          console.log('[AuthContext] 👀 탭 복귀: 세션 없음, Refresh Token 복구 시도...')
          const { data, error } = await supabase.auth.refreshSession()
          if (!error && data.session) {
            console.log('[AuthContext] ✅ 탭 복귀: 세션 복구 성공')
            setSession(data.session)
            setUser(data.session.user)
          } else {
            console.warn('[AuthContext] ⚠️ 탭 복귀: 세션 복구 실패, 재로그인 필요')
            setSession(null)
            setUser(null)
            setUserType(null)
          }
          return
        }

        // 토큰 만료 임박 확인 (15분 이내)
        const expiresAt = currentSession.expires_at
        const now = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = expiresAt ? expiresAt - now : Infinity

        if (timeUntilExpiry < 900) {
          console.log('[AuthContext] 👀 탭 복귀: 토큰 만료 임박 (' + Math.floor(timeUntilExpiry / 60) + '분), 갱신...')
          const { data, error } = await supabase.auth.refreshSession()
          if (!error && data.session) {
            setSession(data.session)
            setUser(data.session.user)
          }
        } else {
          // 토큰이 충분히 유효 → React 상태만 동기화
          setSession(currentSession)
          setUser(currentSession.user)
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('[AuthContext] 탭 복귀 오류:', error?.message)
      } finally {
        isRecovering.current = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    /**
     * 2) 주기적 heartbeat (3분마다)
     *    Supabase JWT 기본 만료 3600초(1시간), 15분 전부터 갱신
     *    ★ 탭이 hidden이면 실행하지 않음 (배터리/네트워크 절약)
     */
    const heartbeatInterval = setInterval(async () => {
      if (!mounted || document.visibilityState === 'hidden') return

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (!currentSession) return

        const expiresAt = currentSession.expires_at
        const now = Math.floor(Date.now() / 1000)
        if (expiresAt && expiresAt - now < 900) {
          console.log('[AuthContext] 💓 Heartbeat: 토큰 갱신')
          const { data } = await supabase.auth.refreshSession()
          if (data.session) {
            setSession(data.session)
            setUser(data.session.user)
          }
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        // 네트워크 오류는 무시 (다음 heartbeat에서 재시도)
      }
    }, 3 * 60 * 1000) // 3분

    /**
     * 3) 온라인 복귀 시 즉시 세션 갱신
     *    ★ isRecovering으로 visibility와 동시 실행 방지
     */
    const handleOnline = async () => {
      if (!mounted) return
      if (isRecovering.current) return
      isRecovering.current = true

      console.log('[AuthContext] 🌐 네트워크 복귀, 세션 갱신...')
      try {
        const { data } = await supabase.auth.refreshSession()
        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('[AuthContext] 네트워크 복귀 시 오류:', error?.message)
      } finally {
        isRecovering.current = false
      }
    }
    window.addEventListener('online', handleOnline)

    // ★ focus 핸들러 제거 (visibilitychange가 이미 모든 탭 전환을 커버)
    //   focus는 브라우저 창 전환에도 발생하여 불필요한 getSession() 호출 유발

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
