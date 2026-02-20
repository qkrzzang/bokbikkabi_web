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

    // 통합 조회: 5개 쿼리를 병렬 실행하여 한 번의 API 호출로 처리
    if (action === 'all' && userId) {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')

      const [ticketsResult, eventsResult, entriesResult, costResult, historyResult] = await Promise.all([
        supabaseAdmin
          .from('user_tickets')
          .select('total_tickets')
          .eq('supabase_user_id', userId)
          .maybeSingle(),
        // RPC로 변경: 이벤트 목록 + 총 응모 수 (DB 내부 집계)
        supabaseAdmin
          .rpc('get_lucky_draw_events_v2'),
        supabaseAdmin
          .from('lucky_draw_entries')
          .select('*')
          .eq('supabase_user_id', userId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('common_code_detail')
          .select('extra_value1')
          .eq('code_group', 'LUCKY_DRAW_CONFIG')
          .eq('code_value', 'TICKET_COST')
          .eq('use_yn', 'Y')
          .lte('sta_ymd', today)
          .gte('end_ymd', today)
          .maybeSingle(),
        supabaseAdmin
          .from('ticket_transactions')
          .select('*')
          .eq('supabase_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      const events = eventsResult.data || []
      
      // 이벤트 맵 생성 (내 응모 내역에 이벤트 정보 매핑용)
      const eventMap = new Map(events.map((e: any) => [e.id, e]))
      
      const entries = (entriesResult.data || []).map(entry => {
        const ev: any = eventMap.get(entry.lucky_draw_id)
        return {
          ...entry,
          event: ev ? {
            id: ev.id,
            title: ev.title, // RPC 반환값은 이미 title
            prize_name: ev.prize_name, // RPC 반환값은 이미 prize_name
            status: ev.status,
          } : null,
        }
      })

      return NextResponse.json({
        tickets: ticketsResult.data?.total_tickets || 0,
        events, // RPC 결과 그대로 반환 (이미 포맷팅, 카운팅 완료됨)
        entries,
        cost: costResult.data ? parseInt(costResult.data.extra_value1) : 1000,
        transactions: historyResult.data || [],
      })
    }

    if (action === 'events') {
      // RPC로 변경: 단순히 이벤트 목록만 조회할 때도 최적화된 함수 사용
      const { data, error } = await supabaseAdmin
        .rpc('get_lucky_draw_events_v2')

      if (error) throw error
      
      return NextResponse.json({ events: data || [] })
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
      const { data } = await supabaseAdmin
        .from('common_code_detail')
        .select('extra_value1')
        .eq('code_group', 'LUCKY_DRAW_CONFIG')
        .eq('code_value', 'TICKET_COST')
        .eq('use_yn', 'Y')
        .lte('sta_ymd', today)
        .gte('end_ymd', today)
        .maybeSingle()

      return NextResponse.json({ cost: data ? parseInt(data.extra_value1) : 1000 })
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
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[lucky-draw POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
