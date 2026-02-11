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
