/**
 * 공통 재시도 유틸리티
 * 
 * DB 쿼리, 외부 API 호출 등 일시적 오류가 발생할 수 있는
 * 비동기 작업을 자동으로 재시도합니다.
 * 
 * @example
 * const result = await withRetry(
 *   () => supabase.from('users').select('*'),
 *   { maxRetries: 3, retryDelay: 1000, label: 'users 조회' }
 * )
 */

interface RetryOptions {
  /** 최대 재시도 횟수 (기본: 3) */
  maxRetries?: number
  /** 첫 번째 재시도까지의 대기 시간 ms (기본: 1000) */
  retryDelay?: number
  /** 로그에 표시할 라벨 */
  label?: string
  /** 재시도 여부를 판단하는 함수 (기본: 모든 오류 재시도) */
  shouldRetry?: (error: any, attempt: number) => boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    label = 'operation',
    shouldRetry = () => true,
  } = options

  let lastError: any = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // AbortError는 재시도하지 않음
      if (error?.name === 'AbortError') throw error

      // shouldRetry가 false를 반환하면 즉시 throw
      if (!shouldRetry(error, attempt)) throw error

      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 300
        console.warn(`[retry] ${label} 실패 (${attempt + 1}/${maxRetries}), ${Math.round(delay)}ms 후 재시도:`, error?.message || error)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Supabase 쿼리 결과를 검증하고, 오류 시 재시도하는 래퍼
 * 
 * @example
 * const data = await withSupabaseRetry(
 *   () => supabase.from('agent_reviews').select('*').eq('id', reviewId),
 *   'agent_reviews 조회'
 * )
 */
export async function withSupabaseRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  label = 'Supabase query',
  maxRetries = 2
): Promise<{ data: T | null; error: any }> {
  return withRetry(
    async () => {
      const result = await queryFn()
      // Supabase에서 연결 오류가 error로 반환될 수 있음
      if (result.error && isRetryableError(result.error)) {
        throw result.error // withRetry에서 재시도하도록 throw
      }
      return result
    },
    {
      maxRetries,
      retryDelay: 500,
      label,
      shouldRetry: (error) => isRetryableError(error),
    }
  )
}

/**
 * 재시도 가능한 오류인지 판단
 */
function isRetryableError(error: any): boolean {
  if (!error) return false
  
  const message = (error.message || error.msg || '').toLowerCase()
  const code = error.code || ''

  // 네트워크/연결 관련 오류
  if (message.includes('fetch') || message.includes('network')) return true
  if (message.includes('connection') || message.includes('timeout')) return true
  if (message.includes('econnreset') || message.includes('econnrefused')) return true
  if (message.includes('socket hang up')) return true
  
  // PostgreSQL 연결 오류 코드
  if (code === '08000' || code === '08003' || code === '08006') return true
  // 서버 과부하
  if (code === '53300' || code === '53400') return true

  return false
}
