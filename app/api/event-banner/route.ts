import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * LUCKY_DRAW_SIGNUP_EVENT 배너 설정 조회
 * - 서버에서 common_code_detail 직접 조회 (RLS/클라이언트 이슈 회피)
 */
export async function GET(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get('debug') === '1'

  try {
    // debug 모드: use_yn 필터 없이 조회하여 원인 파악
    let query = supabaseAdmin
      .from('common_code_detail')
      .select('description, extra_value1, use_yn')
      .eq('code_group', 'SYSTEM_CONFIG')
      .eq('code_value', 'LUCKY_DRAW_SIGNUP_EVENT')

    if (!debug) {
      query = query.eq('use_yn', 'Y')
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('[event-banner] 조회 오류:', error)
      return NextResponse.json(
        debug ? { config: null, _debug: { error: error.message } } : { config: null }
      )
    }

    if (!data) {
      return NextResponse.json(
        debug
          ? {
              config: null,
              _debug: {
                cause: 'LUCKY_DRAW_SIGNUP_EVENT 행이 없음. 마이그레이션 add_lucky_draw_signup_event_banner.sql 실행 필요.',
              },
            }
          : { config: null }
      )
    }

    // description: 'Y' = 노출, extra_value1 = 배너 내용
    const isVisible = data.description?.startsWith('Y') ?? false
    const content = (data.extra_value1 || '').trim()

    if (!isVisible || !content) {
      return NextResponse.json(
        debug
          ? {
              config: null,
              _debug: {
                cause: '노출 조건 미충족',
                description: data.description,
                hasContent: content.length > 0,
                use_yn: data.use_yn,
                hint:
                  "description이 'Y'로 시작하고, extra_value1에 배너 문구가 있어야 합니다. 관리자 > 콘텐츠 노출 관리에서 확인하세요.",
              },
            }
          : { config: null }
      )
    }

    if (data.use_yn !== 'Y') {
      return NextResponse.json(
        debug
          ? { config: null, _debug: { cause: 'use_yn이 Y가 아님', use_yn: data.use_yn } }
          : { config: null }
      )
    }

    return NextResponse.json({
      config: {
        code_name: content,
      },
    })
  } catch (err) {
    console.error('[event-banner] 예외:', err)
    return NextResponse.json(
      debug ? { config: null, _debug: { error: String(err) } } : { config: null }
    )
  }
}
