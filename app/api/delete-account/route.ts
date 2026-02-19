import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    const deleteErrors: string[] = []

    // 탈퇴 전 사용자 이메일 조회 (블랙리스트 등록용)
    let userEmail: string | null = null
    try {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('supabase_user_id', userId)
        .maybeSingle()
      userEmail = userData?.email || null
    } catch (err: any) {
      console.warn('[delete-account] 이메일 조회 실패:', err.message)
    }

    // 블랙리스트(deleted_accounts)에 등록 (30일 재가입 제한)
    if (userEmail) {
      try {
        await supabaseAdmin.from('deleted_accounts').insert({
          email: userEmail,
          eligible_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      } catch (err: any) {
        console.warn('[delete-account] 블랙리스트 등록 실패:', err.message)
        deleteErrors.push(`deleted_accounts: ${err.message}`)
      }
    }

    // referral_rewards는 삭제하지 않음 (어뷰징 방지를 위해 보존)
    const tables = [
      { table: 'reports', column: 'reporter_user_id' },
      { table: 'review_helpful', column: 'supabase_user_id' },
      { table: 'agent_reviews', column: 'supabase_user_id' },
      { table: 'agent_comments', column: 'supabase_user_id' },
      { table: 'favorite_agents', column: 'supabase_user_id' },
      { table: 'lucky_draw_winners', column: 'supabase_user_id' },
      { table: 'lucky_draw_entries', column: 'supabase_user_id' },
      { table: 'ticket_transactions', column: 'supabase_user_id' },
      { table: 'user_tickets', column: 'supabase_user_id' },
      { table: 'point_transactions', column: 'supabase_user_id' },
      { table: 'user_points', column: 'supabase_user_id' },
      { table: 'user_attendance', column: 'supabase_user_id' },
      { table: 'survey_responses', column: 'supabase_user_id' },
      { table: 'partnership_inquiries', column: 'supabase_user_id' },
      { table: 'access_logs', column: 'supabase_user_id' },
      { table: 'users', column: 'supabase_user_id' },
    ]

    for (const { table, column } of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq(column, userId)

        if (error) {
          console.warn(`[delete-account] ${table}.${column} 삭제 실패:`, error.message)
          deleteErrors.push(`${table}: ${error.message}`)
        }
      } catch (err: any) {
        console.warn(`[delete-account] ${table}.${column} 예외:`, err.message)
        deleteErrors.push(`${table}: ${err.message}`)
      }
    }

    if (deleteErrors.length > 0) {
      console.warn('[delete-account] 일부 테이블 삭제 실패:', deleteErrors)
    }

    // auth.users에서도 삭제 (Supabase 인증 계정 완전 삭제)
    try {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authDeleteError) {
        console.warn('[delete-account] auth.users 삭제 실패:', authDeleteError.message)
        deleteErrors.push(`auth.users: ${authDeleteError.message}`)
      }
    } catch (err: any) {
      console.warn('[delete-account] auth.users 삭제 예외:', err.message)
      deleteErrors.push(`auth.users: ${err.message}`)
    }

    return NextResponse.json({ success: true, warnings: deleteErrors })
  } catch (err: any) {
    console.error('[delete-account] 예외:', err)
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
