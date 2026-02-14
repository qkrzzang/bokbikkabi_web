import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * 재시도 가능한 fetch wrapper
 * - 네트워크 오류, 5xx 서버 오류 시 자동 재시도
 * - 지수 백오프(Exponential Backoff) 적용
 * - 요청별 타임아웃 적용 (20초)
 */
function createRetryFetch(maxRetries = 3, baseDelay = 1000) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 20000)
        
        const fetchInit = {
          ...init,
          signal: controller.signal
        }
        
        const response = await fetch(input, fetchInit)
        clearTimeout(timeoutId)

        if (response.status >= 500 || response.status === 429) {
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
            console.warn(`[Supabase Fetch] HTTP ${response.status}, ${attempt + 1}/${maxRetries + 1} 재시도 (${Math.round(delay)}ms 후)`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }

        return response
      } catch (error: any) {
        lastError = error

        if (error?.name === 'AbortError') {
          if (init?.signal) throw error
          
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
            console.warn(`[Supabase Fetch] 타임아웃 (20초), ${attempt + 1}/${maxRetries + 1} 재시도 (${Math.round(delay)}ms 후)`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          throw error
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
          console.warn(`[Supabase Fetch] 네트워크 오류, ${attempt + 1}/${maxRetries + 1} 재시도 (${Math.round(delay)}ms 후):`, error?.message)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('fetch 최대 재시도 초과')
  }
}

/**
 * 쿠키 기반 브라우저 Supabase 클라이언트 생성
 *
 * @supabase/ssr의 createBrowserClient 사용
 * - 세션을 쿠키에 저장 (localStorage 대신)
 * - 내부적으로 싱글톤 (동일 인스턴스 반환)
 * - 미들웨어와 서버 컴포넌트에서도 쿠키를 통해 세션 접근 가능
 */
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'bokbikkabi-web',
      },
      fetch: createRetryFetch(3, 1000),
    },
    db: {
      schema: 'public',
    },
  })
}

/**
 * 기존 코드 호환을 위한 싱글톤 export
 * createBrowserClient는 내부적으로 싱글톤이므로 안전합니다.
 *
 * 기존: import { supabase } from '@/lib/supabase/client'
 * 신규: import { createClient } from '@/utils/supabase/client'
 */
export const supabase = createClient()
