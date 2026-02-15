import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * OAuth 콜백 Route Handler
 *
 * PKCE 플로우:
 * 1. 사용자가 signInWithOAuth() 호출 → code_verifier가 쿠키에 저장
 * 2. OAuth 프로바이더 인증 후 /auth/callback?code=xxx 로 리다이렉트
 * 3. 이 Route Handler에서 서버 사이드로 코드 교환 수행
 * 4. 세션 토큰이 쿠키에 설정되어 SSR/미들웨어에서 접근 가능
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // OAuth 에러 파라미터 확인
  const errorParam = searchParams.get('error')
  if (errorParam) {
    const errorDescription = searchParams.get('error_description') || errorParam
    console.error('[콜백] OAuth 에러:', errorParam, errorDescription)
    // 에러 시 홈으로 리다이렉트 (AuthContext가 미인증 상태 표시)
    return NextResponse.redirect(`${origin}/`)
  }

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.log('[콜백] ✅ 코드 교환 성공, 리다이렉트:', next)

      // Vercel 등 리버스 프록시 환경 대응
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    console.error('[콜백] ❌ 코드 교환 실패:', error.message)
  }

  // code가 없거나 교환 실패 시 홈으로 리다이렉트
  return NextResponse.redirect(`${origin}/`)
}
