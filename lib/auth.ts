import { supabase } from './supabase/client'

// OAuth 로그인
export const signInWithKakao = async () => {
  try {
    // 리다이렉트 URL 생성
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
    
    console.log('[카카오 로그인] 시작')
    console.log('[카카오 로그인] Redirect URL:', redirectUrl)
    console.log('[카카오 로그인] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    })
    
    if (error) {
      console.error('[카카오 로그인] 오류:', error)
      console.error('[카카오 로그인] 오류 상세:', {
        message: error.message,
        status: error.status,
        name: error.name
      })
      throw error
    }
    
    console.log('[카카오 로그인] OAuth URL 생성 성공')
    console.log('[카카오 로그인] URL:', data.url?.substring(0, 100))
    
    return data
  } catch (err) {
    console.error('[카카오 로그인] 예외 발생:', err)
    throw err
  }
}

export const signInWithGoogle = async () => {
  try {
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
    
    console.log('[구글 로그인] 시작')
    console.log('[구글 로그인] Redirect URL:', redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    })
    
    if (error) {
      console.error('[구글 로그인] 오류:', error)
      throw error
    }
    
    console.log('[구글 로그인] OAuth URL 생성 성공')
    
    return data
  } catch (err) {
    console.error('[구글 로그인] 예외 발생:', err)
    throw err
  }
}

// 로그아웃
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('로그아웃 오류:', error)
    throw error
  }
}

// 현재 사용자 정보 가져오기 (세션이 있을 때만)
export const getCurrentUser = async () => {
  // 먼저 세션 확인
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    // 세션이 없으면 사용자 정보를 가져오지 않음
    return null
  }
  
  // 세션이 있으면 사용자 정보 반환 (세션에 이미 사용자 정보가 포함되어 있음)
  return session.user
}

// 세션 확인
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('세션 확인 오류:', error)
    return null
  }
  
  return session
}
