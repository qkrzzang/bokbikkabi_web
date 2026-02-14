import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 미들웨어: 모든 요청에서 Supabase 세션 쿠키를 자동 갱신
 *
 * 동작 방식:
 * 1. 요청의 쿠키에서 Supabase 세션 토큰을 읽음
 * 2. 만료된 토큰이 있으면 Refresh Token으로 자동 갱신
 * 3. 갱신된 토큰을 응답 쿠키에 기록
 *
 * ⚠️ 중요: createServerClient와 supabase.auth.getUser() 사이에
 *   다른 코드를 넣으면 세션이 랜덤하게 끊길 수 있습니다.
 */
export async function middleware(request: NextRequest) {
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
  // getSession()이 아닌 getUser()를 사용해야 서버에서 JWT를 검증합니다.
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
