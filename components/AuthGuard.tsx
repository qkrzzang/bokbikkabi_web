'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAlert } from '@/contexts/AlertContext'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
  requireAdmin?: boolean
}

/**
 * 인증 가드 컴포넌트
 * 로그인하지 않은 사용자의 접근을 차단하고 리다이렉트합니다.
 * 
 * @example
 * // 기본 사용
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 * 
 * // 관리자 전용
 * <AuthGuard requireAdmin>
 *   <AdminPanel />
 * </AuthGuard>
 */
export function AuthGuard({ 
  children, 
  fallback, 
  redirectTo = '/', 
  requireAdmin = false 
}: AuthGuardProps) {
  const { user, userType, isLoading } = useAuth()
  const { showWarning } = useAlert()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // 로그인 필요
    if (!user) {
      showWarning('로그인이 필요합니다.')
      router.push(redirectTo)
      return
    }

    // 관리자 권한 필요
    if (requireAdmin && userType !== 'ADMIN') {
      showWarning('관리자 권한이 필요합니다.')
      router.push(redirectTo)
      return
    }
  }, [user, userType, isLoading, router, redirectTo, requireAdmin, showWarning])

  // 로딩 중
  if (isLoading) {
    return fallback || (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px' 
      }}>
        로딩 중...
      </div>
    )
  }

  // 인증 실패
  if (!user || (requireAdmin && userType !== 'ADMIN')) {
    return fallback || null
  }

  // 인증 성공
  return <>{children}</>
}

/**
 * 클라이언트 사이드 인증 체크 Hook
 * 컴포넌트 내부에서 조건부로 인증을 체크할 때 사용
 * 
 * @example
 * const checkAuth = useAuthCheck()
 * 
 * const handleClick = async () => {
 *   if (!checkAuth()) return
 *   // 인증된 사용자만 실행
 * }
 */
export function useAuthCheck(options?: {
  redirectTo?: string
  showAlert?: boolean
  requireAdmin?: boolean
}) {
  const { user, userType } = useAuth()
  const { showWarning } = useAlert()
  const router = useRouter()
  const { redirectTo = '/', showAlert = true, requireAdmin = false } = options || {}

  return (): boolean => {
    if (!user) {
      if (showAlert) {
        showWarning('로그인이 필요합니다.')
      }
      router.push(redirectTo)
      return false
    }

    if (requireAdmin && userType !== 'ADMIN') {
      if (showAlert) {
        showWarning('관리자 권한이 필요합니다.')
      }
      router.push(redirectTo)
      return false
    }

    return true
  }
}
