import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// 클라이언트 사이드에서 사용할 Supabase 클라이언트
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'bokbikkabi-web',
    },
    fetch: (url, options = {}) => {
      // fetch 옵션 개선: keepalive, timeout 설정
      return fetch(url, {
        ...options,
        keepalive: true,
        // signal이 이미 있으면 유지, 없으면 30초 타임아웃 설정
        signal: options.signal || AbortSignal.timeout(30000),
      })
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
