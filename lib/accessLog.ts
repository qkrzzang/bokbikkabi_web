import { supabase } from './supabase/client'

interface AccessLogData {
  action: string
  endpoint?: string
  statusCode?: number
  userAgent?: string
  deviceType?: string
  browser?: string
  os?: string
}

// 디바이스 타입 감지
const getDeviceType = (userAgent: string): string => {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'tablet'
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    return 'mobile'
  }
  return 'desktop'
}

// 브라우저 감지
const getBrowser = (userAgent: string): string => {
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  return 'Unknown'
}

// OS 감지
const getOS = (userAgent: string): string => {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iOS')) return 'iOS'
  return 'Unknown'
}

// IP 주소 가져오기 (클라이언트 사이드에서는 제한적)
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || 'unknown'
  } catch {
    return 'unknown'
  }
}

// 접속 이력 기록 (로그인한 유저만)
export const logAccess = async (logData: AccessLogData) => {
  try {
    // 세션 확인 (getSession이 더 빠름)
    const { data: { session } } = await supabase.auth.getSession()
    let userId = session?.user?.id || null

    // 로그인 액션의 경우 세션이 아직 준비되지 않았을 수 있으므로 재시도
    if (!userId && logData.action === 'login') {
      // 로그인 시도인데 세션이 없으면 잠시 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 500))
      const { data: { session: retrySession } } = await supabase.auth.getSession()
      userId = retrySession?.user?.id || null
    }

    // userId가 없으면 Insert하지 않음 (로그인한 유저만 기록)
    if (!userId) {
      // 로그인하지 않은 사용자는 조용히 종료 (로그 없음)
      return
    }
    
    const userAgent = logData.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown')
    const deviceType = logData.deviceType || getDeviceType(userAgent)
    const browser = logData.browser || getBrowser(userAgent)
    const os = logData.os || getOS(userAgent)
    const ipAddress = typeof window !== 'undefined' ? await getClientIP() : 'unknown'

    const { error } = await supabase
      .from('access_logs')
      .insert({
        supabase_user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceType,
        browser: browser,
        os: os,
        action: logData.action,
        endpoint: logData.endpoint || (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
        status_code: logData.statusCode || 200,
      })

    if (error) {
      console.error('접속 이력 기록 오류:', error)
    }
    
    // 성공 로그는 조용히 처리 (불필요한 로그 방지)
  } catch (error) {
    // 접속 이력 기록 실패는 조용히 처리 (불필요한 로그 방지)
  }
}
