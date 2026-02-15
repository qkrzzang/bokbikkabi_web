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
 * 쿠키 기반 브라우저 Supabase 클라이언트 생성
 *
 * @supabase/ssr의 createBrowserClient 사용
 * - 세션을 쿠키에 저장 (localStorage 대신)
 * - 내부적으로 싱글톤 (동일 인스턴스 반환)
 * - 미들웨어와 서버 컴포넌트에서도 쿠키를 통해 세션 접근 가능
 *
 * ⚠️ global.fetch를 커스텀하지 않음 (의도적)
 *   - 커스텀 fetch wrapper가 SDK 내부의 signal/abort 관리를 방해
 *   - 탭 백그라운드 시 커스텀 타임아웃이 유효한 요청을 강제 중단
 *   - Supabase SDK가 자체적으로 token refresh, retry를 처리함
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
