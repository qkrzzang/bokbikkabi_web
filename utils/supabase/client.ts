import { createBrowserClient } from '@supabase/ssr'

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트 생성
 *
 * @supabase/ssr의 createBrowserClient 사용
 * - 세션 토큰을 쿠키에 저장 (localStorage 대신)
 * - 내부적으로 싱글톤 패턴 (동일 인스턴스 반환)
 * - SSR/미들웨어에서도 세션 접근 가능
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'bokbikkabi-web',
      },
    },
    db: {
      schema: 'public',
    },
  })
}
