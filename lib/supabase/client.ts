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
 * - 요청별 타임아웃 적용 (20초)
 */
function createRetryFetch(maxRetries = 3, baseDelay = 1000) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // ★ 각 요청에 20초 타임아웃 적용
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 20000)
        
        const fetchInit = {
          ...init,
          signal: controller.signal
        }
        
        const response = await fetch(input, fetchInit)
        clearTimeout(timeoutId)

        // 5xx 서버 오류는 재시도 (429 Too Many Requests 포함)
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

        // AbortError는 타임아웃 또는 사용자 취소
        if (error?.name === 'AbortError') {
          // init에 이미 signal이 있었다면 (사용자 취소) → 즉시 throw
          if (init?.signal) throw error
          
          // 타임아웃이라면 재시도 가능
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

/**
 * 안전한 localStorage 래퍼
 * - 시크릿/프라이빗 모드에서 localStorage 접근 제한 대응
 * - 브라우저 정책으로 인한 저장 실패 처리
 * ★ 성능: 정상 동작 시 로깅 없음 (에러만 로깅)
 *   Supabase가 매우 빈번하게 storage를 호출하므로 로깅은 성능 저하 원인
 */
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null
      return localStorage.getItem(key)
    } catch (error) {
      console.error('[SafeStorage] getItem 오류:', key, error)
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('[SafeStorage] setItem 오류:', key, error)
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return
      localStorage.removeItem(key)
    } catch (error) {
      console.error('[SafeStorage] removeItem 오류:', key, error)
    }
  }
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
      ...(isServer ? {} : { 
        lock: noOpLock,
        // 모든 브라우저에서 안전한 storage 사용 (Edge 전용 → 전체 적용)
        storage: safeStorage
      }),
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
