import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// 개발 환경에서 Hot Reload 시 클라이언트가 중복 생성되는 것을 방지하기 위한 싱글톤 패턴
const globalForSupabase = global as unknown as { supabase: any }

// 클라이언트 사이드에서 사용할 Supabase 클라이언트
export const supabase =
  globalForSupabase.supabase ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'bokbikkabi-web',
      },
    },
    db: {
      schema: 'public',
    },
    // Realtime 연결 재시도 설정
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase
