import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'

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

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && sessionData?.session) {
      const userEmail = sessionData.session.user.email

      // 탈퇴 블랙리스트 체크
      if (userEmail) {
        try {
          const { data: blacklisted } = await supabaseAdmin
            .from('deleted_accounts')
            .select('eligible_at')
            .eq('email', userEmail)
            .gt('eligible_at', new Date().toISOString())
            .order('eligible_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (blacklisted) {
            const eligibleDate = new Date(blacklisted.eligible_at)
            const formattedDate = `${eligibleDate.getFullYear()}년 ${eligibleDate.getMonth() + 1}월 ${eligibleDate.getDate()}일`

            console.warn(`[콜백] 블랙리스트 차단: ${userEmail}, 재가입 가능일: ${formattedDate}`)

            await supabase.auth.signOut()

            const message = encodeURIComponent(`탈퇴 후 30일이 지나야 재가입할 수 있습니다. (${formattedDate} 이후 가능)`)
            return NextResponse.redirect(`${origin}/?blocked=${message}`)
          }
        } catch (err: any) {
          console.error('[콜백] 블랙리스트 체크 오류:', err.message)
        }
      }

      console.log('[콜백] 코드 교환 성공, 리다이렉트:', next)

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

    console.error('[콜백] 코드 교환 실패:', error?.message)
  }

  return NextResponse.redirect(`${origin}/`)
}
