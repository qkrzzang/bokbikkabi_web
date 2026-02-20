import { supabase } from '@/lib/supabase/client'

export function normalizeAgentNum(raw: any): string {
  const result = typeof raw === 'string' ? raw.trim() : String(raw || '').trim()
  if (!result) return ''
  const normalized = result.replace(/\s+/g, '').trim()
  if (result && result !== normalized) {
    console.log(`[normalizeAgentNum] 정규화: "${result}" → "${normalized}"`)
  }
  return normalized
}

export function getContractAgentNumber(contract: any): string {
  const numbers = getContractAgentNumbers(contract)
  return numbers[0] || ''
}

export function getContractAgentNumbers(contract: any): string[] {
  if (!contract || typeof contract !== 'object') {
    console.warn('[getContractAgentNumbers] 유효하지 않은 계약 데이터:', typeof contract)
    return []
  }
  const raw =
    contract?.agent_number ??
    contract?.agentNumber ??
    contract?.agent_no ??
    contract?.agentNo ??
    contract?.registration_number ??
    contract?.registrationNumber ??
    contract?.broker_number ??
    contract?.brokerNumber ??
    contract?.license_number ??
    contract?.licenseNumber ??
    ''

  console.log(`[getContractAgentNumbers] raw 값:`, raw, `(타입: ${typeof raw}, 배열: ${Array.isArray(raw)})`)

  if (Array.isArray(raw)) {
    const normalized = raw
      .map((item: any) => normalizeAgentNum(item))
      .filter((n: string) => n.length > 0)
    console.log(`[getContractAgentNumbers] 배열 입력 (공동중개): ${normalized.length}개`, normalized)
    return normalized
  }

  const single = normalizeAgentNum(raw)
  console.log(`[getContractAgentNumbers] 단일 입력: "${single}"`)
  return single ? [single] : []
}

export function getContractAgentName(contract: any): string {
  if (!contract || typeof contract !== 'object') {
    return ''
  }
  const raw =
    contract?.agent_name ??
    contract?.agentName ??
    contract?.office_name ??
    contract?.officeName ??
    contract?.broker_name ??
    contract?.brokerName ??
    contract?.realtor_name ??
    contract?.realtorName ??
    ''
  return typeof raw === 'string' ? raw.trim() : String(raw || '').trim()
}

export function getContractAgentAddress(contract: any): string {
  if (!contract || typeof contract !== 'object') return ''
  const raw =
    contract?.agent_address ??
    contract?.agentAddress ??
    contract?.address ??
    contract?.road_address ??
    contract?.roadAddress ??
    contract?.broker_address ??
    contract?.brokerAddress ??
    ''
  return typeof raw === 'string' ? raw.trim() : String(raw || '').trim()
}

export function stripAgentNumber(num: string): string {
  return num.replace(/[\s\-]/g, '')
}

export async function fetchExactAgent(agentNumber: string) {
  const trimmedNumber = agentNumber.trim()
  console.log(`[클라이언트] agent_master RPC 조회: "${trimmedNumber}"`)
  
  try {
    const { data, error } = await supabase
      .rpc('search_agent_by_number', { input_number: trimmedNumber })

    if (error) {
      console.error('[클라이언트] RPC 오류:', error.message)
      return null
    }

    if (data && data.length > 0) {
      console.log(`[클라이언트] 매칭 성공:`, data[0].agent_name, `(DB: "${data[0].agent_number}")`)
      return data[0]
    }

    console.log(`[클라이언트] 조회 실패 (DB에 '${trimmedNumber}' 없음)`)
    return null
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[클라이언트] 요청 취소됨 (AbortError)')
      return null
    }
    console.error('[클라이언트] 예외 발생:', error)
    return null
  }
}
