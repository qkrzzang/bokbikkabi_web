import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * 서버사이드 재시도 가능한 fetch wrapper
 * - Vercel Serverless 환경에서 Cold Start 후 첫 요청 실패 대비
 * - 5xx 오류, 네트워크 오류 시 자동 재시도
 */
function createRetryFetch(maxRetries = 2, baseDelay = 500) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(input, { ...init, cache: 'no-store' })

        if (response.status >= 500 || response.status === 429) {
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt)
            console.warn(`[SupabaseAdmin] HTTP ${response.status}, ${attempt + 1}/${maxRetries} 재시도 (${delay}ms 후)`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }

        return response
      } catch (error: any) {
        lastError = error
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt)
          console.warn(`[SupabaseAdmin] 네트워크 오류, ${attempt + 1}/${maxRetries} 재시도:`, error?.message)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('서버 fetch 최대 재시도 초과')
  }
}

// 서버 사이드에서 사용할 Supabase 클라이언트 (Service Role Key 사용)
// 주의: 이 클라이언트는 RLS(Row Level Security)를 우회합니다
// 서버 사이드 API 라우트에서만 사용하세요
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: createRetryFetch(2, 500),
  },
})

// 함수형 getter (일부 API 라우트에서 사용)
export function getSupabaseAdmin() {
  return supabaseAdmin
}
