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

    if (action === 'events') {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const { data, error } = await supabaseAdmin
        .from('common_code_detail')
        .select('*')
        .eq('code_group', 'LUCKY_DRAW_PRIZE')
        .eq('use_yn', 'Y')
        .lte('sta_ymd', today)
        .gte('end_ymd', today)
        .order('sort_order', { ascending: true })

      if (error) throw error

      const events = (data || []).map(item => ({
        id: item.id,
        code_value: item.code_value,
        title: item.code_name,
        description: item.description || '',
        prize_name: item.code_name,
        tickets_required: parseInt(item.extra_value1 || '1'),
        max_winners: parseInt(item.extra_value2 || '1'),
        end_date: item.extra_value3
          ? `${item.extra_value3.slice(0,4)}-${item.extra_value3.slice(4,6)}-${item.extra_value3.slice(6,8)}`
          : '9999-12-31',
        status: item.extra_value4 || 'ACTIVE',
        total_entries: 0,
      }))

      // lucky_draw_entries에서 각 이벤트별 응모 수 집계
      for (const event of events) {
        const { count } = await supabaseAdmin
          .from('lucky_draw_entries')
          .select('*', { count: 'exact', head: true })
          .eq('lucky_draw_id', event.id)
        event.total_entries = count || 0
      }

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
          .select('id, code_name, extra_value4')
          .eq('id', entry.lucky_draw_id)
          .maybeSingle()

        entries.push({
          ...entry,
          event: eventData ? {
            id: eventData.id,
            title: eventData.code_name,
            prize_name: eventData.code_name,
            status: eventData.extra_value4 || 'ACTIVE',
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
