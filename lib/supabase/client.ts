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

function createSupabaseClient() {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: !isServer,
      autoRefreshToken: !isServer,
      detectSessionInUrl: !isServer,
      flowType: 'pkce',
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
