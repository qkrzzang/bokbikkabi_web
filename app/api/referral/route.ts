import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    if (action === 'my-stats') {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

      const [totalResult, monthlyResult] = await Promise.all([
        supabaseAdmin
          .from('referral_rewards')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', userId),
        supabaseAdmin
          .from('referral_rewards')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', userId)
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd),
      ])

      return NextResponse.json({
        total_referrals: totalResult.count || 0,
        monthly_referrals: monthlyResult.count || 0,
        monthly_limit: 10,
      })
    }

    if (action === 'my-referrals') {
      const { data, error } = await supabaseAdmin
        .from('referral_rewards')
        .select('id, referee_id, referrer_points, created_at')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const referrals = []
      for (const r of (data || [])) {
        const { data: referee } = await supabaseAdmin
          .from('users')
          .select('nickname')
          .eq('supabase_user_id', r.referee_id)
          .maybeSingle()

        referrals.push({
          ...r,
          referee_nickname: referee?.nickname
            ? referee.nickname.charAt(0) + '**'
            : '***',
        })
      }

      return NextResponse.json({ referrals })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[referral GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, userId, ip } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    if (action === 'process-reward') {
      const { data, error } = await supabaseAdmin.rpc('process_referral_reward', {
        p_referee_id: userId,
        p_signup_ip: ip || null,
      })

      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[referral POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
