'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CameraButton.module.css'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthCheck } from '@/components/AuthGuard'
// heic2any는 window를 참조하므로 동적 import 사용 (SSR 방지)

// ── HEIC 파일 감지 유틸리티 ──
function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

// ── iOS에서 type이 비어있는 이미지 파일 감지 ──
function isImageFileLoose(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  // iOS Safari에서 HEIC 파일의 type이 빈 문자열일 수 있음
  const name = file.name.toLowerCase()
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif', '.tiff', '.tif']
  return imageExtensions.some(ext => name.endsWith(ext))
}

// ── HEIC → JPEG 변환 ──
async function convertHeicToJpeg(file: File): Promise<File> {
  console.log('[HEIC] 변환 시작:', file.name, file.type, file.size)
  try {
    const heic2any = (await import('heic2any')).default
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    })
    const jpegBlob = Array.isArray(result) ? result[0] : result
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
    const convertedFile = new File([jpegBlob], newName, { type: 'image/jpeg' })
    console.log('[HEIC] 변환 완료:', convertedFile.name, convertedFile.type, convertedFile.size)
    return convertedFile
  } catch (error) {
    console.error('[HEIC] 변환 실패:', error)
    throw new Error('HEIC 이미지를 변환할 수 없습니다. 다른 형식의 이미지를 사용해주세요.')
  }
}

// ── Base64 데이터 URI 검증 및 정규화 ──
function validateAndNormalizeBase64(dataUrl: string): string {
  // 줄바꿈/공백 제거
  const cleaned = dataUrl.replace(/[\r\n\s]/g, '')
  // data:image/xxx;base64,... 패턴 검증
  const base64Regex = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/
  if (!base64Regex.test(cleaned)) {
    console.warn('[Base64] 유효하지 않은 패턴 감지, 앞 50자:', cleaned.substring(0, 50))
    // prefix가 없으면 JPEG로 기본 설정
    if (!cleaned.startsWith('data:')) {
      return `data:image/jpeg;base64,${cleaned}`
    }
  }
  return cleaned
}

// ── 이미지 File을 안전하게 Base64로 변환 ──
function safeReadAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        try {
          const result = reader.result as string
          const normalized = validateAndNormalizeBase64(result)
          resolve(normalized)
        } catch (error) {
          console.error('[Base64] 정규화 중 에러:', error)
          console.error('[Base64] 원본 데이터 앞 50자:', (reader.result as string)?.substring(0, 50))
          reject(error)
        }
      }
      reader.onerror = () => {
        console.error('[FileReader] 읽기 실패:', reader.error)
        reject(reader.error || new Error('파일 읽기에 실패했습니다.'))
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('[FileReader] The string did not match the expected pattern:', error)
      console.error('[FileReader] 파일 정보:', { name: file.name, type: file.type, size: file.size })
      reject(error)
    }
  })
}

// ── 이미지 리사이즈 (큰 이미지를 OCR 전에 축소하여 안정성 확보) ──
function resizeImageIfNeeded(file: File, maxDimension: number = 4096): Promise<File> {
  return new Promise((resolve) => {
    // 2MB 이하이면 리사이즈 불필요
    if (file.size <= 2 * 1024 * 1024) {
      resolve(file)
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img

      // 이미 충분히 작은 경우
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file)
        return
      }

      const scale = Math.min(maxDimension / width, maxDimension / height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resized = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
            console.log('[Resize] 이미지 리사이즈 완료:', { before: file.size, after: resized.size, scale: scale.toFixed(2) })
            resolve(resized)
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file) // 실패 시 원본 반환
    }
    img.src = url
  })
}

export default function CameraButton() {
  const { user: authUser } = useAuth()
  const checkAuth = useAuthCheck({ showAlert: true })
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [mode, setMode] = useState<'select' | 'camera' | 'upload' | 'result' | 'review'>('select')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [ocrResult, setOcrResult] = useState<any>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [n8nResult, setN8nResult] = useState<any>(null)
  const [n8nError, setN8nError] = useState<string | null>(null)
  const [agentAddresses, setAgentAddresses] = useState<Record<string, { road_address: string; lot_address: string }>>({})
  const [selectedAgents, setSelectedAgents] = useState<Record<string, { agent_id: number; agent_number: string; agent_name: string; road_address: string; lot_address: string; representative_name?: string }>>({})
  const [showAgentSelection, setShowAgentSelection] = useState(false)
  const [pendingAgentSelection, setPendingAgentSelection] = useState<{
    contractIndex: number
    agentName: string
    agentNumber?: string
    reason: 'exact' | 'multiple' | 'fuzzy'
    agents: Array<{ id: number; agent_number: string; agent_name: string; road_address: string; lot_address: string; representative_name?: string; matchScore?: number }>
  } | null>(null)
  const [showConfirmSelection, setShowConfirmSelection] = useState(false)
  const [confirmingAgent, setConfirmingAgent] = useState<{
    agent: { id: number; agent_number: string; agent_name: string; road_address: string; lot_address: string; representative_name?: string }
    contractIndex: number
  } | null>(null)
  
  // 리뷰 작성 상태
  const [transactionTags, setTransactionTags] = useState<string[]>([])
  const [praiseTags, setPraiseTags] = useState<string[]>([])
  const [regretTags, setRegretTags] = useState<string[]>([])
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({})
  const [transactionTagOptions, setTransactionTagOptions] = useState<Array<{
    code_value: string
    code_name: string
  }>>([])
  const [praiseTagOptions, setPraiseTagOptions] = useState<Array<{
    code_value: string
    code_name: string
  }>>([])
  const [regretTagOptions, setRegretTagOptions] = useState<Array<{
    code_value: string
    code_name: string
  }>>([])
  const [detailEvaluations, setDetailEvaluations] = useState<Array<{
    code_value: string
    code_name: string
    extra_value1: string | null
    extra_value2: string | null
    extra_value3: string | null
    extra_value4: string | null
    extra_value5: string | null
  }>>([])
  const [reviewText, setReviewText] = useState('')
  const [showThankYouModal, setShowThankYouModal] = useState(false)
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})
  const [isAgreementChecked, setIsAgreementChecked] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    let isMounted = true
    
    // 로그인 상태 확인 - useAuth()로 관리
    if (isMounted) {
      setIsLoggedIn(!!authUser)
    }
    
    // 인증 상태 변경 감지는 AuthContext에서 관리하므로 제거
    const subscription = { unsubscribe: () => {} } // 더미 subscription
    const dummyListener = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (isMounted) {
        setIsLoggedIn(!!session)
      }
    })

    // 리뷰 작성 이벤트 리스너
    const handleReviewStart = () => {
      if (isMounted) {
        handleButtonClick()
      }
    }

    window.addEventListener('review:start', handleReviewStart)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      window.removeEventListener('review:start', handleReviewStart)
    }
  }, [])

  const fetchReviewCodeDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('common_code_detail')
        .select('code_group, code_value, code_name, extra_value1, extra_value2, extra_value3, extra_value4, extra_value5, sort_order, use_yn')
        .in('code_group', ['TRANSACTION_TYPE', 'PRAISE_TAG', 'REGRET_TAG', 'DETAIL_EVALUATION'])
        .order('code_group', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) {
        return
      }

      const activeData = (data || []).filter((item: any) => item.use_yn !== 'N')
      setTransactionTagOptions(activeData.filter((item: any) => item.code_group === 'TRANSACTION_TYPE'))
      setPraiseTagOptions(activeData.filter((item: any) => item.code_group === 'PRAISE_TAG'))
      setRegretTagOptions(activeData.filter((item: any) => item.code_group === 'REGRET_TAG'))
      setDetailEvaluations(activeData.filter((item: any) => item.code_group === 'DETAIL_EVALUATION'))
    } catch (error) {
      // 모든 오류 조용히 처리
    }
  }

  useEffect(() => {
    let isMounted = true
    
    const loadCodeDetails = async () => {
      if (isMounted) {
        await fetchReviewCodeDetails()
      }
    }
    
    loadCodeDetails()
    
    return () => {
      isMounted = false
    }
  }, [])

  const handleButtonClick = () => {
    setIsConfirmModalOpen(true)
  }

  const handleConfirm = () => {
    if (!isAgreementChecked) {
      return
    }
    setIsConfirmModalOpen(false)
    setIsAgreementChecked(false)
    setIsOpen(true)
    setMode('select')
    setCapturedImage(null)
    // TODO: 리뷰 작성 페이지로 이동하거나 다음 프로세스 진행
    console.log('리뷰 작성 프로세스 시작')
  }

  const handleCancelConfirm = () => {
    setIsConfirmModalOpen(false)
    setIsAgreementChecked(false)
  }

  const getRatingText = (codeValue: string, rating: number): string => {
    if (rating === 0) return ''
    const target = detailEvaluations.find((item) => item.code_value === codeValue)
    if (!target) return ''
    const texts = [
      target.extra_value1,
      target.extra_value2,
      target.extra_value3,
      target.extra_value4,
      target.extra_value5,
    ]
    return texts[rating - 1] || ''
  }

  const openModal = () => {
    setIsOpen(true)
    setMode('select')
    setCapturedImage(null)
  }

  const closeModal = () => {
    setIsOpen(false)
    setMode('select')
    setCapturedImage(null)
    setOriginalFile(null)
    setOcrResult(null)
    setOcrError(null)
    setN8nResult(null)
    setN8nError(null)
    setAgentAddresses({})
    setSelectedAgents({})
    setShowAgentSelection(false)
    setPendingAgentSelection(null)
    setTransactionTags([])
    setPraiseTags([])
    setRegretTags([])
    setReviewRatings({})
    setReviewText('')
    setShowThankYouModal(false)
    setHoverRatings({})
    stopCamera()
  }

  const handleAgentSelect = (selectedAgent: { id: number; agent_number: string; agent_name: string; road_address: string; lot_address: string; representative_name?: string }) => {
    // 확인 팝업 표시
    console.log(`[중개사 선택] 사용자가 선택: ${selectedAgent.agent_name} (${selectedAgent.agent_number})`)
    console.log(`[중개사 선택] 확인 팝업 표시`)
    
    if (pendingAgentSelection) {
      setConfirmingAgent({
        agent: selectedAgent,
        contractIndex: pendingAgentSelection.contractIndex
      })
      setShowConfirmSelection(true)
    }
  }

  const handleConfirmAgent = () => {
    if (!confirmingAgent || !pendingAgentSelection || !n8nResult) return

    console.log(`[중개사 확인] 사용자가 확인 버튼 클릭`)
    console.log(`[중개사 확인] 최종 선택: ${confirmingAgent.agent.agent_name}`)

    const selectedAgent = confirmingAgent.agent
    const key = `${confirmingAgent.contractIndex}`
    
    // 선택한 중개사무소 정보 저장
    setAgentAddresses(prev => ({
      ...prev,
      [key]: {
        road_address: selectedAgent.road_address || '',
        lot_address: selectedAgent.lot_address || ''
      }
    }))
    
    setSelectedAgents(prev => ({
      ...prev,
      [key]: {
        agent_id: selectedAgent.id,
        agent_number: selectedAgent.agent_number,
        agent_name: selectedAgent.agent_name,
        road_address: selectedAgent.road_address || '',
        lot_address: selectedAgent.lot_address || '',
        representative_name: selectedAgent.representative_name
      }
    }))

    setN8nResult((prev: any) => {
      if (!prev) return prev
      if (Array.isArray(prev)) {
        return prev.map((item, idx) =>
          idx === confirmingAgent.contractIndex
            ? {
                ...item,
                agent_name: selectedAgent.agent_name,
                agent_number: selectedAgent.agent_number,
              }
            : item
        )
      }
      return {
        ...prev,
        agent_name: selectedAgent.agent_name,
        agent_number: selectedAgent.agent_number,
      }
    })
    
    // 확인 팝업과 선택 팝업 모두 닫기
    setShowConfirmSelection(false)
    setConfirmingAgent(null)
    setShowAgentSelection(false)
    setPendingAgentSelection(null)
    
    console.log(`[중개사 확인] 선택 완료 - 검증 결과 화면 표시`)
    
    // 검증 결과 화면으로 이동 (mode는 이미 'result'로 설정되어 있음)
  }

  const handleCancelConfirmAgent = () => {
    console.log(`[중개사 확인] 사용자가 취소 버튼 클릭 (다시 선택)`)
    setShowConfirmSelection(false)
    setConfirmingAgent(null)
    
    // 선택 팝업으로 돌아가기 (다시 선택할 수 있도록)
    if (pendingAgentSelection) {
      console.log(`[중개사 확인] 선택 팝업 다시 표시`)
      setShowAgentSelection(true)
    }
  }
  
  const handleAgentSelectionCancel = () => {
    setShowAgentSelection(false)
    setPendingAgentSelection(null)
  }

  const getContractAgentNumber = (contract: any) => {
    if (!contract || typeof contract !== 'object') {
      console.warn('[getContractAgentNumber] 유효하지 않은 계약 데이터:', typeof contract)
      return ''
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
    const result = typeof raw === 'string' ? raw.trim() : String(raw || '').trim()
    // 숫자와 하이픈만 남기는 정규화 (OCR에서 특수문자가 끼는 경우 대응)
    const normalized = result.replace(/[^\d\-\s]/g, '').replace(/\s+/g, '').trim()
    if (result && result !== normalized) {
      console.log(`[getContractAgentNumber] 정규화: "${result}" → "${normalized}"`)
    }
    return normalized || result // 정규화 결과가 비어있으면 원본 반환
  }

  const getContractAgentName = (contract: any) => {
    if (!contract || typeof contract !== 'object') {
      console.warn('[getContractAgentName] 유효하지 않은 계약 데이터:', typeof contract)
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

  const getContractAgentAddress = (contract: any) => {
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


  const normalizeAgentNumber = (value: string) => value.toLowerCase().replace(/[^0-9a-z]/g, '')

  const normalizeText = (value: string) => value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9가-힣]/g, '')

  // Levenshtein Distance 기반 유사도 (0~1)
  const calculateSimilarity = (a: string, b: string) => {
    const source = normalizeText(a)
    const target = normalizeText(b)
    if (!source || !target) return 0
    if (source === target) return 1

    // 포함 관계 체크 (부분 문자열)
    if (source.includes(target) || target.includes(source)) {
      const minLen = Math.min(source.length, target.length)
      const maxLen = Math.max(source.length, target.length)
      return 0.7 + (0.3 * minLen / maxLen)
    }

    const sourceLen = source.length
    const targetLen = target.length
    const matrix = Array.from({ length: sourceLen + 1 }, () => new Array(targetLen + 1).fill(0))

    for (let i = 0; i <= sourceLen; i++) matrix[i][0] = i
    for (let j = 0; j <= targetLen; j++) matrix[0][j] = j

    for (let i = 1; i <= sourceLen; i++) {
      for (let j = 1; j <= targetLen; j++) {
        const cost = source[i - 1] === target[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }

    const distance = matrix[sourceLen][targetLen]
    const maxLen = Math.max(sourceLen, targetLen)
    return maxLen === 0 ? 0 : 1 - distance / maxLen
  }

  const getMatchScore = (
    candidate: { agent_name: string; agent_number: string }, 
    agentName?: string, 
    agentNumber?: string
  ) => {
    const nameScore = agentName ? calculateSimilarity(candidate.agent_name, agentName) : 0
    const numberScore = agentNumber ? calculateSimilarity(candidate.agent_number, agentNumber) : 0

    if (!agentName && agentNumber) return numberScore
    if (agentName && !agentNumber) return nameScore
    return numberScore * 0.6 + nameScore * 0.4
  }

  // 정확 일치 조회
  const fetchExactAgent = async (agentNumber: string) => {
    const trimmedNumber = agentNumber.trim()
    console.log(`[클라이언트] agent_master 테이블 정확 조회: "${trimmedNumber}"`)
    console.log(`[클라이언트] 원본 값: "${agentNumber}", 길이: ${agentNumber.length}`)
    console.log(`[클라이언트] trim 후: "${trimmedNumber}", 길이: ${trimmedNumber.length}`)
    console.log(`[클라이언트] 조회 쿼리:`, {
      table: 'agent_master',
      condition: `agent_number = '${trimmedNumber}'`
    })
    
    try {
      const { data, error } = await supabase
        .from('agent_master')
        .select('id, agent_number, agent_name, road_address, lot_address, representative_name')
        .eq('agent_number', trimmedNumber)
        .maybeSingle()
      
      if (error) {
        console.error('[클라이언트] ❌ Supabase 조회 오류:', error)
        console.error('[클라이언트] 오류 상세:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        return null
      }
      
      if (data) {
        console.log(`[클라이언트] ✅ 조회 성공:`, data)
      } else {
        console.log(`[클라이언트] ⚠️ 데이터 없음 (DB에 '${agentNumber}'가 없습니다)`)
      }
      
      return data
    } catch (error) {
      // AbortError는 조용히 처리 (정상적인 취소 동작)
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[클라이언트] ⚠️ 요청 취소됨 (AbortError)')
        return null
      }
      console.error('[클라이언트] ❌ 예외 발생:', error)
      return null
    }
  }

  // 유사도 검색
  const fetchByNameAndNumber = async (agentName?: string, agentNumber?: string) => {
    if (!agentName && !agentNumber) {
      return []
    }

    const filters: string[] = []
    
    if (agentName) {
      const cleanName = agentName.replace(/(공인중개사|부동산|사무소)$/g, '').trim()
      if (cleanName.length >= 2) {
        filters.push(`agent_name.ilike.%${cleanName}%`)
      }
    }
    
    if (agentNumber) {
      const normalized = normalizeAgentNumber(agentNumber)
      if (normalized.length >= 6) {
        const prefix = normalized.substring(0, 6)
        filters.push(`agent_number.ilike.%${prefix}%`)
      } else if (normalized.length >= 3) {
        filters.push(`agent_number.ilike.%${normalized}%`)
      }
    }

    if (filters.length === 0) {
      return []
    }

    try {
      const { data, error } = await supabase
        .from('agent_master')
        .select('id, agent_number, agent_name, road_address, lot_address, representative_name')
        .or(filters.join(','))
        .limit(50)

      if (error) {
        return []
      }

      const scoredCandidates = (data || []).map((candidate: any) => ({
        ...candidate,
        matchScore: getMatchScore(candidate, agentName, agentNumber),
        road_address: candidate.road_address || '',
        lot_address: candidate.lot_address || '',
      }))
      
      const finalCandidates = scoredCandidates
        .filter((c: any) => (c.matchScore || 0) >= 0.3)
        .sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0))

      return finalCandidates
    } catch (error) {
      // AbortError는 조용히 처리 (정상적인 취소 동작)
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[클라이언트] ⚠️ 요청 취소됨 (AbortError)')
        return []
      }
      console.error('[클라이언트] ❌ 예외 발생:', error)
      return []
    }
  }

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = () => {
    resetFileInput()
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
    resetFileInput()
  }

  const processFile = async (file: File) => {
    // iOS Safari에서 HEIC의 type이 비어있을 수 있으므로 확장자도 함께 체크
    if (!isImageFileLoose(file)) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    try {
      let processedFile = file

      // HEIC/HEIF 파일이면 JPEG로 변환
      if (isHeicFile(file)) {
        try {
          processedFile = await convertHeicToJpeg(file)
        } catch (heicError) {
          console.error('[processFile] HEIC 변환 실패:', heicError)
          alert('HEIC 이미지를 변환할 수 없습니다. JPEG 또는 PNG 파일로 다시 시도해주세요.')
          return
        }
      }

      // 큰 이미지 리사이즈 (iOS에서 촬영한 고해상도 사진 대응)
      processedFile = await resizeImageIfNeeded(processedFile)

      setOriginalFile(processedFile)

      // 안전한 Base64 변환 (에러 핸들링 포함)
      try {
        const dataUrl = await safeReadAsDataURL(processedFile)
        setCapturedImage(dataUrl)
        setMode('upload')
      } catch (readError) {
        console.error('[processFile] Base64 변환 실패:', readError)
        // Base64 프리뷰 실패해도 원본 파일은 보존 → 업로드는 가능하게
        setCapturedImage(null)
        setMode('upload')
      }
    } catch (error) {
      console.error('[processFile] 파일 처리 중 오류:', error)
      alert('이미지 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setMode('camera')
      }
    } catch (error) {
      console.error('카메라 접근 실패:', error)
      alert('카메라 접근 권한이 필요합니다.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)

        try {
          const imageData = canvas.toDataURL('image/jpeg')
          const normalizedImageData = validateAndNormalizeBase64(imageData)
          setCapturedImage(normalizedImageData)
        } catch (error) {
          console.error('[capturePhoto] toDataURL 에러:', error)
          console.error('[capturePhoto] canvas 크기:', { width: canvas.width, height: canvas.height })
          setCapturedImage(null)
        }
        
        // Canvas를 Blob으로 변환하여 File 객체 생성
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' })
            setOriginalFile(file)
          }
        }, 'image/jpeg', 0.9)
        
        stopCamera()
        setMode('upload')
      }
    }
  }

  const handleImageSubmit = async () => {
    if (!originalFile) {
      alert('파일을 찾을 수 없습니다.')
      return
    }

    setIsLoading(true)
    setOcrError(null)
    setN8nError(null)
    setN8nResult(null)

    try {
      // ── 파일 전처리: HEIC 변환 + 타입 보장 ──
      let fileToUpload = originalFile

      // 혹시 HEIC가 processFile에서 변환되지 않았을 경우 재시도
      if (isHeicFile(fileToUpload)) {
        try {
          fileToUpload = await convertHeicToJpeg(fileToUpload)
          setOriginalFile(fileToUpload)
        } catch (heicError) {
          console.error('[handleImageSubmit] HEIC 변환 실패:', heicError)
          throw new Error('HEIC 이미지를 변환할 수 없습니다. JPEG 또는 PNG 파일로 다시 시도해주세요.')
        }
      }

      // iOS Safari에서 type이 비어있는 경우 JPEG로 기본 설정
      if (!fileToUpload.type || fileToUpload.type === '') {
        console.warn('[handleImageSubmit] 파일 타입이 비어있음, JPEG로 재설정:', fileToUpload.name)
        fileToUpload = new File([fileToUpload], fileToUpload.name, { type: 'image/jpeg' })
      }

      console.log('[handleImageSubmit] 업로드 파일 정보:', {
        name: fileToUpload.name,
        type: fileToUpload.type,
        size: fileToUpload.size,
      })

      // ── FormData 생성 (binary 전송 — Base64 문자열 대신 File 객체 직접 전송) ──
      const formData = new FormData()
      formData.append('file', fileToUpload, fileToUpload.name)

      // OCR 요청 타임아웃 (60초)
      const ocrController = new AbortController()
      const ocrTimeoutId = window.setTimeout(() => ocrController.abort(), 60_000)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
        signal: ocrController.signal,
      }).finally(() => window.clearTimeout(ocrTimeoutId))

      if (!response.ok) {
        let errorMsg = 'OCR 처리 중 오류가 발생했습니다.'
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorMsg
          console.error('[handleImageSubmit] OCR API 에러 상세:', errorData)
        } catch {
          const errorText = await response.text().catch(() => '')
          console.error('[handleImageSubmit] OCR API 에러 (text):', errorText.substring(0, 200))
        }
        throw new Error(errorMsg)
      }

      const data = await response.json()
      setOcrResult(data)
      // OCR이 끝났지만 n8n 요청이 완료될 때까지 로딩 유지
      
      // OCR 결과에서 text 필드만 추출 (여러 가능한 경로 확인)
      let ocrText = ''
      if (typeof data === 'string') {
        ocrText = data
      } else if (data?.text) {
        ocrText = typeof data.text === 'string' ? data.text : JSON.stringify(data.text)
      } else if (data?.result?.text) {
        ocrText = typeof data.result.text === 'string' ? data.result.text : JSON.stringify(data.result.text)
      } else if (data?.data?.text) {
        ocrText = typeof data.data.text === 'string' ? data.data.text : JSON.stringify(data.data.text)
      } else if (data?.pages && Array.isArray(data.pages)) {
        // pages 배열에서 텍스트 추출
        ocrText = data.pages
          .map((page: any) => page?.text || page?.content || '')
          .filter((text: string) => text)
          .join('\n\n')
      }
      
      // n8n 웹훅으로 OCR text만 전송하고 응답 받기
      if (ocrText) {
        try {
          // ── OCR 텍스트 정규화 (불필요한 제어 문자 제거) ──
          const sanitizedOcrText = ocrText
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 제어 문자 제거
            .trim()

          console.log('[n8n] 전송할 텍스트 길이:', sanitizedOcrText.length)
          console.log('[n8n] 텍스트 앞 50자:', sanitizedOcrText.substring(0, 50))

          // n8n 요청 타임아웃 (45초)
          const n8nController = new AbortController()
          const n8nTimeoutId = window.setTimeout(() => n8nController.abort(), 45_000)

          // ── JSON body 사전 검증 ──
          const n8nPayload = {
            text: sanitizedOcrText,
            timestamp: new Date().toISOString(),
          }
          let n8nBodyString: string
          try {
            n8nBodyString = JSON.stringify(n8nPayload)
          } catch (jsonError) {
            console.error('[n8n] JSON.stringify 실패:', jsonError)
            console.error('[n8n] 텍스트 앞 50자:', sanitizedOcrText.substring(0, 50))
            throw new Error('OCR 결과를 JSON으로 변환할 수 없습니다.')
          }

          const n8nResponse = await fetch(
            'https://qkrzzang13.app.n8n.cloud/webhook/4fc817ac-3148-46e1-8127-8960ade84ae3',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: n8nBodyString,
              signal: n8nController.signal,
            }
          ).finally(() => window.clearTimeout(n8nTimeoutId))

          if (!n8nResponse.ok) {
            let errorText = ''
            try {
              errorText = await n8nResponse.text()
            } catch { /* ignore */ }
            console.error('[n8n] 웹훅 전송 실패:', n8nResponse.status, errorText.substring(0, 200))
            setN8nError(`n8n 호출 실패: ${n8nResponse.status}`)
            setMode('result')
            setIsLoading(false)
          } else {
            let n8nRawText = ''
            let n8nData: any
            try {
              n8nRawText = await n8nResponse.text()
              console.log('[n8n] 원본 응답 길이:', n8nRawText.length)
              console.log('[n8n] 원본 응답 앞 200자:', n8nRawText.substring(0, 200))
              n8nData = JSON.parse(n8nRawText)
            } catch (parseError) {
              console.error('[n8n] JSON 파싱 실패:', parseError)
              console.error('[n8n] 원본 응답 앞 100자:', n8nRawText.substring(0, 100))
              setN8nError('n8n 응답을 파싱할 수 없습니다. 다시 시도해주세요.')
              setMode('result')
              setIsLoading(false)
              return
            }
            console.log('====== n8n 응답 받음 ======')
            console.log('[n8n] 응답 타입:', typeof n8nData, Array.isArray(n8nData) ? `(배열, 길이: ${n8nData.length})` : '')
            console.log('[n8n] 응답 전체:', JSON.stringify(n8nData, null, 2))

            // ── n8n 응답이 래핑되어 있을 수 있는 경우 언래핑 ──
            // n8n이 { data: [...] } 또는 { result: [...] } 등으로 감쌀 수 있음
            let unwrappedData = n8nData
            if (unwrappedData && typeof unwrappedData === 'object' && !Array.isArray(unwrappedData)) {
              if (unwrappedData.data && (Array.isArray(unwrappedData.data) || typeof unwrappedData.data === 'object')) {
                console.log('[n8n] 응답을 data 필드에서 언래핑')
                unwrappedData = unwrappedData.data
              } else if (unwrappedData.result && (Array.isArray(unwrappedData.result) || typeof unwrappedData.result === 'object')) {
                console.log('[n8n] 응답을 result 필드에서 언래핑')
                unwrappedData = unwrappedData.result
              } else if (unwrappedData.output && (Array.isArray(unwrappedData.output) || typeof unwrappedData.output === 'object')) {
                console.log('[n8n] 응답을 output 필드에서 언래핑')
                unwrappedData = unwrappedData.output
              } else if (unwrappedData.contracts && Array.isArray(unwrappedData.contracts)) {
                console.log('[n8n] 응답을 contracts 필드에서 언래핑')
                unwrappedData = unwrappedData.contracts
              }
            }
            
            // contract_type이 'NON_CONTRACT'인 항목 필터링
            const filterValidContracts = (data: any): any => {
              if (Array.isArray(data)) {
                const validContracts = data.filter((contract: any) => contract.contract_type !== 'NON_CONTRACT')
                return validContracts.length > 0 ? validContracts : null
              } else if (data && typeof data === 'object') {
                return data.contract_type !== 'NON_CONTRACT' ? data : null
              }
              return null
            }
            
            const validContracts = filterValidContracts(unwrappedData)
            
            // ── 유효 계약서의 agent 관련 필드 상세 로깅 ──
            if (validContracts) {
              const contractsArr = Array.isArray(validContracts) ? validContracts : [validContracts]
              contractsArr.forEach((c: any, idx: number) => {
                console.log(`[n8n] 계약서[${idx}] agent 필드 상세:`, {
                  agent_number: c?.agent_number,
                  agentNumber: c?.agentNumber,
                  agent_no: c?.agent_no,
                  registration_number: c?.registration_number,
                  broker_number: c?.broker_number,
                  agent_name: c?.agent_name,
                  agentName: c?.agentName,
                  office_name: c?.office_name,
                  broker_name: c?.broker_name,
                  contract_type: c?.contract_type,
                  all_keys: Object.keys(c || {}),
                })
              })
            } else {
              console.warn('[n8n] 유효한 계약서 없음. 원본 데이터 키:', 
                unwrappedData ? (Array.isArray(unwrappedData) 
                  ? unwrappedData.map((d: any) => Object.keys(d || {})) 
                  : Object.keys(unwrappedData)) 
                : 'null'
              )
            }
            
            if (!validContracts || (Array.isArray(validContracts) && validContracts.length === 0)) {
              setN8nError('계약서가 아닌 문서입니다. 부동산 계약서를 다시 올려주세요.')
              setN8nResult(null)
              setMode('result')
              setIsLoading(false)
            } else {
              setN8nResult(validContracts)
              setMode('result')
              setIsLoading(false)
              
              // agent_number 또는 agent_name으로 Supabase에서 road_address 조회
              const contractsToProcess = Array.isArray(validContracts) ? validContracts : [validContracts]
              
              if (contractsToProcess.length > 0) {
                const addresses: Record<string, { road_address: string; lot_address: string }> = {}
                const pendingSelections: Array<{
                  contractIndex: number
                  agentName: string
                  agentNumber?: string
                  reason: 'exact' | 'multiple' | 'fuzzy'
                  agents: Array<{ id: number; agent_number: string; agent_name: string; road_address: string; lot_address: string; representative_name?: string; matchScore?: number }>
                }> = []
                
                // 모든 계약서에 대해 조회 수행
                for (let i = 0; i < contractsToProcess.length; i++) {
                  const contract = contractsToProcess[i]
                  const key = `${i}`
                  let found = false
                  const contractAgentNumber = getContractAgentNumber(contract)
                  const contractAgentName = getContractAgentName(contract)
                  
                  console.log(`[계약서 ${i}] OCR 추출값:`, { 
                    agent_number: contractAgentNumber, 
                    agent_number_length: contractAgentNumber?.length,
                    agent_name: contractAgentName,
                    agent_name_length: contractAgentName?.length,
                    contract_keys: Object.keys(contract || {}),
                  })

                  // agent 필드가 모두 비어있으면 상세 경고
                  if (!contractAgentNumber && !contractAgentName) {
                    console.warn(`[계약서 ${i}] ⚠️ agent_number, agent_name 모두 비어있음!`)
                    console.warn(`[계약서 ${i}] n8n 원본 데이터:`, JSON.stringify(contract, null, 2))
                  }
                  
                  // 1단계: agent_number로 정확 일치 조회 (반드시 실행)
                  if (contractAgentNumber) {
                    console.log(`[1단계] agent_number 정확 일치 조회 시작: "${contractAgentNumber}" (길이: ${contractAgentNumber.length})`)
                    try {
                      const numberData = await fetchExactAgent(contractAgentNumber)
                      
                      console.log(`[1단계] 조회 결과:`, numberData)

                      if (numberData) {
                        console.log(`[1단계] 정확 일치 찾음! (사용자 확인 필요)`, numberData)
                        // 정확 일치인 경우에도 선택 팝업 표시
                        pendingSelections.push({
                          contractIndex: i,
                          agentName: numberData.agent_name,
                          agentNumber: numberData.agent_number,
                          reason: 'exact',
                          agents: [{
                            id: numberData.id,
                            agent_number: numberData.agent_number,
                            agent_name: numberData.agent_name,
                            road_address: numberData.road_address || '',
                            lot_address: numberData.lot_address || '',
                            matchScore: 1.0
                          }]
                        })
                        found = true
                      } else {
                        console.log(`[1단계] 정확 일치 없음. 2단계로 이동`)
                      }
                    } catch (error) {
                      console.error('[1단계] agent_number 조회 오류:', error)
                    }
                  } else {
                    console.log(`[1단계] OCR에서 agent_number 없음. 2단계로 이동`)
                  }
                  
                  // 2단계: 등록번호+이름 조합 유사도 검색 (상위 2건)
                  if (!found) {
                    console.log(`[2단계] 등록번호+이름 유사도 조회:`, { 
                      name: contractAgentName, 
                      number: contractAgentNumber
                    })
                    const combinedCandidates = await fetchByNameAndNumber(
                      contractAgentName || undefined,
                      contractAgentNumber || undefined
                    )
                    
                    // 상위 2건만 유지
                    const topCandidates = combinedCandidates.slice(0, 2)
                    
                    console.log(`[2단계] 후보 개수: ${topCandidates.length}`,
                      topCandidates.map((c: any) => ({ name: c.agent_name, score: c.matchScore?.toFixed(2) }))
                    )
                    
                    if (topCandidates.length > 0) {
                      pendingSelections.push({
                        contractIndex: i,
                        agentName: contractAgentName || '알 수 없음',
                        agentNumber: contractAgentNumber || undefined,
                        reason: 'fuzzy',
                        agents: topCandidates
                      })
                      found = true
                    }
                  }
                  
                  if (!found) {
                    console.warn(`[계약서 ${i}] 중개사무소를 찾지 못했습니다. → 검증 결과 화면에서 "확인 필요" 표시`)
                  }
                }
                
                setAgentAddresses(addresses)
                
                console.log(`[검증] 총 ${pendingSelections.length}개 계약서에 대한 선택 필요`)
                
                // 선택이 필요한 경우 첫 번째 후보부터 표시
                if (pendingSelections.length > 0) {
                  const firstSelection = pendingSelections[0]
                  
                  // 정확 일치 1건인 경우 바로 확인 팝업 표시
                  if (firstSelection.reason === 'exact' && firstSelection.agents.length === 1) {
                    console.log(`[검증] ✅ 정확 일치 1건 → 확인 팝업 바로 표시`)
                    console.log(`[검증] 중개사: ${firstSelection.agents[0].agent_name} (${firstSelection.agents[0].agent_number})`)
                    setConfirmingAgent({
                      agent: firstSelection.agents[0],
                      contractIndex: firstSelection.contractIndex
                    })
                    setPendingAgentSelection(firstSelection)
                    setShowConfirmSelection(true)
                  } else {
                    // 유사 검색이거나 여러 건인 경우 선택 팝업 표시
                    console.log(`[검증] 🔍 ${firstSelection.reason === 'exact' ? '정확 일치 여러 건' : '유사 검색 ' + firstSelection.agents.length + '건'} → 선택 팝업 표시`)
                    setPendingAgentSelection(firstSelection)
                    setShowAgentSelection(true)
                  }
                } else {
                  // 후보가 0건인 경우: 팝업 없이 검증 결과 화면만 표시
                  console.log(`[검증] ⚠️ 후보 0건 → 선택 팝업 없이 검증 결과만 표시`)
                  console.log(`[검증] 검증 결과 화면에서 "중개사무소 확인 필요" 메시지 표시됨`)
                }
              }
            }
          }
        } catch (n8nError) {
          console.error('[n8n] 웹훅 전송 중 오류:', n8nError)
          // "The string did not match the expected pattern" 디버깅
          if (n8nError instanceof Error && n8nError.message.includes('did not match')) {
            console.error('[n8n] 패턴 불일치 에러 발생! OCR 텍스트 앞 50자:', ocrText?.substring(0, 50))
            console.error('[n8n] OCR 텍스트 길이:', ocrText?.length)
            console.error('[n8n] 파일 정보:', { name: fileToUpload.name, type: fileToUpload.type, size: fileToUpload.size })
          }
          setN8nError(
            n8nError instanceof DOMException && n8nError.name === 'AbortError'
              ? '검증 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
              : n8nError instanceof Error
                ? n8nError.message
                : 'n8n 호출 중 오류가 발생했습니다.'
          )
          setMode('result')
          setIsLoading(false)
        }
      } else {
        console.warn('OCR 결과에서 텍스트를 추출할 수 없습니다:', data)
        setN8nError('부동산 계약서를 다시 올려주세요.')
        setMode('result')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('[handleImageSubmit] 오류:', error)
      // "The string did not match the expected pattern" 디버깅
      if (error instanceof Error && error.message.includes('did not match')) {
        console.error('[handleImageSubmit] 패턴 불일치 에러! 파일 정보:', {
          name: originalFile?.name,
          type: originalFile?.type,
          size: originalFile?.size,
        })
      }
      setMode('result')
      setOcrError(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'OCR 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
          : error instanceof Error
            ? error.message
            : 'OCR 처리 중 오류가 발생했습니다.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (mode === 'camera') {
      stopCamera()
      setMode('select')
    } else if (mode === 'result') {
      // 검증 결과에서 뒤로 버튼 클릭 시 -> 업로드 화면으로 이동
      setMode('upload')
    } else {
      setCapturedImage(null)
      setOriginalFile(null)
      setMode('select')
    }
  }

  const handleReviewSubmit = async () => {
    if (isReviewSubmitting) return

    // 인증 체크
    if (!checkAuth()) return
    if (!authUser?.id) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      setIsReviewSubmitting(true)

      // 리뷰 제한 정책 확인 (공통 코드 기반)
      const { data: policies, error: policyError } = await supabase
        .from('common_code_detail')
        .select('code_value, extra_value1')
        .eq('code_group', 'REVIEW_POLICY')
        .eq('use_yn', 'Y')
      
      let dailyLimit = 1
      let monthlyLimit = 3
      let userLimit = 10

      if (!policyError && policies) {
        policies.forEach((p: any) => {
          if (p.code_value === 'DAILY_LIMIT') dailyLimit = Number(p.extra_value1) || 1
          if (p.code_value === 'MONTHLY_LIMIT') monthlyLimit = Number(p.extra_value1) || 3
          if (p.code_value === 'USER_LIMIT') userLimit = Number(p.extra_value1) || 10
        })
      }

      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

      // 1. 일일 작성 수 조회
      const { count: dailyCount, error: dailyError } = await supabase
        .from('agent_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('supabase_user_id', authUser.id)
        .gte('created_at', startOfDay)
      
      if (!dailyError && (dailyCount || 0) >= dailyLimit) {
        alert(`하루에 최대 ${dailyLimit}건의 리뷰만 등록할 수 있습니다.\n내일 다시 시도해주세요.`)
        return
      }

      // 2. 월간 작성 수 조회
      const { count: monthlyCount, error: monthlyError } = await supabase
        .from('agent_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('supabase_user_id', authUser.id)
        .gte('created_at', startOfMonth)

      if (!monthlyError && (monthlyCount || 0) >= monthlyLimit) {
        alert(`한 달에 최대 ${monthlyLimit}건의 리뷰만 등록할 수 있습니다.\n다음 달에 다시 시도해주세요.`)
        return
      }

      // 3. 유저 전체 작성 수 조회
      const { count: totalCount, error: totalError } = await supabase
        .from('agent_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('supabase_user_id', authUser.id)

      if (!totalError && (totalCount || 0) >= userLimit) {
        alert(`계정당 최대 ${userLimit}건의 리뷰만 등록할 수 있습니다.`)
        return
      }

      const reviewLength = reviewText.trim().length
      if (reviewLength < 20) {
        alert('상세 리뷰는 20자 이상 작성해주세요.')
        return
      }

      // 거래 태그 필수 체크
      if (transactionTags.length === 0) {
        alert('거래 태그를 선택해주세요.')
        return
      }

      // 칭찬 태그 또는 아쉬움 태그 필수 체크 (최소 1개)
      if (praiseTags.length === 0 && regretTags.length === 0) {
        alert('칭찬 태그 또는 아쉬움 태그 중 최소 1개를 선택해주세요.')
        return
      }

      // 상세 평가 필수 체크
      const requiredEvaluations = detailEvaluations.map(e => e.code_value)
      const missingEvaluations = requiredEvaluations.filter(code => {
        const rating = reviewRatings[code]
        return !rating || rating === 0
      })

      if (missingEvaluations.length > 0) {
        const missingNames = missingEvaluations
          .map(code => detailEvaluations.find(e => e.code_value === code)?.code_name)
          .filter(Boolean)
          .join(', ')
        alert(`모든 상세 평가 항목을 선택해주세요.\n미선택 항목: ${missingNames}`)
        return
      }

      const selectedKeys = Object.keys(selectedAgents)
      if (selectedKeys.length === 0) {
        alert('중개사무소 확인이 필요합니다. 후보 중 하나를 선택해주세요.')
        return
      }

      const reviewIndex = primaryReviewIndex
      const selectedAgent = selectedAgents[String(reviewIndex)]

      if (!selectedAgent?.agent_id) {
        alert('중개사무소 정보가 없습니다. 다시 확인해주세요.')
        return
      }

      const contractData = primaryContract

      // code_value 또는 code_name으로 평가 점수 찾기
      const getRatingByKeywords = (keywords: string[]) => {
        // 먼저 code_value로 검색
        for (const keyword of keywords) {
          const value = reviewRatings[keyword]
          if (typeof value === 'number' && value > 0) {
            console.log(`[리뷰 저장] ${keyword} 점수 찾음 (code_value): ${value}`)
            return value
          }
        }
        
        // code_value로 못 찾으면 detailEvaluations의 code_name으로 검색
        for (const keyword of keywords) {
          const evaluation = detailEvaluations.find(e => 
            e.code_name.includes(keyword) || 
            e.code_value.toUpperCase().includes(keyword.toUpperCase())
          )
          if (evaluation) {
            const value = reviewRatings[evaluation.code_value]
            if (typeof value === 'number' && value > 0) {
              console.log(`[리뷰 저장] ${keyword} 점수 찾음 (code_name 매칭): ${value}`)
              return value
            }
          }
        }
        
        console.log(`[리뷰 저장] ${keywords.join(', ')} 점수 없음`)
        return null
      }

      console.log(`[리뷰 저장] 평가 점수 확인:`, reviewRatings)
      console.log(`[리뷰 저장] 상세 평가 항목:`, detailEvaluations.map(e => ({ code_value: e.code_value, code_name: e.code_name })))

      const { error } = await supabase
        .from('agent_reviews')
        .insert({
          agent_id: selectedAgent.agent_id,
          supabase_user_id: authUser.id,
          transaction_tag: transactionTags[0] || null,
          agent_address: contractData?.agent_address || contractData?.agentAddress || null,
          agent_name: contractData?.agent_name || contractData?.agentName || getContractAgentName(contractData) || null,
          confience_score: contractData?.confience_score || contractData?.confidence_score || contractData?.confidenceScore || null,
          contract_type: contractData?.contract_type || contractData?.contractType || null,
          doc_title: contractData?.doc_title || contractData?.docTitle || null,
          reason: contractData?.reason || null,
          praise_tags: praiseTags,
          regret_tags: regretTags,
          fee_satisfaction: getRatingByKeywords(['FEE_SATISFACTION', '수수료']),
          expertise: getRatingByKeywords(['EXPERTISE', '전문성', '지식']),
          kindness: getRatingByKeywords(['KINDNESS', '친절', '태도']),
          property_reliability: getRatingByKeywords(['PROPERTY_RELIABILITY', '매물', '신뢰도']),
          response_speed: getRatingByKeywords(['RESPONSE_SPEED', 'COMMUNICATION', '응답', '속도']),
          review_text: reviewText || null,
          contract_date: contractData?.contract_date || null,
        })

      if (error) {
        console.error('리뷰 저장 실패:', error)
        alert(`리뷰 저장에 실패했습니다: ${error.message}`)
        return
      }

      console.log('[리뷰 저장] 성공, 포인트 지급 시작')

      // 리뷰 저장 성공 시 포인트 지급
      try {
        const { data: pointResult, error: pointError } = await supabase.rpc('award_points', {
          p_user_id: authUser.id,
          p_transaction_type: 'REVIEW',
          p_description: '리뷰 작성 완료'
        })

        if (pointError) {
          console.error('[포인트 지급] 실패:', pointError)
          // 포인트 지급 실패해도 리뷰는 저장되었으므로 계속 진행
        } else {
          console.log('[포인트 지급] 성공:', pointResult)
        }
      } catch (pointErr) {
        console.error('[포인트 지급] 오류:', pointErr)
        // 포인트 지급 오류가 발생해도 리뷰는 저장되었으므로 계속 진행
      }

      if (reviewAgentName && reviewAgentName !== '-') {
        window.dispatchEvent(new CustomEvent('review:saved', { detail: { query: reviewAgentName } }))
      }

      setShowThankYouModal(true)
    } catch (error) {
      console.error('리뷰 저장 오류:', error)
      alert('리뷰 저장 중 오류가 발생했습니다.')
    } finally {
      setIsReviewSubmitting(false)
    }
  }

  const reviewCharCount = reviewText.trim().length
  const isReviewLengthValid = reviewCharCount >= 20
  
  // 거래 태그 선택 확인
  const hasTransactionTag = transactionTags.length > 0
  
  // 칭찬 또는 아쉬움 태그 최소 1개 선택 확인
  const hasAtLeastOneTag = praiseTags.length > 0 || regretTags.length > 0
  
  // 모든 상세 평가 항목 선택 확인
  const allEvaluationsSelected = detailEvaluations.every(evaluation => {
    const rating = reviewRatings[evaluation.code_value]
    return rating && rating > 0
  })
  
  // 전체 리뷰 유효성 확인
  const isReviewValid = isReviewLengthValid && hasTransactionTag && hasAtLeastOneTag && allEvaluationsSelected
  
  const primaryReviewIndex = (() => {
    const keys = Object.keys(selectedAgents)
    if (keys.length > 0) {
      const value = Number(keys[0])
      return Number.isNaN(value) ? 0 : value
    }
    return 0
  })()
  const primaryReviewKey = String(primaryReviewIndex)
  const primaryContract = Array.isArray(n8nResult)
    ? (n8nResult[primaryReviewIndex] || n8nResult[0])
    : n8nResult
  const reviewAgentName =
    selectedAgents[primaryReviewKey]?.agent_name ||
    getContractAgentName(primaryContract) ||
    '-'
  const hasSelectedAgent = Object.keys(selectedAgents).length > 0

  // 로그인하지 않은 사용자에게는 버튼을 표시하지 않음
  if (!isLoggedIn) {
    return null
  }

  return (
    <>
      <div
        className={styles.buttonWrapper}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {showTooltip && (
          <div className={styles.tooltip}>리뷰 작성</div>
        )}
        <button
          className={styles.cameraButton}
          onClick={handleButtonClick}
          aria-label="리뷰 작성"
        >
          리뷰 작성
      </button>
      </div>

      {isConfirmModalOpen && (
        <div className={styles.overlay} onClick={handleCancelConfirm}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmModalContent}>
              <h3 className={styles.confirmTitle}>리뷰를 작성하시겠습니까?</h3>
              
              {/* 개인정보 보호 안내 */}
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  fontSize: '15px', 
                  fontWeight: 600, 
                  color: '#92400e',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  개인정보 보호 권장
                </div>
                <div style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
                  <strong style={{ color: '#b45309' }}>민감한 정보는 가리고 업로드해 주세요.</strong><br />
                  
                </div>
              </div>

              <div className={styles.agreementContainer}>
                <label className={styles.agreementLabel}>
                  <input
                    type="checkbox"
                    checked={isAgreementChecked}
                    onChange={(e) => setIsAgreementChecked(e.target.checked)}
                    className={styles.agreementCheckbox}
                  />
                  <span className={styles.agreementText}>
                  <strong>(필수)</strong> 본인의 계약서임을 확인하며, 
          <span style={{ fontWeight: 'bold'}}> 개인정보 보호 정책</span>에 따라 정보를 업로드함에 동의합니다. 
          또한 <strong>위조된 문서가 아님</strong>을 확인하며, 허위 등록 시 <strong>관련 법령(사문서 위조 등)</strong>에 따른 
          <span style={{ color: '#b91c1c', fontWeight: 'bold' }}> 책임은 본인에게 있음</span>을 인지합니다.
                  </span>
                </label>
              </div>
              <div className={styles.confirmButtons}>
                <button
                  className={styles.confirmCancelButton}
                  onClick={handleCancelConfirm}
                >
                  취소
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleConfirm}
                  disabled={!isAgreementChecked}
                >
                  작성하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h3>{mode === 'review' ? '리뷰 작성' : '부동산 계약서 업로드'}</h3>
              </div>
              <button
                className={styles.closeButton}
                onClick={closeModal}
                aria-label="닫기"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className={styles.modalContent}>
              {mode === 'select' && (
                <>
                  {/* 개인정보 보호 안내 */}
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
                      💡 <b>개인정보 등 민감한 정보는 가리고 업로드해 주세요.</b> <br></br>가려진 계약서도 AI가 정보를 안전하게 분석합니다.
                    </div>
                  </div>

                  {isMobile ? (
                    <div className={styles.selectMode}>
                      <button
                        className={styles.optionButton}
                        onClick={handleFileSelect}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 10L12 15L17 10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 15V3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>갤러리에서 선택</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      ref={dropZoneRef}
                      className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className={styles.dropZoneContent}>
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={styles.dropZoneIcon}
                        >
                          <path
                            d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 10L12 15L17 10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 15V3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <p className={styles.dropZoneText}>
                          파일을 드래그 앤 드롭하거나 클릭하여 업로드
                        </p>
                        <p className={styles.dropZoneHint}>
                          이미지 파일만 업로드 가능합니다
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mode === 'camera' && (
                <div className={styles.cameraMode}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={styles.video}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className={styles.cameraControls}>
                    <button
                      className={styles.cancelButton}
                      onClick={handleCancel}
                    >
                      취소
                    </button>
                    <button
                      className={styles.captureButton}
                      onClick={capturePhoto}
                    >
                      <div className={styles.captureButtonInner} />
                    </button>
                    <div style={{ width: '60px' }} />
                  </div>
                </div>
              )}

              {mode === 'upload' && capturedImage && (
                <div className={styles.uploadMode}>
                  {isLoading && (
                    <div className={styles.loadingOverlay}>
                      <div className={styles.loadingMessage}>
                        <div className={styles.loadingSpinnerLarge}></div>
                        <p>계약서 분석중 ...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 개인정보 보호 안내 */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#78350f',
                    lineHeight: '1.5'
                  }}>
                    <strong style={{ color: '#b45309' }}>⚠️ 개인정보 확인:</strong> 주민등록번호와 전화번호, 주소 등 민감한 정보가 가려져 있는지 확인해주세요.
                  </div>
                  
                  <img
                    src={capturedImage}
                    alt="업로드할 이미지"
                    className={styles.previewImage}
                  />
                  <div className={styles.uploadControls}>
                    <button
                      className={styles.cancelButton}
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      다시 선택
                    </button>
                    <button
                      className={styles.submitButton}
                      onClick={handleImageSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className={styles.loadingSpinner}></span>
                          처리 중...
                        </>
                      ) : (
                        '검증'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'result' && (
                <div className={styles.resultMode}>
                  {ocrError ? (
                    <div className={styles.errorContainer}>
                      <h3>오류 발생</h3>
                      <p>{ocrError}</p>
                      <button
                        className={styles.submitButton}
                        onClick={() => setMode('upload')}
                      >
                        다시 시도
                      </button>
                    </div>
                  ) : n8nError ? (
                    <div className={styles.errorContainer}>
                      <h3>검증 오류</h3>
                      <p>{n8nError}</p>
                      <button
                        className={styles.submitButton}
                        onClick={() => setMode('upload')}
                      >
                        다시 시도
                      </button>
                    </div>
                  ) : n8nResult ? (
                    <div className={styles.resultContainer}>
                      <h3>{hasSelectedAgent ? '검증 결과' : '🔍 중개사 정보를 찾을 수 없습니다'}</h3>
                      <div className={styles.contractInfo}>
                        {Array.isArray(n8nResult) && n8nResult.length > 0 ? (
                          n8nResult.map((contract: any, index: number) => (
                            <div key={index} className={styles.contractCard}>
                              <div className={styles.contractField}>
                                <span className={styles.fieldLabel}>계약일자:</span>
                                <span className={styles.fieldValue}>{contract.contract_date || '-'}</span>
                              </div>
                              {selectedAgents[`${index}`] ? (
                                <>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>중개사무소명:</span>
                                    <span className={styles.fieldValue}>{selectedAgents[`${index}`].agent_name}</span>
                                  </div>
                                  {selectedAgents[`${index}`].representative_name && (
                                    <div className={styles.contractField}>
                                      <span className={styles.fieldLabel}>대표자명:</span>
                                      <span className={styles.fieldValue}>{selectedAgents[`${index}`].representative_name}</span>
                                    </div>
                                  )}
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>등록번호:</span>
                                    <span className={styles.fieldValue}>{selectedAgents[`${index}`].agent_number}</span>
                                  </div>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>주소(도로명):</span>
                                    <span className={styles.fieldValue}>{selectedAgents[`${index}`].road_address}</span>
                                  </div>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>주소(지번):</span>
                                    <span className={styles.fieldValue}>{selectedAgents[`${index}`].lot_address || '-'}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>중개사 정보:</span>
                                    <span className={styles.fieldValue} style={{ color: '#ef4444', fontWeight: 600 }}>
                                      중개사 정보 식별 불가
                                    </span>
                                  </div>
                                  <div className={styles.contractField} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                    <span className={styles.fieldValue} style={{ color: '#1e293b', fontSize: '14px', lineHeight: '1.6' }}>
                                      계약서 하단의 공인중개사 날인란이 선명하게 포함되었는지 확인해 주세요. 
                                      개인정보(이름, 주소 등)를 가리느라 중개사 정보까지 가려지지는 않았나요?
                                    </span>
                                  </div>
                                  {pendingAgentSelection?.contractIndex === index && (
                                    <div className={styles.contractField}>
                                      <span className={styles.fieldLabel}>검증 상태:</span>
                                      <span className={styles.fieldValue} style={{ color: '#64748b', fontStyle: 'italic' }}>선택 중...</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className={styles.contractCard}>
                            <pre className={styles.resultText}>
                              {JSON.stringify(n8nResult, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div className={styles.resultControls}>
                        {hasSelectedAgent ? (
                          <>
                            <button
                              className={styles.cancelButton}
                              onClick={handleCancel}
                            >
                              뒤로
                            </button>
                            <button
                              className={styles.submitButton}
                              onClick={() => setMode('review')}
                            >
                              리뷰 작성
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={styles.cancelButton}
                              onClick={handleCancel}
                            >
                              뒤로
                            </button>
                          </>
                        )}
                        {!hasSelectedAgent && (
                          <div className={styles.reviewNotice} style={{ textAlign: 'left', lineHeight: '1.6' }}>
                            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
                              <strong style={{ color: '#475569' }}>📌 촬영 가이드</strong>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '13px' }}>
                              <li style={{ marginBottom: '4px' }}>종이가 접히거나 빛 반사가 심하면 인식이 어려울 수 있습니다.</li>
                              <li>중개업소의 상호, 등록번호, 소재지가 모두 보이도록 촬영해 주세요.</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {mode === 'review' && (
                <div className={styles.reviewContainer}>
                  <div className={styles.reviewTargetInfo}>
                    <h3 className={styles.reviewAgentName}>{reviewAgentName}</h3>
                  </div>
                  {/* 거래 태그 (4개 중 하나만 선택 가능) */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>
                      거래 태그 <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                    </h4>
                    <div className={styles.tagContainer}>
                      {transactionTagOptions.length === 0 ? (
                        <span className={styles.reviewTagEmpty}>거래 태그가 없습니다.</span>
                      ) : (
                        transactionTagOptions.map((tag) => (
                          <button
                            key={tag.code_value}
                            className={`${styles.tagButton} ${transactionTags.includes(tag.code_name) ? styles.tagButtonActive : ''}`}
                            onClick={() => {
                              if (transactionTags.includes(tag.code_name)) {
                                setTransactionTags([])
                              } else {
                                setTransactionTags([tag.code_name])
                              }
                            }}
                          >
                            {tag.code_name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* 칭찬 태그 */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>
                      칭찬 태그 
                      <span style={{ color: '#f59e0b', marginLeft: '4px', fontSize: '13px', fontWeight: 'normal' }}>
                        (칭찬 또는 아쉬움 중 최소 1개 선택)
                      </span>
                    </h4>
                    <div className={styles.tagContainer}>
                      {praiseTagOptions.length === 0 ? (
                        <span className={styles.reviewTagEmpty}>칭찬 태그가 없습니다.</span>
                      ) : (
                        praiseTagOptions.map((tag) => (
                          <button
                            key={tag.code_value}
                            className={`${styles.tagButton} ${praiseTags.includes(tag.code_name) ? styles.tagButtonPraiseActive : ''}`}
                            onClick={() => {
                              if (praiseTags.includes(tag.code_name)) {
                                setPraiseTags(praiseTags.filter((t) => t !== tag.code_name))
                              } else {
                                setPraiseTags([...praiseTags, tag.code_name])
                              }
                            }}
                          >
                            {tag.code_name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 아쉬움 태그 */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>아쉬움 태그</h4>
                    <div className={styles.tagContainer}>
                      {regretTagOptions.length === 0 ? (
                        <span className={styles.reviewTagEmpty}>아쉬움 태그가 없습니다.</span>
                      ) : (
                        regretTagOptions.map((tag) => (
                          <button
                            key={tag.code_value}
                            className={`${styles.tagButton} ${regretTags.includes(tag.code_name) ? styles.tagButtonRegretActive : ''}`}
                            onClick={() => {
                              if (regretTags.includes(tag.code_name)) {
                                setRegretTags(regretTags.filter((t) => t !== tag.code_name))
                              } else {
                                setRegretTags([...regretTags, tag.code_name])
                              }
                            }}
                          >
                            {tag.code_name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 상세 평가 */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>
                      상세 평가 <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                    </h4>
                    <div className={styles.ratingContainer}>
                      {detailEvaluations.length === 0 ? (
                        <div className={styles.ratingEmpty}>상세 평가 항목이 없습니다.</div>
                      ) : (
                        detailEvaluations.map((item) => {
                          const currentRating = reviewRatings[item.code_value] || 0
                          const currentHover = hoverRatings[item.code_value] || 0
                          const displayedRating = currentHover || currentRating

                          return (
                            <div key={item.code_value} className={styles.ratingItem}>
                              <span className={styles.ratingLabel}>{item.code_name}</span>
                              <div
                                className={styles.starRating}
                                onMouseLeave={() => setHoverRatings((prev) => ({ ...prev, [item.code_value]: 0 }))}
                              >
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    className={`${styles.starButton} ${displayedRating >= star ? styles.starActive : ''}`}
                                    onClick={() => setReviewRatings((prev) => ({ ...prev, [item.code_value]: star }))}
                                    onMouseEnter={() => setHoverRatings((prev) => ({ ...prev, [item.code_value]: star }))}
                                  >
                                    ★
                                  </button>
                                ))}
                                {displayedRating > 0 && (
                                  <span className={styles.starRatingText}>
                                    {getRatingText(item.code_value, displayedRating)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* 텍스트 리뷰 */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>상세 리뷰</h4>
                    <textarea
                      className={styles.reviewTextarea}
                      placeholder="중개사무소에 대한 상세한 리뷰를 작성해주세요..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={5}
                    />
                    <div className={styles.reviewTextMeta}>
                      <span
                        className={`${styles.reviewTextCounter} ${isReviewLengthValid ? styles.reviewTextCounterComplete : ''}`}
                      >
                        {reviewCharCount} / 20자
                      </span>
                    </div>
                  </div>

                  {/* 필수 항목 체크 상태 */}
                  {!isReviewValid && (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#fef2f2',
                      borderLeft: '4px solid #ef4444',
                      borderRadius: '4px',
                      marginTop: '16px'
                    }}>
                      <div style={{ fontSize: '14px', color: '#991b1b', fontWeight: 500, marginBottom: '8px' }}>
                        필수 항목을 모두 입력해주세요
                      </div>
                      <ul style={{ fontSize: '13px', color: '#dc2626', paddingLeft: '20px', margin: 0 }}>
                        {!hasTransactionTag && <li>거래 태그 선택</li>}
                        {!hasAtLeastOneTag && <li>칭찬 태그 또는 아쉬움 태그 중 최소 1개 선택</li>}
                        {!allEvaluationsSelected && <li>모든 상세 평가 항목 선택</li>}
                        {!isReviewLengthValid && <li>상세 리뷰 20자 이상 작성</li>}
                      </ul>
                    </div>
                  )}

                  {/* 버튼 */}
                  <div className={styles.reviewControls}>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setMode('result')}
                    >
                      뒤로
                    </button>
                    <button
                      className={styles.submitButton}
                      onClick={handleReviewSubmit}
                      disabled={isReviewSubmitting || !isReviewValid}
                      title={!isReviewValid ? '모든 필수 항목을 입력해주세요' : ''}
                    >
                      {isReviewSubmitting ? '저장 중...' : '리뷰 저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAgentSelection && pendingAgentSelection && (
        <div className={styles.overlay} onClick={handleAgentSelectionCancel}>
          <div className={styles.agentSelectionModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.agentSelectionHeader}>
              <h3>중개사무소 선택</h3>
              <button
                className={styles.closeButton}
                onClick={handleAgentSelectionCancel}
                aria-label="닫기"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className={styles.agentSelectionContent}>
              <p className={styles.agentSelectionMessage}>
                {pendingAgentSelection.reason === 'exact' ? (
                  <>
                    등록번호와 일치하는 중개사무소입니다.<br />
                    해당 정보가 맞는지 확인해주세요.
                  </>
                ) : pendingAgentSelection.reason === 'multiple' ? (
                  <>
                    "{pendingAgentSelection.agentName}"와 동일한 이름의 중개사무소가 여러 개 있습니다.<br />
                    해당하는 사무소를 선택해주세요.
                  </>
                ) : (
                  <>
                    "{pendingAgentSelection.agentName}"와 가장 유사한 중개사무소 후보입니다.<br />
                    맞는 정보를 선택해주세요.
                  </>
                )}
                {pendingAgentSelection.agentNumber && (
                  <span className={styles.agentSelectionWarning}>
                    (OCR 등록번호: {pendingAgentSelection.agentNumber})
                  </span>
                )}
              </p>
              <div className={styles.agentList}>
                {pendingAgentSelection.agents.map((agent) => (
                  <button
                    key={agent.id}
                    className={styles.agentItem}
                    onClick={() => handleAgentSelect(agent)}
                  >
                    <div className={styles.agentItemInfo}>
                      <div className={styles.agentItemName}>{agent.agent_name}</div>
                      <div className={styles.agentItemDetails}>
                        {agent.representative_name && (
                          <span>대표자: {agent.representative_name}</span>
                        )}
                        <span>등록번호: {agent.agent_number}</span>
                        <span>도로명 주소: {agent.road_address || '-'}</span>
                        <span>지번 주소: {agent.lot_address || '-'}</span>
                        {typeof agent.matchScore === 'number' && (
                          <span>유사도: {Math.round(agent.matchScore * 100)}%</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showThankYouModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.thankYouModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.thankYouContent}>
              <div className={styles.thankYouIcon}>🎉</div>
              <h2 className={styles.thankYouTitle}>감사합니다!</h2>
              <p className={styles.thankYouMessage}>
                소중한 리뷰를 작성해주셔서 감사합니다.<br />
                다른 분들에게 큰 도움이 될 것입니다.
              </p>
              <button
                className={styles.submitButton}
                onClick={closeModal}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmSelection && confirmingAgent && (
        <div className={styles.overlay} onClick={handleCancelConfirmAgent}>
          <div className={styles.confirmSelectionModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmSelectionHeader}>
              <h3>중개사무소 확인</h3>
            </div>
            <div className={styles.confirmSelectionContent}>
              <p className={styles.confirmSelectionQuestion}>
                이 공인중개사사무소가 맞습니까?
              </p>
              <div className={styles.confirmAgentCard}>
                <div className={styles.confirmAgentName}>{confirmingAgent.agent.agent_name}</div>
                <div className={styles.confirmAgentDetails}>
                  <div className={styles.confirmAgentRow}>
                    <span className={styles.confirmAgentLabel}>대표자명:</span>
                    <span className={styles.confirmAgentValue}>{confirmingAgent.agent.representative_name || '-'}</span>
                  </div>
                  <div className={styles.confirmAgentRow}>
                    <span className={styles.confirmAgentLabel}>등록번호:</span>
                    <span className={styles.confirmAgentValue}>{confirmingAgent.agent.agent_number}</span>
                  </div>
                  <div className={styles.confirmAgentRow}>
                    <span className={styles.confirmAgentLabel}>도로명 주소:</span>
                    <span className={styles.confirmAgentValue}>{confirmingAgent.agent.road_address || '-'}</span>
                  </div>
                  <div className={styles.confirmAgentRow}>
                    <span className={styles.confirmAgentLabel}>지번 주소:</span>
                    <span className={styles.confirmAgentValue}>{confirmingAgent.agent.lot_address || '-'}</span>
                  </div>
                </div>
              </div>
              <div className={styles.confirmSelectionButtons}>
                <button
                  className={styles.confirmCancelButton}
                  onClick={handleCancelConfirmAgent}
                >
                  아니요
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleConfirmAgent}
                >
                  네, 맞습니다
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  )
}

