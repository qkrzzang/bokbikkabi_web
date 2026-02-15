'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
  /**
   * API 요청에서 인증 에러(401, RLS 위반 등) 발생 시 호출.
   * 전역 인증 상태를 초기화하고 홈으로 리다이렉트합니다.
   */
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
        setUserType('USER')
      }
    } catch {
      setUserType('USER')
    }
  }, [])

  // ── users 테이블 Upsert ──
  const upsertUser = useCallback(async (authUser: User) => {
    try {
      await supabase.from('users').upsert(
        {
          supabase_user_id: authUser.id,
          email: authUser.email || '',
          provider: authUser.app_metadata?.provider || 'email',
          last_login_at: new Date().toISOString(),
        },
        { onConflict: 'supabase_user_id' }
      )
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
      // 서버 컴포넌트 캐시도 무효화
      router.refresh()
    }
  }, [clearAuthState, router])

  // ── 외부에서 인증 에러 처리 ──
  // API 요청 실패(세션 만료 등) 시 자식 컴포넌트에서 호출
  const handleAuthError = useCallback(() => {
    console.warn('[Auth] 인증 에러 감지 → 세션 정리 및 리다이렉트')
    clearAuthState()
    // full reload로 미들웨어가 쿠키 정리 + 깨끗한 상태로 시작
    window.location.href = '/'
  }, [clearAuthState])

  useEffect(() => {
    let mounted = true

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 1: 서버에 세션 유효성 검증 (getUser)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // ⚠️ getSession()은 쿠키에 저장된 토큰을 서버 검증 없이 그대로 반환합니다.
    //    → 만료된 토큰도 "세션 있음"으로 반환되어 UI가 로그인 상태로 보임.
    //
    // ✅ getUser()는 Supabase Auth 서버에 JWT를 보내 실제 검증합니다.
    //    → 만료된 토큰은 자동으로 refresh를 시도하고,
    //       refresh도 실패하면 null을 반환합니다.
    //
    const validateAndInitialize = async () => {
      try {
        const {
          data: { user: validatedUser },
          error,
        } = await supabase.auth.getUser()

        if (!mounted) return

        if (error || !validatedUser) {
          // 세션이 없거나 만료됨 → 로그아웃 상태
          clearAuthState()
          return
        }

        // getUser() 성공 → 토큰이 유효하거나 갱신됨
        // getSession()으로 전체 Session 객체를 가져옴
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          await fetchUserType(currentSession.user.id)
        } else {
          // 극히 드문 케이스: user는 있는데 session은 없음
          clearAuthState()
        }
      } catch (error) {
        console.error('[Auth] 초기화 오류:', error)
        if (mounted) clearAuthState()
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    validateAndInitialize()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 2: 인증 상태 변경 실시간 감지
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // onAuthStateChange는 다음 이벤트를 발생시킵니다:
    // - INITIAL_SESSION: 최초 세션 로드 (위에서 직접 처리하므로 무시)
    // - SIGNED_IN: 로그인 완료
    // - SIGNED_OUT: 로그아웃 또는 세션 만료
    // - TOKEN_REFRESHED: Access Token 갱신 성공
    // - USER_UPDATED: 사용자 정보 변경
    //
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return

        console.log('[Auth] 이벤트:', event)

        switch (event) {
          case 'INITIAL_SESSION':
            // validateAndInitialize()에서 이미 처리했으므로 무시.
            // 여기서 중복 처리하면 getSession() 기반의 미검증 데이터로
            // 상태를 덮어쓸 위험이 있습니다.
            break

          case 'SIGNED_IN':
            if (newSession) {
              setSession(newSession)
              setUser(newSession.user)
              // 로그인 시에만 upsert (매 페이지 로드마다 하지 않음)
              await upsertUser(newSession.user)
              await fetchUserType(newSession.user.id)
            }
            break

          case 'TOKEN_REFRESHED':
            if (newSession) {
              // 갱신된 토큰으로 세션 업데이트
              setSession(newSession)
              setUser(newSession.user)
            } else {
              // 토큰 갱신 실패 → 세션 소멸
              console.warn('[Auth] TOKEN_REFRESHED 이벤트에 세션 없음 → 로그아웃')
              clearAuthState()
            }
            break

          case 'SIGNED_OUT':
            clearAuthState()
            break

          case 'USER_UPDATED':
            if (newSession) {
              setSession(newSession)
              setUser(newSession.user)
              await fetchUserType(newSession.user.id)
            }
            break

          default:
            // 미래에 추가될 수 있는 이벤트에 대한 안전장치
            if (newSession) {
              setSession(newSession)
              setUser(newSession.user)
            }
            break
        }
      }
    )

    // ── Cleanup ──
    // Step 3 (탭 전환 시 세션 재검증)은 useSessionSync 훅으로 분리됨
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [clearAuthState, fetchUserType, upsertUser])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 3: 탭 전환 / 모바일 foreground 복귀 시 세션 동기화
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // useSessionSync 훅이 다음을 처리합니다:
  // - visibilitychange (데스크톱 탭 전환 + 모바일/PWA foreground 복귀)
  // - pageshow (iOS Safari bfcache 복원)
  // - 디바운싱 (2초 간격, 동시 실행 방지)
  // - 토큰 변경 시 router.refresh() (서버 컴포넌트 캐시 무효화)
  //
  const handleSyncRefreshed = useCallback(
    (freshSession: Session) => {
      setSession(freshSession)
      setUser(freshSession.user)
    },
    []
  )

  const handleSyncExpired = useCallback(() => {
    clearAuthState()
    // signOut으로 SDK 내부 상태도 정리
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
// 인증 필수 HOC (Higher-Order Component)
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
