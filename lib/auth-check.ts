import { supabase } from './supabase/client'

// users 테이블에 사용자 정보 Upsert (없으면 생성, 있으면 업데이트)
export const upsertUserToUsersTable = async (user: any): Promise<boolean> => {
  try {
    if (!user || !user.id) {
      console.error('유효하지 않은 사용자 정보')
      return false
    }

    // 데이터 매핑
    const userData = {
      supabase_user_id: user.id,
      email: user.email || null,
      provider: user.app_metadata?.provider || 'unknown',
      provider_user_id: user.user_metadata?.sub || user.user_metadata?.id || null,
      nickname: 
        user.user_metadata?.properties?.nickname || // 카카오
        user.user_metadata?.kakao_account?.profile?.nickname || // 카카오 (다른 형식)
        user.user_metadata?.name || // 구글
        user.user_metadata?.full_name || // 구글 (다른 형식)
        user.user_metadata?.nickname ||
        null,
      profile_image_url:
        user.user_metadata?.properties?.profile_image || // 카카오
        user.user_metadata?.kakao_account?.profile?.profile_image_url || // 카카오 (다른 형식)
        user.user_metadata?.avatar_url || // 구글
        user.user_metadata?.picture || // 구글 (다른 형식)
        null,
      last_login_at: new Date().toISOString(),
    }

    // Upsert 실행 (ON CONFLICT로 중복 방지)
    const { error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'supabase_user_id',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error('사용자 Upsert 오류:', error)
      return false
    }

    console.log('사용자 정보 Upsert 성공:', { userId: user.id, provider: userData.provider })
    return true
  } catch (error) {
    console.error('사용자 Upsert 중 오류:', error)
    return false
  }
}

// users 테이블에 사용자가 있는지 확인
export const isUserInUsersTable = async (supabaseUserId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('supabase_user_id')
      .eq('supabase_user_id', supabaseUserId)
      .single()

    if (error) {
      // 사용자를 찾을 수 없는 경우는 정상적인 경우일 수 있음 (404 등)
      if (error.code === 'PGRST116') {
        return false
      }
      console.error('사용자 확인 오류:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('사용자 확인 중 오류:', error)
    return false
  }
}

// 현재 사용자가 users 테이블에 있는지 확인 및 Upsert
export const checkUserAccess = async (): Promise<{
  hasAccess: boolean
  user: any
  message?: string
}> => {
  try {
    // 1. 세션 확인 (세션이 없으면 로그인하지 않은 사용자 - 접근 허용)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    // 세션 오류가 있거나 세션이 없으면 로그인하지 않은 사용자로 간주
    if (sessionError || !session) {
      // 로그인하지 않은 사용자는 자유롭게 접근 가능
      return {
        hasAccess: true,
        user: null,
        message: '로그인하지 않은 사용자'
      }
    }

    // 2. 세션이 있는 경우 users 테이블에 Upsert (반드시 await로 완료 대기)
    try {
      console.log('사용자 정보 Upsert 시작:', { userId: session.user.id })
      const upsertSuccess = await upsertUserToUsersTable(session.user)
      
      if (!upsertSuccess) {
        console.warn('사용자 Upsert 실패했지만 접근은 허용합니다.')
        // Upsert 실패해도 접근은 허용 (오류는 로그만 남김)
      }

      // Upsert 완료 후 접근 허용
      return {
        hasAccess: true,
        user: session.user,
      }
    } catch (upsertError) {
      console.error('사용자 Upsert 중 오류:', upsertError)
      // 오류 발생 시에도 사용자에게 접근 허용 (오류는 로그만 남김)
      return {
        hasAccess: true,
        user: session.user,
        message: '사용자 정보 동기화 중 오류가 발생했지만 접근을 허용합니다.'
      }
    }
  } catch (error) {
    console.error('접근 확인 중 오류:', error)
    // 최종 오류 발생 시에도 접근 허용 (오류는 로그만 남김)
    return {
      hasAccess: true,
      user: null,
      message: '접근 확인 중 오류가 발생했지만 접근을 허용합니다.'
    }
  }
}
