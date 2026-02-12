import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supabase_user_id, user_email, user_name, company_name, contact_phone, inquiry_type, title, content } = body

    // 필수 필드 검증
    if (!supabase_user_id || !inquiry_type || !title || !content) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('partnership_inquiries')
      .insert({
        supabase_user_id,
        user_email,
        user_name,
        company_name,
        contact_phone,
        inquiry_type,
        title,
        content,
      })

    if (error) {
      console.error('[partnership-inquiry] DB 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[partnership-inquiry] 예외:', err)
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
