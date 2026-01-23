import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Chrome DevTools, 웰노운 경로, Next.js 내부 경로는 404 처리하지 않음
  const ignorePaths = [
    '/.well-known/',
    '/_next/',
    '/favicon.ico',
    '/api/_next/',
  ]

  // 무시할 경로인 경우 조용히 404 반환
  if (ignorePaths.some(path => pathname.startsWith(path))) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
