import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('[DB 테스트] 시작...')
    console.log('[DB 테스트] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[DB 테스트] Anon Key 존재:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // 1. 간단한 테이블 조회 테스트
    const { data, error, status } = await supabaseAdmin
      .from('agent_master')
      .select('id, agent_name')
      .limit(1)
    
    console.log('[DB 테스트] 응답 상태:', status)
    console.log('[DB 테스트] 데이터:', data)
    console.log('[DB 테스트] 에러:', error)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        status,
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'DB 연결 성공!',
      data,
      status,
    })
    
  } catch (error: any) {
    console.error('[DB 테스트] 예외:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack,
      }
    }, { status: 500 })
  }
}
