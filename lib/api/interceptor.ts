import { supabase } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'

// API 에러 타입
export interface ApiError {
  message: string
  code?: string
  details?: string
  hint?: string
  isAuthError: boolean
}

// Supabase 에러를 ApiError로 변환
function parseSupabaseError(error: PostgrestError | Error | null): ApiError | null {
  if (!error) return null

  // PostgrestError 타입 체크
  if ('code' in error && 'message' in error) {
    const pgError = error as PostgrestError
    
    // 인증 관련 에러 코드
    const authErrorCodes = ['PGRST301', 'PGRST302', '42501', '42P01']
    const isAuthError = authErrorCodes.includes(pgError.code)

    return {
      message: pgError.message,
      code: pgError.code,
      details: pgError.details,
      hint: pgError.hint,
      isAuthError,
    }
  }

  // 일반 에러
  return {
    message: error.message || '알 수 없는 오류가 발생했습니다.',
    isAuthError: false,
  }
}

// API 요청 래퍼 함수
export async function apiRequest<T>(
  requestFn: () => PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  options?: {
    requireAuth?: boolean
    onAuthError?: () => void
    showErrorAlert?: boolean
  }
): Promise<{ data: T | null; error: ApiError | null }> {
  const { requireAuth = true, onAuthError, showErrorAlert = false } = options || {}

  // 인증 필요 시 세션 체크
  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      const authError: ApiError = {
        message: '로그인이 필요합니다.',
        isAuthError: true,
      }
      
      if (showErrorAlert) {
        alert(authError.message)
      }
      
      if (onAuthError) {
        onAuthError()
      }
      
      return { data: null, error: authError }
    }
  }

  try {
    // API 요청 실행
    const { data, error } = await requestFn()

    if (error) {
      const apiError = parseSupabaseError(error)
      
      if (apiError) {
        console.error('[API Error]', apiError)
        
        // 인증 에러 처리
        if (apiError.isAuthError && onAuthError) {
          onAuthError()
        }
        
        if (showErrorAlert) {
          alert(apiError.message)
        }
        
        return { data: null, error: apiError }
      }
    }

    return { data, error: null }
  } catch (error) {
    const apiError = parseSupabaseError(error as Error)
    console.error('[API Exception]', apiError)
    
    if (showErrorAlert && apiError) {
      alert(apiError.message)
    }
    
    return { data: null, error: apiError }
  }
}

// RPC 호출 래퍼
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

// 사용 예시:
// const { data, error } = await apiRequest(
//   () => supabase.from('users').select('*'),
//   { requireAuth: true, showErrorAlert: true }
// )
