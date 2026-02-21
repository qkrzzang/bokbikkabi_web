import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cached, invalidate } from '@/lib/redis'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    // 통합 조회: 캐시(events, cost) + RPC 1회(사용자 데이터) = 최대 2회 네트워크 호출
    if (action === 'all' && userId) {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')

      const [events, cost, userDataResult] = await Promise.all([
        cached('ld:events', 300, async () => {
          const { data } = await supabaseAdmin.rpc('get_lucky_draw_events_v2')
          return data || []
        }),
        cached('ld:cost', 3600, async () => {
          const { data } = await supabaseAdmin
            .from('common_code_detail')
            .select('extra_value1')
            .eq('code_group', 'LUCKY_DRAW_CONFIG')
            .eq('code_value', 'TICKET_COST')
            .eq('use_yn', 'Y')
            .lte('sta_ymd', today)
            .gte('end_ymd', today)
            .maybeSingle()
          return data ? parseInt(data.extra_value1) : 1000
        }),
        supabaseAdmin.rpc('get_user_lucky_draw_data', { p_user_id: userId }),
      ])

      const userData = userDataResult.data || { tickets: 0, entries: [], transactions: [] }
      const eventMap = new Map((events as any[]).map((e: any) => [e.id, e]))

      const entries = (userData.entries || []).map((entry: any) => {
        const ev: any = eventMap.get(entry.lucky_draw_id)
        return {
          ...entry,
          event: ev ? {
            id: ev.id,
            title: ev.title,
            prize_name: ev.prize_name,
            status: ev.status,
          } : null,
        }
      })

      return NextResponse.json({
        tickets: userData.tickets || 0,
        events,
        entries,
        cost,
        transactions: userData.transactions || [],
      })
    }

    if (action === 'events') {
      const events = await cached('ld:events', 300, async () => {
        const { data, error } = await supabaseAdmin.rpc('get_lucky_draw_events_v2')
        if (error) throw error
        return data || []
      })
      return NextResponse.json({ events })
    }

    if (action === 'my-tickets' && userId) {
      const { data } = await supabaseAdmin
        .from('user_tickets')
        .select('total_tickets')
        .eq('supabase_user_id', userId)
        .maybeSingle()

      return NextResponse.json({ tickets: data?.total_tickets || 0 })
    }

    if (action === 'my-entries' && userId) {
      const { data, error } = await supabaseAdmin
        .from('lucky_draw_entries')
        .select('*')
        .eq('supabase_user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const entries = []
      for (const entry of (data || [])) {
        const { data: eventData } = await supabaseAdmin
          .from('common_code_detail')
          .select('id, code_name, extra_value5')
          .eq('id', entry.lucky_draw_id)
          .maybeSingle()

        entries.push({
          ...entry,
          event: eventData ? {
            id: eventData.id,
            title: eventData.code_name,
            prize_name: eventData.code_name,
            status: eventData.extra_value5 || 'ACTIVE',
          } : null,
        })
      }

      return NextResponse.json({ entries })
    }

    if (action === 'my-wins' && userId) {
      const { data, error } = await supabaseAdmin
        .from('lucky_draw_winners')
        .select('*')
        .eq('supabase_user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const wins = []
      for (const win of (data || [])) {
        const { data: eventData } = await supabaseAdmin
          .from('common_code_detail')
          .select('id, code_name')
          .eq('id', win.lucky_draw_id)
          .maybeSingle()

        wins.push({
          ...win,
          event: eventData ? {
            id: eventData.id,
            title: eventData.code_name,
            prize_name: eventData.code_name,
          } : null,
        })
      }

      return NextResponse.json({ wins })
    }

    if (action === 'ticket-cost') {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const cost = await cached('ld:cost', 3600, async () => {
        const { data } = await supabaseAdmin
          .from('common_code_detail')
          .select('extra_value1')
          .eq('code_group', 'LUCKY_DRAW_CONFIG')
          .eq('code_value', 'TICKET_COST')
          .eq('use_yn', 'Y')
          .lte('sta_ymd', today)
          .gte('end_ymd', today)
          .maybeSingle()
        return data ? parseInt(data.extra_value1) : 1000
      })
      return NextResponse.json({ cost })
    }

    if (action === 'ticket-history' && userId) {
      const { data, error } = await supabaseAdmin
        .from('ticket_transactions')
        .select('*')
        .eq('supabase_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return NextResponse.json({ transactions: data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[lucky-draw GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, userId, quantity, eventId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    if (action === 'invalidate-cache') {
      await invalidate('ld:events', 'ld:cost')
      return NextResponse.json({ success: true })
    }

    if (action === 'purchase-ticket') {
      const qty = quantity || 1
      if (qty < 1 || qty > 10) {
        return NextResponse.json({ error: '1~10장까지 구매 가능합니다.' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin.rpc('purchase_ticket', {
        p_user_id: userId,
        p_quantity: qty,
      })

      if (error) throw error
      await invalidate('ld:events')
      return NextResponse.json(data)
    }

    if (action === 'enter-draw') {
      if (!eventId) {
        return NextResponse.json({ error: '이벤트 ID가 필요합니다.' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin.rpc('enter_lucky_draw', {
        p_user_id: userId,
        p_lucky_draw_id: eventId,
      })

      if (error) throw error
      await invalidate('ld:events')
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[lucky-draw POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
