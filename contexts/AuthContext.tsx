'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/contexts/AlertContext'
import { useSessionSync } from '@/hooks/useSessionSync'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface AuthContextType {
  user: User | null
  session: Session | null
  userType: string | null
  isLoading: boolean
  signOut: () => Promise<void>
  handleAuthError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 초기화 완료 여부 추적 - SIGNED_IN 중복 처리 방지용
  const initializedRef = useRef(false)

  // ── 사용자 타입 조회 ──
  const fetchUserType = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('supabase_user_id', userId)
        .maybeSingle()

      if (!error && data) {
        setUserType(data.user_type || 'USER')
      } else {
        console.warn('[Auth] fetchUserType 실패:', error?.message)
        setUserType('USER')
      }
    } catch (err: any) {
      console.error('[Auth] fetchUserType 예외:', err?.message)
      setUserType('USER')
    }
  }, [])

  // ── users 테이블 Upsert (로그인 시에만 호출) ──
  const upsertUser = useCallback(async (authUser: User) => {
    try {
      const upsertData: Record<string, any> = {
        supabase_user_id: authUser.id,
        email: authUser.email || '',
        provider: authUser.app_metadata?.provider || 'email',
        last_login_at: new Date().toISOString(),
      }

      // 기존 사용자 확인 (신규 가입자 여부 체크)
      const { data: existingUser } = await supabase
        .from('users')
        .select('supabase_user_id, referred_by')
        .eq('supabase_user_id', authUser.id)
        .maybeSingle()

      // 신규 가입자인 경우 기본값 설정
      if (!existingUser) {
        upsertData.user_type = 'USER'
        upsertData.user_grade = 'IMJANG'
      }

      // 리퍼럴 코드가 localStorage에 있으면 referred_by에 저장 (최초 가입 시)
      if (typeof window !== 'undefined') {
        try {
          const refData = localStorage.getItem('bokbikkabi_ref')
          if (refData) {
            const { id, expires } = JSON.parse(refData)
            if (Date.now() < expires && id !== authUser.id) {
              if (!existingUser?.referred_by) {
                upsertData.referred_by = id
                console.log('[Auth] 리퍼럴 코드 적용:', id)
              }
              localStorage.removeItem('bokbikkabi_ref')
            } else {
              localStorage.removeItem('bokbikkabi_ref')
            }
          }
        } catch (e) {
          console.error('[Auth] 리퍼럴 처리 오류:', e)
        }
      }

      await supabase.from('users').upsert(upsertData, { onConflict: 'supabase_user_id' })
    } catch (error) {
      console.error('[Auth] upsertUser 오류:', error)
    }
  }, [])

  // ── 인증 상태 초기화 ──
  const clearAuthState = useCallback(() => {
    setUser(null)
    setSession(null)
    setUserType(null)
  }, [])

  // ── 로그아웃 ──
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('[Auth] signOut 오류:', error)
    } finally {
      clearAuthState()
      router.refresh()
    }
  }, [clearAuthState, router])

  // ── 외부에서 인증 에러 처리 ──
  const handleAuthError = useCallback(() => {
    console.warn('[Auth] 인증 에러 감지 → 세션 정리 및 리다이렉트')
    clearAuthState()
    window.location.href = '/'
  }, [clearAuthState])

  useEffect(() => {
    let mounted = true

    const validateAndInitialize = async () => {
      try {
        const {
          data: { user: validatedUser },
          error,
        } = await supabase.auth.getUser()

        if (!mounted) return

        if (error || !validatedUser) {
          clearAuthState()
          return
        }

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          await fetchUserType(currentSession.user.id)
          // 초기화 완료 - 이후 SIGNED_IN에서 upsert/fetchUserType 스킵
          initializedRef.current = true
          console.log('[Auth] 초기화 완료 ✅', validatedUser.email)
        } else {
          clearAuthState()
        }
      } catch (error: any) {
        console.error('[Auth] 초기화 오류:', error?.message)
        if (mounted) clearAuthState()
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    validateAndInitialize()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 인증 상태 변경 감지
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // 핵심 원칙: onAuthStateChange는 세션 상태(React state)만 동기화한다.
    // DB 쓰기(upsertUser)는 최초 로그인 시에만 1회 실행한다.
    // 탭 복귀로 인한 token refresh → SIGNED_IN은 세션 동기화만 하고 DB를 건드리지 않는다.
    //
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return

        // ── 세션 상태 동기화 (동기적, 빠르게) ──
        // async 작업 없이 React state만 업데이트한다.
        // 이렇게 하면 이벤트 핸들러가 절대 블로킹되지 않는다.
        switch (event) {
          case 'INITIAL_SESSION':
            // validateAndInitialize()에서 처리함 → 무시
            break

          case 'SIGNED_IN':
            if (newSession) {
              setSession(newSession)
              setUser(newSession.user)

              // 최초 로그인 시에만 upsert + fetchUserType 실행
              // initializedRef.current가 true면 이미 초기화에서 처리 완료
              // → 탭 복귀로 인한 token refresh SIGNED_IN에서는 스킵
              if (!initializedRef.current) {
                initializedRef.current = true
                // 비동기 작업을 fire-and-forget으로 실행 (핸들러를 블로킹하지 않음)
                upsertUser(newSession.user).catch(() => {})
                fetchUserType(newSession.user.id).catch(() => {})
              }
            }
            break

          case 'TOKEN_REFRESHED':
            if (newSession) {
              setSession(newSession)
              setUser(newSession.user)
            } else {
              console.warn('[Auth] TOKEN_REFRESHED에 세션 없음 → 로그아웃')
              clearAuthState()
            }
            break

          case 'SIGNED_OUT':
            clearAuthState()
            initializedRef.current = false
            break

          case 'USER_UPDATED':
            if (newSession) {
              setSession(newSession)
              setUser(newSession.user)
              fetchUserType(newSession.user.id).catch(() => {})
            }
            break

          default:
            if (newSession) {
              setSession(newSession)
              setUser(newSession.user)
            }
            break
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [clearAuthState, fetchUserType, upsertUser])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 탭 전환 시 세션 동기화
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleSyncRefreshed = useCallback(
    (freshSession: Session) => {
      setSession(freshSession)
      setUser(freshSession.user)
    },
    []
  )

  const handleSyncExpired = useCallback(() => {
    console.warn('[Auth] SessionSync → 세션 만료')
    clearAuthState()
    supabase.auth.signOut().catch(() => {})
  }, [clearAuthState])

  useSessionSync({
    session,
    onSessionRefreshed: handleSyncRefreshed,
    onSessionExpired: handleSyncExpired,
  })

  const value: AuthContextType = {
    user,
    session,
    userType,
    isLoading,
    signOut,
    handleAuthError,
  }

  return (
    <AuthContext.Provider value={value}>
      <div className="appLayout">{children}</div>
    </AuthContext.Provider>
  )
}

// ─────────────────────────────────────────────
// Custom Hook
// ─────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ─────────────────────────────────────────────
// 인증 필수 HOC
// ─────────────────────────────────────────────
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
