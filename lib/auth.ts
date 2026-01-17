import { supabase } from './supabase/client'

// OAuth 로그인
export const signInWithKakao = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  if (error) {
    console.error('카카오 로그인 오류:', error)
    throw error
  }
  
  return data
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  if (error) {
    console.error('구글 로그인 오류:', error)
    throw error
  }
  
  return data
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
