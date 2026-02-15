import { supabase } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface ApiError {
  message: string
  code?: string
  details?: string
  hint?: string
  isAuthError: boolean
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/**
 * PostgREST / PostgreSQL 인증 관련 에러 코드
 *
 * - PGRST301: JWT expired
 * - PGRST302: No JWT / anonymous access denied
 * - 42501: insufficient_privilege (RLS 위반)
 * - 42P01: undefined_table (권한 없는 테이블 접근 시)
 */
const AUTH_ERROR_CODES = new Set(['PGRST301', 'PGRST302', '42501', '42P01'])

// ─────────────────────────────────────────────
// Error Parsing
// ─────────────────────────────────────────────
function parseSupabaseError(
  error: PostgrestError | Error | null
): ApiError | null {
  if (!error) return null

  // PostgrestError 타입 체크
  if ('code' in error && 'message' in error) {
    const pgError = error as PostgrestError
    return {
      message: pgError.message,
      code: pgError.code,
      details: pgError.details,
      hint: pgError.hint,
      isAuthError: AUTH_ERROR_CODES.has(pgError.code),
    }
  }

  // 일반 Error
  return {
    message: error.message || '알 수 없는 오류가 발생했습니다.',
    isAuthError: false,
  }
}

// ─────────────────────────────────────────────
// Auth Failure Handler
// ─────────────────────────────────────────────

/**
 * 인증 실패 시 처리:
 * 1. onAuthError 콜백이 있으면 호출 (커스텀 핸들링)
 * 2. 없으면 기본 동작: signOut → 홈으로 full reload 리다이렉트
 *
 * full reload를 사용하는 이유:
 * - 미들웨어가 실행되어 쿠키 정리
 * - 모든 React 상태가 초기화
 * - 서버 컴포넌트 캐시 무효화
 */
function handleAuthFailure(onAuthError?: () => void) {
  if (onAuthError) {
    onAuthError()
    return
  }

  // 기본 동작: 로그아웃 + 홈으로 리다이렉트
  if (typeof window !== 'undefined') {
    supabase.auth.signOut().finally(() => {
      window.location.href = '/'
    })
  }
}

// ─────────────────────────────────────────────
// API Request Wrapper
// ─────────────────────────────────────────────

/**
 * Supabase DB 요청 래퍼 함수
 *
 * 동작 흐름:
 * 1. requireAuth=true이면 세션 존재 여부 사전 확인 (getSession, 빠름)
 * 2. 실제 요청 실행
 * 3. 인증 에러 발생 시 → 토큰 갱신(refreshSession) 후 1회 재시도
 * 4. 재시도도 실패 → handleAuthFailure()로 리다이렉트
 *
 * @param requestFn - Supabase 쿼리 함수
 * @param options.requireAuth - 인증 필수 여부 (기본값: true)
 * @param options.onAuthError - 인증 에러 시 커스텀 핸들러 (없으면 리다이렉트)
 * @param options.showErrorAlert - 에러 시 alert 표시 여부
 */
export async function apiRequest<T>(
  requestFn: () => PromiseLike<{
    data: T | null
    error: PostgrestError | null
  }>,
  options?: {
    requireAuth?: boolean
    onAuthError?: () => void
    showErrorAlert?: boolean
  }
): Promise<{ data: T | null; error: ApiError | null }> {
  const {
    requireAuth = true,
    onAuthError,
    showErrorAlert = false,
  } = options || {}

  // ── Pre-flight: 세션 존재 확인 ──
  // getSession()은 HTTP 요청 없이 쿠키/메모리에서 즉시 반환 (빠름)
  // 실제 유효성 검증은 DB 요청 결과로 판단
  if (requireAuth) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      handleAuthFailure(onAuthError)
      return {
        data: null,
        error: {
          message: '로그인이 필요합니다. 다시 로그인해 주세요.',
          isAuthError: true,
        },
      }
    }
  }

  // ── 요청 실행 ──
  try {
    const { data, error } = await requestFn()

    if (error) {
      const apiError = parseSupabaseError(error)

      // ── 인증 에러 시: 1회 토큰 갱신 + 재시도 ──
      // 원인: Access Token이 만료되었을 수 있음
      // (미들웨어 이후 시간이 지났거나, 탭이 백그라운드에 있었던 경우)
      if (apiError?.isAuthError) {
        console.warn('[API] 인증 에러 감지, 토큰 갱신 후 재시도...', apiError.code)

        const { error: refreshError } = await supabase.auth.refreshSession()

        if (!refreshError) {
          // 갱신 성공 → 1회 재시도
          try {
            const { data: retryData, error: retryError } = await requestFn()

            if (!retryError) {
              return { data: retryData, error: null }
            }

            // 재시도도 실패 → 세션이 완전히 만료
            console.error('[API] 재시도 실패:', retryError.message)
          } catch {
            // 재시도 중 예외
          }
        }

        // 갱신 실패 또는 재시도 실패 → 리다이렉트
        handleAuthFailure(onAuthError)
        return { data: null, error: apiError }
      }

      // ── 일반 에러 ──
      if (apiError) {
        console.error('[API] 에러:', apiError)
        if (showErrorAlert) {
          alert(apiError.message)
        }
        return { data: null, error: apiError }
      }
    }

    return { data, error: null }
  } catch (error) {
    const apiError = parseSupabaseError(error as Error)
    console.error('[API] 예외:', apiError)

    if (showErrorAlert && apiError) {
      alert(apiError.message)
    }

    return { data: null, error: apiError }
  }
}

// ─────────────────────────────────────────────
// RPC Request Wrapper
// ─────────────────────────────────────────────
export async function rpcRequest<T>(
  functionName: string,
  params?: Record<string, any>,
  options?: {
    requireAuth?: boolean
    onAuthError?: () => void
    showErrorAlert?: boolean
  }
): Promise<{ data: T | null; error: ApiError | null }> {
  return apiRequest<T>(
    () => supabase.rpc(functionName, params) as any,
    options
  )
}
