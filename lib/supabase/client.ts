import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// 서버/클라이언트 구분
const isServer = typeof window === 'undefined'

// 개발 환경에서 Hot Reload 시 클라이언트가 중복 생성되는 것을 방지하기 위한 싱글톤 패턴
const globalForSupabase = globalThis as unknown as { __supabase?: any }

/**
 * 재시도 가능한 fetch wrapper
 * - 네트워크 오류, 5xx 서버 오류 시 자동 재시도
 * - 지수 백오프(Exponential Backoff) 적용
 */
function createRetryFetch(maxRetries = 3, baseDelay = 1000) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(input, init)

        // 5xx 서버 오류는 재시도 (429 Too Many Requests 포함)
        if (response.status >= 500 || response.status === 429) {
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
            console.warn(`[Supabase] HTTP ${response.status}, ${attempt + 1}/${maxRetries} 재시도 (${Math.round(delay)}ms 후)`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }

        return response
      } catch (error: any) {
        lastError = error

        // AbortError는 재시도하지 않음
        if (error?.name === 'AbortError') throw error

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
          console.warn(`[Supabase] 네트워크 오류, ${attempt + 1}/${maxRetries} 재시도 (${Math.round(delay)}ms 후):`, error?.message)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('fetch 최대 재시도 초과')
  }
}

/**
 * navigator.locks API를 완전히 비활성화하는 no-op lock
 * 
 * 문제 원인:
 * 1. navigator.locks → AbortError 발생 → 모든 DB 쿼리 멈춤
 * 2. 단순 Promise lock → Supabase 내부에서 lock 안에서 getSession()을 재호출하여
 *    재귀적 교착(re-entrant deadlock) 발생
 * 
 * 해결: lock을 no-op으로 설정하여 함수를 즉시 실행
 * - 단일 탭 웹앱이므로 cross-tab 동기화 lock이 불필요
 * - Supabase의 내부 auth 플로우가 lock 없이도 정상 동작
 */
async function noOpLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  return await fn()
}

function createSupabaseClient() {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: !isServer,
      autoRefreshToken: !isServer,
      // ★ detectSessionInUrl: true (자동 코드 교환 활성화)
      //   URL의 ?code= 를 자동으로 감지하여 PKCE 교환 수행
      //   lock을 no-op으로 설정했으므로 blocking 없음
      detectSessionInUrl: !isServer,
      flowType: 'pkce',
      // ★ navigator.locks 완전 비활성화 (no-op lock)
      //   lock이 없으므로 자동 코드 교환도 즉시 완료됨
      ...(isServer ? {} : { lock: noOpLock }),
    },
    global: {
      headers: {
        'X-Client-Info': 'bokbikkabi-web',
      },
      // 네트워크 오류 시 자동 재시도하는 fetch 사용
      fetch: createRetryFetch(3, 1000),
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
}

// 클라이언트 사이드에서 사용할 Supabase 클라이언트 (싱글톤)
export const supabase = globalForSupabase.__supabase || (globalForSupabase.__supabase = createSupabaseClient())
