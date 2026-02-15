import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 서버 컴포넌트 / Route Handler용 Supabase 클라이언트 생성
 *
 * @supabase/ssr의 createServerClient 사용
 * - Next.js cookies()를 통해 세션 쿠키를 읽고/쓰기
 * - Server Component, Server Action, Route Handler에서 사용
 *
 * ⚠️ 주의: Next.js 14에서는 cookies()가 동기 함수입니다.
 *   Next.js 15로 업그레이드 시 await cookies()로 변경 필요
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

  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component에서 호출 시 쿠키 쓰기가 불가능할 수 있음
          // 미들웨어가 세션 갱신을 처리하므로 무시해도 안전
        }
      },
    },
  })
}
