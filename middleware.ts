import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 미들웨어: 모든 요청에서 Supabase 세션 쿠키를 자동 갱신
 *
 * 동작 방식:
 * 1. 요청 쿠키에서 Supabase 세션 토큰을 읽음
 * 2. 만료된 Access Token → Refresh Token으로 자동 갱신 시도
 * 3. 갱신 성공 → 새 토큰을 응답 쿠키에 기록
 * 4. 갱신 실패(Refresh Token 만료 등) → 기존 쿠키를 명시적으로 삭제
 *
 * ⚠️ 중요: createServerClient와 supabase.auth.getUser() 사이에
 *   다른 코드를 넣으면 세션이 랜덤하게 끊길 수 있습니다.
 */
export async function middleware(request: NextRequest) {
  // ── Chrome DevTools 자동 요청 → 200 응답 (404 로그/Network 탭 노이즈 제거) ──
  if (request.nextUrl.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
    return NextResponse.json({}, { status: 200 })
  }

  // ── OAuth code가 루트(/)에 도착한 경우 → /auth/callback으로 전달 ──
  //
  // Supabase Auth가 redirectTo를 무시하고 Site URL(루트)로 리다이렉트하는 경우,
  // /?code=xxx 형태로 PKCE 코드가 루트에 도착함.
  // 이를 /auth/callback?code=xxx 로 전달하여 정상적인 코드 교환이 이루어지도록 함.
  //
  if (
    request.nextUrl.pathname === '/' &&
    request.nextUrl.searchParams.has('code')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  // ── OAuth 콜백은 미들웨어 세션 처리를 완전히 건너뜀 ──
  //
  // /auth/callback 요청 시:
  // - 아직 세션이 없음 (코드 교환 전)
  // - PKCE code_verifier 쿠키가 반드시 보존되어야 함
  // - getUser()가 내부적으로 setAll을 호출하면 request 쿠키가 변조되어
  //   이후 route handler의 exchangeCodeForSession()이 실패할 수 있음
  //
  // callback route가 자체적으로 createServerClient를 만들어
  // 코드 교환 + 세션 쿠키 설정을 처리하므로 미들웨어 개입이 불필요함
  //
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. request 쿠키에도 반영 (하위 서버 컴포넌트에서 읽을 수 있도록)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // 2. 새 응답 객체 생성 (갱신된 request 쿠키 포함)
          supabaseResponse = NextResponse.next({
            request,
          })
          // 3. 응답 쿠키에 기록 (브라우저에 전달)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ⚠️ 이 호출이 만료된 토큰의 자동 갱신을 트리거합니다.
  // getSession()이 아닌 getUser()를 반드시 사용해야 서버에서 JWT를 검증합니다.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  /**
   * 무효한 세션의 쿠키 정리 (인증 에러에만 한정)
   *
   * ⚠️ 중요: getUser()가 실패하는 원인은 두 가지입니다:
   *
   * 1. 인증 에러 (401/403): 세션이 확실히 만료/무효 → 쿠키 삭제 OK
   *    - "Invalid JWT", "Token expired", Refresh Token 만료
   *
   * 2. 일시적 에러: 네트워크 장애, Supabase 서버 다운, 타임아웃
   *    - 이 경우 쿠키를 삭제하면 유효한 세션이 날아감!
   *    - 다음 요청에서 자동 복구되므로 쿠키를 보존해야 함
   *
   * 이전 코드는 모든 실패에서 쿠키를 삭제하여,
   * 탭 전환 복귀 시 일시적 네트워크 이슈로 세션이 날아가는 버그가 있었음.
   */
  if (!user && authError) {
    const isDefinitiveAuthError =
      authError.status === 401 ||
      authError.status === 403 ||
      authError.message?.includes('Invalid') ||
      authError.message?.includes('expired')

    if (isDefinitiveAuthError) {
      const supabaseCookies = request.cookies
        .getAll()
        .filter((cookie) => cookie.name.startsWith('sb-'))

      if (supabaseCookies.length > 0) {
        supabaseCookies.forEach((cookie) => {
          supabaseResponse.cookies.set(cookie.name, '', {
            maxAge: 0,
            path: '/',
          })
        })
      }
    }
    // 일시적 에러(네트워크 등)는 쿠키를 보존 → 다음 요청에서 자동 재시도
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에서 미들웨어 실행:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - 이미지 파일 (svg, png, jpg, jpeg, gif, webp, ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
