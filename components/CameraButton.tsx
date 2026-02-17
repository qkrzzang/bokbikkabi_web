'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import styles from './CameraButton.module.css'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthCheck } from '@/components/AuthGuard'
import { useAlert } from '@/contexts/AlertContext'
import confetti from 'canvas-confetti'
import { trackOcrFail, trackOcrSuccess } from '@/lib/gtag'
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
  const { showAlert, showSuccess, showError, showWarning } = useAlert()
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
  const [aiResult, setAiResult] = useState<any>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  // 도장 검증 결과
  const [stampResult, setStampResult] = useState<{ agent_stamp: boolean; agent_stamp_confidence: number } | null>(null)
  const [isStampVerifying, setIsStampVerifying] = useState(false)
  // 크롭 이미지 암호화 결과
  const [cropResult, setCropResult] = useState<{ encrypted: string; iv: string } | null>(null)
  const [agentAddresses, setAgentAddresses] = useState<Record<string, { road_address: string; lot_address: string }>>({})
  const [selectedAgents, setSelectedAgents] = useState<Record<string, { agent_id: number; agent_number: string; agent_name: string; road_address: string; lot_address: string; representative_name?: string }>>({})
  const [showAgentSelection, setShowAgentSelection] = useState(false)
  const [pendingAgentSelection, setPendingAgentSelection] = useState<{
    contractIndex: number
    agentName: string
    agentNumber?: string
    reason: 'exact' | 'multiple' | 'fuzzy'
    agents: Array<{ id: number; agent_number: string; agent_name: string; road_address: string; lot_address: string; representative_name?: string; matchScore?: number }>
    notFoundNumbers?: string[]
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
  const [detailEvaluationsForLeaseAndSell, setDetailEvaluationsForLeaseAndSell] = useState<Array<{
    code_value: string
    code_name: string
    extra_value1: string | null
    extra_value2: string | null
    extra_value3: string | null
    extra_value4: string | null
    extra_value5: string | null
  }>>([])
  // 거래 태그에 따라 활성 상세평가 항목 동적 전환
  // 임차(세입자), 매수(구매) → DETAIL_EVALUATION
  // 임대(집주인), 매도(판매) → DETAIL_EVALUATION_FOR_LEASE_AND_SELL
  const activeDetailEvaluations = useMemo(() => {
    const selectedTag = transactionTags[0] || ''
    if (selectedTag.includes('임대') || selectedTag.includes('매도')) {
      return detailEvaluationsForLeaseAndSell
    }
    return detailEvaluations
  }, [transactionTags, detailEvaluations, detailEvaluationsForLeaseAndSell])

  const [reviewText, setReviewText] = useState('')
  const [showThankYouModal, setShowThankYouModal] = useState(false)
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})
  const [isAgreementChecked, setIsAgreementChecked] = useState(false)
  const [isConfettiLocked, setIsConfettiLocked] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // 모달이 열릴 때 body 스크롤 잠금, 닫힐 때 복구
  useEffect(() => {
    if (isOpen || showThankYouModal || showAgentSelection || showConfirmSelection) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isOpen, showThankYouModal, showAgentSelection, showConfirmSelection])

  // 폭죽 효과 발사 함수 (팝업 위로 표시되도록 zIndex 최상위)
  const fireConfetti = useCallback(() => {
    const duration = 1500
    const end = Date.now() + duration
    const confettiZIndex = 2147483647 // 최상위 z-index

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.6 },
        colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'],
        zIndex: confettiZIndex,
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.6 },
        colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'],
        zIndex: confettiZIndex,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    // 중앙 대형 폭발
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4'],
      zIndex: confettiZIndex,
    })

    frame()
  }, [])

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
        .in('code_group', ['TRANSACTION_TYPE', 'PRAISE_TAG', 'REGRET_TAG', 'DETAIL_EVALUATION', 'DETAIL_EVALUATION_FOR_LEASE_AND_SELL'])
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
      setDetailEvaluationsForLeaseAndSell(activeData.filter((item: any) => item.code_group === 'DETAIL_EVALUATION_FOR_LEASE_AND_SELL'))
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
    const target = activeDetailEvaluations.find((item) => item.code_value === codeValue)
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
    setAiResult(null)
    setAiError(null)
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
    if (!confirmingAgent || !pendingAgentSelection || !aiResult) return

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

    setAiResult((prev: any) => {
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
    // 선택 팝업 닫으면 업로드 화면(이미지 노출)으로 복귀, 검증 결과 화면은 표시하지 않음
    setAiResult(null)
    setSelectedAgents({})
    setAgentAddresses({})
    setMode('upload')
  }

  // agent_number 정규화 헬퍼 (공백만 제거, 원본 최대 보존)
  const normalizeAgentNum = (raw: any): string => {
    const result = typeof raw === 'string' ? raw.trim() : String(raw || '').trim()
    if (!result) return ''
    // 등록번호는 한글+숫자+하이픈 등 다양한 형식이 있으므로 공백만 제거
    const normalized = result.replace(/\s+/g, '').trim()
    if (result && result !== normalized) {
      console.log(`[normalizeAgentNum] 정규화: "${result}" → "${normalized}"`)
    }
    return normalized
  }

  // 단일 agent_number 반환 (기존 호환 - 배열이면 첫 번째 반환)
  const getContractAgentNumber = (contract: any): string => {
    const numbers = getContractAgentNumbers(contract)
    return numbers[0] || ''
  }

  // 배열로 agent_number(들) 반환 - 공동중개 지원
  const getContractAgentNumbers = (contract: any): string[] => {
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

    // 배열인 경우: 공동중개 (AI 분석에서 배열로 전달)
    if (Array.isArray(raw)) {
      const normalized = raw
        .map((item: any) => normalizeAgentNum(item))
        .filter((n: string) => n.length > 0)
      console.log(`[getContractAgentNumbers] 배열 입력 (공동중개): ${normalized.length}개`, normalized)
      return normalized
    }

    // 단일 문자열인 경우
    const single = normalizeAgentNum(raw)
    console.log(`[getContractAgentNumbers] 단일 입력: "${single}"`)
    return single ? [single] : []
  }

  const getContractAgentName = (contract: any) => {
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


  // 등록번호 정규화 (공백 + 하이픈 모두 제거)
  const stripAgentNumber = (num: string) => num.replace(/[\s\-]/g, '')

  // 등록번호 조회 — DB에서 replace(replace(agent_number,'-',''),' ','') 로 비교
  const fetchExactAgent = async (agentNumber: string) => {
    const trimmedNumber = agentNumber.trim()
    console.log(`[클라이언트] agent_master RPC 조회: "${trimmedNumber}"`)
    
    try {
      const { data, error } = await supabase
        .rpc('search_agent_by_number', { input_number: trimmedNumber })

      if (error) {
        console.error('[클라이언트] ❌ RPC 오류:', error.message)
        return null
      }

      if (data && data.length > 0) {
        console.log(`[클라이언트] ✅ 매칭 성공:`, data[0].agent_name, `(DB: "${data[0].agent_number}")`)
        return data[0]
      }

      console.log(`[클라이언트] ⚠️ 조회 실패 (DB에 '${trimmedNumber}' 없음)`)
      return null
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
      showError('이미지 파일만 업로드 가능합니다.')
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
          showError('HEIC 이미지를 변환할 수 없습니다.\nJPEG 또는 PNG 파일로 다시 시도해주세요.')
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
      showError('이미지 처리 중 오류가 발생했습니다.\n다시 시도해주세요.')
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
      showWarning('카메라 접근 권한이 필요합니다.')
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
      showError('파일을 찾을 수 없습니다.')
      return
    }

    setIsLoading(true)
    setOcrError(null)
    setAiError(null)
    setAiResult(null)
    setStampResult(null)
    setCropResult(null)
    // 이전 업로드 데이터 초기화 (stale data 방지)
    setSelectedAgents({})
    setAgentAddresses({})
    setPendingAgentSelection(null)
    setShowAgentSelection(false)
    setShowConfirmSelection(false)
    setConfirmingAgent(null)

    let stampPromise: Promise<void> = Promise.resolve()

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

      // ── 도장 검증 (OCR과 병렬 실행) ──
      const stampFormData = new FormData()
      stampFormData.append('file', fileToUpload, fileToUpload.name)
      setIsStampVerifying(true)
      stampPromise = fetch('/api/verify-stamp', {
        method: 'POST',
        body: stampFormData,
      })
        .then(async (res) => {
          if (res.ok) {
            const stampData = await res.json()
            console.log('[도장 검증] 결과:', stampData)
            if (stampData.success) {
              setStampResult({
                agent_stamp: stampData.agent_stamp,
                agent_stamp_confidence: stampData.agent_stamp_confidence,
              })
            }
          } else {
            console.warn('[도장 검증] API 오류:', res.status)
          }
        })
        .catch((err) => {
          console.warn('[도장 검증] 호출 실패 (리뷰 등록에는 영향 없음):', err.message)
        })
        .finally(() => {
          setIsStampVerifying(false)
        })

      // ── 이미지 크롭은 OCR 결과 수신 후 실행 (아래 참조) ──

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

      // ── 이미지 base64 미리 읽어두기 (AI 분석 완료 후 crop API 호출에 사용) ──
      // Vercel 페이로드 제한(4.5MB)을 초과하지 않도록 Canvas로 리사이즈 후 압축
      let imageBase64ForCrop: string | null = null
      try {
        const MAX_DIMENSION = 2000
        const TARGET_QUALITY = 0.7
        const MAX_BASE64_SIZE = 3 * 1024 * 1024 // 3MB (base64 기준, 안전 마진 확보)

        const compressImage = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const img = new Image()
            const url = URL.createObjectURL(file)
            img.onload = () => {
              URL.revokeObjectURL(url)
              let { width, height } = img

              // 긴 변 기준 리사이즈
              if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
                width = Math.round(width * ratio)
                height = Math.round(height * ratio)
              }

              const canvas = document.createElement('canvas')
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              if (!ctx) { reject(new Error('Canvas 컨텍스트 실패')); return }
              ctx.drawImage(img, 0, 0, width, height)

              let quality = TARGET_QUALITY
              let base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1]

              // 아직 크면 품질을 더 낮춤
              while (base64.length > MAX_BASE64_SIZE && quality > 0.3) {
                quality -= 0.1
                base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1]
              }

              console.log(`[이미지 크롭] 압축 완료: ${(base64.length / 1024).toFixed(0)}KB (${width}x${height}, q=${quality.toFixed(1)})`)
              resolve(base64)
            }
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')) }
            img.src = url
          })
        }

        imageBase64ForCrop = await compressImage(fileToUpload)
        console.log('[이미지 크롭] base64 준비 완료')
      } catch (cropErr) {
        console.warn('[이미지 크롭] base64 준비 실패:', cropErr)
      }

      // OCR이 끝났지만 AI 분석 요청이 완료될 때까지 로딩 유지
      
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
      
      // Gemini AI로 계약서 분석
      if (ocrText) {
        try {
          // ── OCR 텍스트 정규화 (불필요한 제어 문자 제거) ──
          const sanitizedOcrText = ocrText
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 제어 문자 제거
            .trim()

          console.log('[AI분석] 전송할 텍스트 길이:', sanitizedOcrText.length)
          console.log('[AI분석] 텍스트 앞 50자:', sanitizedOcrText.substring(0, 50))

          // AI 분석 요청 타임아웃 (45초)
          const aiController = new AbortController()
          const aiTimeoutId = window.setTimeout(() => aiController.abort(), 45_000)

          const aiResponse = await fetch('/api/analyze-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sanitizedOcrText }),
            signal: aiController.signal,
          }).finally(() => window.clearTimeout(aiTimeoutId))

          if (!aiResponse.ok) {
            let errorText = ''
            try {
              errorText = await aiResponse.text()
            } catch { /* ignore */ }
            console.error('[AI분석] API 호출 실패:', aiResponse.status, errorText.substring(0, 200))
            setAiError(`계약서 분석 실패: ${aiResponse.status}`)
            await stampPromise
            setMode('result')
            setIsLoading(false)
          } else {
            let aiData: any
            try {
              aiData = await aiResponse.json()
            } catch (parseError) {
              console.error('[AI분석] JSON 파싱 실패:', parseError)
              setAiError('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.')
              await stampPromise
              setMode('result')
              setIsLoading(false)
              return
            }

            // 에러 응답 처리
            if (aiData.error) {
              console.error('[AI분석] 서버 오류:', aiData.error)
              setAiError(`계약서 분석 실패: ${aiData.error}`)
              await stampPromise
              setMode('result')
              setIsLoading(false)
              return
            }

            console.log('====== AI 분석 응답 받음 ======')
            console.log('[AI분석] 응답 전체:', JSON.stringify(aiData, null, 2))

            // Gemini 응답은 이미 파싱된 JSON 객체
            const unwrappedData = aiData
            
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
                console.log(`[AI분석] 계약서[${idx}] agent 필드 상세:`, {
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
              console.warn('[AI분석] 유효한 계약서 없음. 원본 데이터 키:', 
                unwrappedData ? (Array.isArray(unwrappedData) 
                  ? unwrappedData.map((d: any) => Object.keys(d || {})) 
                  : Object.keys(unwrappedData)) 
                : 'null'
              )
            }
            
            if (!validContracts || (Array.isArray(validContracts) && validContracts.length === 0)) {
              setAiError('계약서가 아닌 문서입니다. 부동산 계약서를 다시 올려주세요.')
              setAiResult(null)
              await stampPromise
              setMode('result')
              setIsLoading(false)
            } else {
              setAiResult(validContracts)
              trackOcrSuccess(Array.isArray(validContracts) ? validContracts.length : 1)

              // ── 이미지 크롭 + 암호화 (AI 분석의 contract_type 전달) ──
              if (imageBase64ForCrop) {
                const firstContract = Array.isArray(validContracts) ? validContracts[0] : validContracts
                const contractType = firstContract?.contract_type || firstContract?.contractType || undefined
                console.log('[이미지 크롭] contract_type:', contractType)

                fetch('/api/crop-contract', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    imageBase64: imageBase64ForCrop,
                    ocrResult: data,
                    contractType,
                  }),
                })
                  .then(async (res) => {
                    if (res.ok) {
                      const cropData = await res.json()
                      console.log('[이미지 크롭] 결과:', { cropped: cropData.cropped, matchedKeyword: cropData.matchedKeyword, croppedSize: cropData.croppedSize })
                      if (cropData.success) {
                        setCropResult({ encrypted: cropData.encrypted, iv: cropData.iv })
                      }
                    } else {
                      console.warn('[이미지 크롭] API 오류:', res.status)
                    }
                  })
                  .catch((err) => {
                    console.warn('[이미지 크롭] 호출 실패 (리뷰 등록에는 영향 없음):', err.message)
                  })
              }

              // 도장 검증이 아직 진행 중이면 완료될 때까지 대기
              await stampPromise

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
                  notFoundNumbers?: string[]
                }> = []
                
                // 모든 계약서에 대해 조회 수행
                for (let i = 0; i < contractsToProcess.length; i++) {
                  const contract = contractsToProcess[i]
                  const key = `${i}`
                  let found = false
                  // 배열 또는 단일 agent_number 지원
                  const contractAgentNumbers = getContractAgentNumbers(contract)
                  const contractAgentName = getContractAgentName(contract)
                  
                  console.log(`[계약서 ${i}] OCR 추출값:`, { 
                    agent_numbers: contractAgentNumbers, 
                    agent_numbers_count: contractAgentNumbers.length,
                    agent_name: contractAgentName,
                    agent_name_length: contractAgentName?.length,
                    contract_keys: Object.keys(contract || {}),
                  })

                  // agent 필드가 모두 비어있으면 상세 경고
                  if (contractAgentNumbers.length === 0 && !contractAgentName) {
                    console.warn(`[계약서 ${i}] ⚠️ agent_number, agent_name 모두 비어있음!`)
                    console.warn(`[계약서 ${i}] AI분석 원본 데이터:`, JSON.stringify(contract, null, 2))
                  }
                  
                  // 등록번호(agent_number)로 조회
                  if (contractAgentNumbers.length > 0) {
                    const foundAgents: Array<{ id: number; agent_number: string; agent_name: string; road_address: string; lot_address: string; representative_name?: string; matchScore?: number }> = []
                    const notFoundNumbers: string[] = []

                    // 모든 등록번호에 대해 조회
                    for (const agentNum of contractAgentNumbers) {
                      console.log(`[조회] agent_number 조회: "${agentNum}"`)
                      try {
                        const numberData = await fetchExactAgent(agentNum)
                        console.log(`[조회] 조회 결과:`, numberData)

                        if (numberData) {
                          foundAgents.push({
                            id: numberData.id,
                            agent_number: numberData.agent_number,
                            agent_name: numberData.agent_name,
                            road_address: numberData.road_address || '',
                            lot_address: numberData.lot_address || '',
                            representative_name: numberData.representative_name,
                            matchScore: 1.0,
                          })
                        } else {
                          notFoundNumbers.push(agentNum)
                          console.warn(`[조회] 등록번호 "${agentNum}"에 해당하는 중개사무소가 DB에 없습니다.`)
                        }
                      } catch (error) {
                        notFoundNumbers.push(agentNum)
                        console.error(`[조회] agent_number "${agentNum}" 조회 오류:`, error)
                      }
                    }

                    if (foundAgents.length > 0) {
                      found = true

                      if (foundAgents.length === 1 && notFoundNumbers.length === 0) {
                        // 단일 중개사, 미확인 없음 → 확인 팝업
                        console.log(`[조회] 단일 중개사 정확 일치:`, foundAgents[0].agent_name)
                        pendingSelections.push({
                          contractIndex: i,
                          agentName: foundAgents[0].agent_name,
                          agentNumber: foundAgents[0].agent_number,
                          reason: 'exact',
                          agents: foundAgents,
                        })
                      } else if (foundAgents.length === 1 && notFoundNumbers.length > 0) {
                        // 2건 중 1건만 찾음 → 확인 팝업 + 미확인 번호 안내
                        console.log(`[조회] 1건 확인, ${notFoundNumbers.length}건 미확인:`, notFoundNumbers)
                        pendingSelections.push({
                          contractIndex: i,
                          agentName: foundAgents[0].agent_name,
                          agentNumber: foundAgents[0].agent_number,
                          reason: 'exact',
                          agents: foundAgents,
                          notFoundNumbers,
                        })
                      } else {
                        // 복수 중개사 (공동중개) → 사용자 선택 필요
                        console.log(`[조회] 공동중개 ${foundAgents.length}곳 발견:`, foundAgents.map(a => a.agent_name))
                        pendingSelections.push({
                          contractIndex: i,
                          agentName: foundAgents.map(a => a.agent_name).join(' / '),
                          reason: 'multiple',
                          agents: foundAgents,
                          notFoundNumbers: notFoundNumbers.length > 0 ? notFoundNumbers : undefined,
                        })
                      }
                    }
                  } else {
                    console.warn(`[계약서 ${i}] OCR에서 등록번호를 추출하지 못했습니다.`)
                  }
                  
                  if (!found) {
                    console.warn(`[계약서 ${i}] 등록번호 기반으로 중개사무소를 찾지 못했습니다. → 검증 결과 화면에서 "확인 필요" 표시`)
                  }
                }
                
                setAgentAddresses(addresses)
                
                console.log(`[검증] 총 ${pendingSelections.length}개 계약서에 대한 선택 필요`)
                
                // 선택이 필요한 경우 첫 번째 후보부터 표시
                if (pendingSelections.length > 0) {
                  const firstSelection = pendingSelections[0]
                  
                  if (firstSelection.reason === 'exact' && firstSelection.agents.length === 1) {
                    // 단일 중개사 정확 일치 → 확인 팝업
                    console.log(`[검증] ✅ 단일 중개사 정확 일치 → 확인 팝업`)
                    console.log(`[검증] 중개사: ${firstSelection.agents[0].agent_name} (${firstSelection.agents[0].agent_number})`)
                    setConfirmingAgent({
                      agent: firstSelection.agents[0],
                      contractIndex: firstSelection.contractIndex
                    })
                    setPendingAgentSelection(firstSelection)
                    setShowConfirmSelection(true)
                  } else if (firstSelection.reason === 'multiple' || firstSelection.agents.length > 1) {
                    // 공동중개 또는 복수 후보 → 선택 팝업
                    console.log(`[검증] 🏢 공동중개 ${firstSelection.agents.length}곳 → 선택 팝업 표시`)
                    setPendingAgentSelection(firstSelection)
                    setShowAgentSelection(true)
                  } else {
                    // 기타 → 선택 팝업
                    console.log(`[검증] 기타 → 선택 팝업 표시`)
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
        } catch (analyzeError) {
          console.error('[AI분석] 계약서 분석 중 오류:', analyzeError)
          if (analyzeError instanceof Error && analyzeError.message.includes('did not match')) {
            console.error('[AI분석] 패턴 불일치 에러! OCR 텍스트 앞 50자:', ocrText?.substring(0, 50))
            console.error('[AI분석] OCR 텍스트 길이:', ocrText?.length)
            console.error('[AI분석] 파일 정보:', { name: fileToUpload.name, type: fileToUpload.type, size: fileToUpload.size })
          }
          setAiError(
            analyzeError instanceof DOMException && analyzeError.name === 'AbortError'
              ? '검증 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
              : analyzeError instanceof Error
                ? analyzeError.message
                : '계약서 분석 중 오류가 발생했습니다.'
          )
          await stampPromise
          setMode('result')
          setIsLoading(false)
        }
      } else {
        console.warn('OCR 결과에서 텍스트를 추출할 수 없습니다:', data)
        setAiError('부동산 계약서를 다시 올려주세요.')
        await stampPromise
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
      // 도장 검증이 진행 중이면 완료 대기 (에러 무시)
      await stampPromise.catch(() => {})
      setMode('result')
      const errMsg = error instanceof DOMException && error.name === 'AbortError'
        ? 'OCR 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
        : error instanceof Error
          ? error.message
          : 'OCR 처리 중 오류가 발생했습니다.'
      setOcrError(errMsg)
      trackOcrFail(errMsg)
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
      showWarning('로그인이 필요합니다.')
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
        showWarning(`하루에 최대 ${dailyLimit}건의 리뷰만 등록할 수 있습니다.\n내일 다시 시도해주세요.`)
        return
      }

      // 2. 월간 작성 수 조회
      const { count: monthlyCount, error: monthlyError } = await supabase
        .from('agent_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('supabase_user_id', authUser.id)
        .gte('created_at', startOfMonth)

      if (!monthlyError && (monthlyCount || 0) >= monthlyLimit) {
        showWarning(`한 달에 최대 ${monthlyLimit}건의 리뷰만 등록할 수 있습니다.\n다음 달에 다시 시도해주세요.`)
        return
      }

      // 3. 유저 전체 작성 수 조회
      const { count: totalCount, error: totalError } = await supabase
        .from('agent_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('supabase_user_id', authUser.id)

      if (!totalError && (totalCount || 0) >= userLimit) {
        showWarning(`계정당 최대 ${userLimit}건의 리뷰만 등록할 수 있습니다.`)
        return
      }

      // 4. 계약일자 + 거래태그 중복 제한 체크
      const selectedTagName = transactionTags[0] || null
      const contractData4Check = primaryContract
      const contractDate4Check = contractData4Check?.contract_date || null

      if (contractDate4Check) {
        // 동일 계약일자에 1건만 허용 (거래태그 무관)
        const { count: contractDateCount, error: contractDateError } = await supabase
          .from('agent_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('supabase_user_id', authUser.id)
          .eq('contract_date', contractDate4Check)

        if (!contractDateError && (contractDateCount || 0) >= 1) {
          showWarning(`동일한 계약일자(${contractDate4Check})에는\n리뷰를 1건만 등록할 수 있습니다.`, { title: '등록 불가' })
          return
        }
      }

      const reviewLength = reviewText.trim().length
      if (reviewLength < 20) {
        showWarning('상세 리뷰는 20자 이상 작성해주세요.')
        return
      }

      // 거래 태그 필수 체크
      if (transactionTags.length === 0) {
        showWarning('거래 태그를 선택해주세요.')
        return
      }

      // 칭찬 태그 또는 아쉬움 태그 필수 체크 (최소 1개)
      if (praiseTags.length === 0 && regretTags.length === 0) {
        showWarning('칭찬 태그 또는 아쉬움 태그 중 최소 1개를 선택해주세요.')
        return
      }

      // 상세 평가 필수 체크
      const requiredEvaluations = activeDetailEvaluations.map(e => e.code_value)
      const missingEvaluations = requiredEvaluations.filter(code => {
        const rating = reviewRatings[code]
        return !rating || rating === 0
      })

      if (missingEvaluations.length > 0) {
        const missingNames = missingEvaluations
          .map(code => activeDetailEvaluations.find(e => e.code_value === code)?.code_name)
          .filter(Boolean)
          .join(', ')
        showWarning(`모든 상세 평가 항목을 선택해주세요.\n미선택 항목: ${missingNames}`)
        return
      }

      const selectedKeys = Object.keys(selectedAgents)
      if (selectedKeys.length === 0) {
        showWarning('중개사무소 확인이 필요합니다.\n후보 중 하나를 선택해주세요.')
        return
      }

      const reviewIndex = primaryReviewIndex
      const selectedAgent = selectedAgents[String(reviewIndex)]

      if (!selectedAgent?.agent_id) {
        showError('중개사무소 정보가 없습니다.\n다시 확인해주세요.')
        return
      }

      const contractData = primaryContract

      // DB 컬럼명 → 키워드 매핑 (code_value 또는 code_name에서 매칭)
      const COLUMN_KEYWORD_MAP: Record<string, string[]> = {
        fee_satisfaction: ['FEE_SATISFACTION', 'FEE', '수수료', '중개보수', '비용'],
        expertise: ['EXPERTISE', 'EXPERT', '전문', '지식', '역량'],
        kindness: ['KINDNESS', 'KIND', '친절', '태도', '응대', '매너'],
        property_reliability: ['PROPERTY_RELIABILITY', 'PROPERTY', 'RELIABILITY', '매물', '신뢰', '정확'],
        response_speed: ['RESPONSE_SPEED', 'RESPONSE', 'COMMUNICATION', 'SPEED', '응답', '속도', '연락', '소통'],
      }

      // code_value 또는 code_name으로 평가 점수 찾기
      const getRatingByKeywords = (keywords: string[]): number | null => {
        // 1차: code_value 직접 매칭
        for (const keyword of keywords) {
          const value = reviewRatings[keyword]
          if (typeof value === 'number' && value > 0) {
            console.log(`[리뷰 저장] ${keyword} 점수 찾음 (code_value 직접): ${value}`)
            return value
          }
        }
        
        // 2차: code_value 부분 매칭 또는 code_name 키워드 매칭
        for (const keyword of keywords) {
          const evaluation = activeDetailEvaluations.find(e => 
            e.code_name.includes(keyword) || 
            e.code_value.toUpperCase().includes(keyword.toUpperCase())
          )
          if (evaluation) {
            const value = reviewRatings[evaluation.code_value]
            if (typeof value === 'number' && value > 0) {
              console.log(`[리뷰 저장] ${keyword} 점수 찾음 (code_name 매칭 → ${evaluation.code_value}): ${value}`)
              return value
            }
          }
        }
        
        console.log(`[리뷰 저장] ${keywords.join(', ')} 점수 없음`)
        return null
      }

      console.log(`[리뷰 저장] 평가 점수 확인:`, JSON.stringify(reviewRatings))
      console.log(`[리뷰 저장] 상세 평가 항목:`, activeDetailEvaluations.map(e => ({ code_value: e.code_value, code_name: e.code_name })))

      // 키워드 매핑으로 각 DB 컬럼에 대응하는 점수 찾기
      const mappedRatings: Record<string, number | null> = {}
      const usedCodeValues = new Set<string>()

      for (const [column, keywords] of Object.entries(COLUMN_KEYWORD_MAP)) {
        const rating = getRatingByKeywords(keywords)
        mappedRatings[column] = rating
        if (rating !== null) {
          // 매칭된 code_value 기록 (중복 방지)
          for (const keyword of keywords) {
            if (reviewRatings[keyword]) { usedCodeValues.add(keyword); break }
            const ev = activeDetailEvaluations.find(e =>
              e.code_name.includes(keyword) || e.code_value.toUpperCase().includes(keyword.toUpperCase())
            )
            if (ev && reviewRatings[ev.code_value]) { usedCodeValues.add(ev.code_value); break }
          }
        }
      }

      // 3차 폴백: 매핑되지 않은 평점이 있으면 남은 reviewRatings 값을 순서대로 채움
      const nullColumns = Object.entries(mappedRatings)
        .filter(([, v]) => v === null)
        .map(([k]) => k)
      
      if (nullColumns.length > 0) {
        const unmappedRatings = activeDetailEvaluations
          .filter(e => !usedCodeValues.has(e.code_value))
          .map(e => ({ code_value: e.code_value, rating: reviewRatings[e.code_value] }))
          .filter(r => typeof r.rating === 'number' && r.rating > 0)

        console.log(`[리뷰 저장] 미매핑 컬럼 ${nullColumns.length}개, 남은 평점 ${unmappedRatings.length}개 → 순서 폴백`)

        for (let i = 0; i < nullColumns.length && i < unmappedRatings.length; i++) {
          mappedRatings[nullColumns[i]] = unmappedRatings[i].rating
          console.log(`[리뷰 저장] 폴백: ${nullColumns[i]} ← ${unmappedRatings[i].code_value} = ${unmappedRatings[i].rating}`)
        }
      }

      // 최종 확인: 모든 평점이 null이면 전체 평균으로 채움
      const allNull = Object.values(mappedRatings).every(v => v === null)
      if (allNull && Object.keys(reviewRatings).length > 0) {
        const allRatings = Object.values(reviewRatings).filter(v => typeof v === 'number' && v > 0) as number[]
        if (allRatings.length > 0) {
          const avgRating = Math.round((allRatings.reduce((s, r) => s + r, 0) / allRatings.length) * 10) / 10
          console.log(`[리뷰 저장] 모든 매핑 실패 → 전체 평균 ${avgRating}로 채움`)
          for (const col of Object.keys(mappedRatings)) {
            mappedRatings[col] = avgRating
          }
        }
      }

      console.log(`[리뷰 저장] 최종 매핑 결과:`, mappedRatings)

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
          fee_satisfaction: mappedRatings.fee_satisfaction,
          expertise: mappedRatings.expertise,
          kindness: mappedRatings.kindness,
          property_reliability: mappedRatings.property_reliability,
          response_speed: mappedRatings.response_speed,
          review_text: reviewText || null,
          contract_date: contractData?.contract_date || null,
          agent_stamp: stampResult?.agent_stamp ?? null,
          agent_stamp_confidence: stampResult?.agent_stamp_confidence ?? null,
          contract_image_encrypted: cropResult?.encrypted ?? null,
          contract_image_iv: cropResult?.iv ?? null,
        })

      if (error) {
        console.error('리뷰 저장 실패:', error)
        showError(`리뷰 저장에 실패했습니다: ${error.message}`)
        return
      }

      // 리뷰 저장 성공 시 포인트 지급 (100자 이상 상세 리뷰: 2,000P / 일반: 기본 정책)
      const isDetailReview = reviewText.trim().length >= 100
      const pointType = isDetailReview ? 'REVIEW_DETAIL' : 'REVIEW'
      const pointDesc = isDetailReview ? '상세 리뷰 작성 완료 (100자 이상)' : '리뷰 작성 완료'
      console.log(`[리뷰 저장] 성공, 포인트 지급 시작 (${pointType}, ${reviewText.trim().length}자)`)

      try {
        const { data: pointResult, error: pointError } = await supabase.rpc('award_points', {
          p_user_id: authUser.id,
          p_transaction_type: pointType,
          p_description: pointDesc,
        })

        if (pointError) {
          console.error('[포인트 지급] 실패:', pointError)
        } else {
          console.log('[포인트 지급] 성공:', pointResult)
        }
      } catch (pointErr) {
        console.error('[포인트 지급] 오류:', pointErr)
      }

      if (reviewAgentName && reviewAgentName !== '-') {
        window.dispatchEvent(new CustomEvent('review:saved', { detail: { query: reviewAgentName } }))
      }

      // 폭죽 효과 + 화면 잠금 (1.5초)
      setIsConfettiLocked(true)
      fireConfetti()
      setTimeout(() => {
        setIsConfettiLocked(false)
        setShowThankYouModal(true)
      }, 1500)
    } catch (error) {
      console.error('리뷰 저장 오류:', error)
      showError('리뷰 저장 중 오류가 발생했습니다.')
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
  const allEvaluationsSelected = activeDetailEvaluations.every(evaluation => {
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
  const primaryContract = Array.isArray(aiResult)
    ? (aiResult[primaryReviewIndex] || aiResult[0])
    : aiResult
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
                  <strong style={{ color: '#b45309' }}>민감한 정보는 가리고 업로드해 주세요.<br />(주소, 전화번호, 주민등록번호 등)</strong><br />
                  
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
                      💡 <b>개인정보 등 민감한 정보는 가리고 업로드해 주세요.</b>
                    </div>
                    <div style={{ fontSize: '12px', color: '#92400e', marginTop: '8px', lineHeight: '1.5' }}>
                      🔒 공인중개사 정보 확인 후 계약서 원본 이미지는 즉시 삭제되며, 서버에 저장되지 않습니다.
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
                  ) : aiError ? (
                    <div className={styles.errorContainer}>
                      <h3>검증 오류</h3>
                      <p>{aiError}</p>
                      <button
                        className={styles.submitButton}
                        onClick={() => setMode('upload')}
                      >
                        다시 시도
                      </button>
                    </div>
                  ) : aiResult ? (
                    <div className={styles.resultContainer}>
                      <h3>검증 결과</h3>
                      <div className={styles.contractInfo}>
                        {Array.isArray(aiResult) && aiResult.length > 0 ? (
                          aiResult.map((contract: any, index: number) => (
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
                                  {/* 도장 검증 결과 */}
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>중개사 도장:</span>
                                    {isStampVerifying ? (
                                      <span className={styles.fieldValue} style={{ color: '#64748b' }}>검증 중...</span>
                                    ) : stampResult ? (
                                      <span className={styles.fieldValue} style={{
                                        color: stampResult.agent_stamp ? '#16a34a' : '#ef4444',
                                        fontWeight: 600,
                                      }}>
                                        {stampResult.agent_stamp ? '확인됨' : '미확인'}
                                        <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '6px', fontSize: '12px' }}>
                                          (신뢰도 {stampResult.agent_stamp_confidence}%)
                                        </span>
                                      </span>
                                    ) : (
                                      <span className={styles.fieldValue} style={{ color: '#94a3b8' }}>검증 불가</span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>중개사무소:</span>
                                    <span className={styles.fieldValue} style={{ color: '#ef4444', fontWeight: 600 }}>
                                      정보 없음
                                    </span>
                                  </div>
                                  {(() => {
                                    const nums = getContractAgentNumbers(contract)
                                    return nums.length > 0 ? (
                                      <>
                                        <div className={styles.contractField} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                          <span className={styles.fieldLabel}>등록번호:</span>
                                          <span className={styles.fieldValue} style={{ color: '#475569' }}>
                                            <strong>{nums.join(', ')}</strong>
                                            <span style={{ color: '#64748b', fontSize: '11px' }}>(으)로 인식되었습니다.</span>
                                          </span>
                                        </div>
                                        <div style={{ marginTop: '4px', fontSize: '12px' }}>
                                          <a
                                            href="https://www.vworld.kr/dtld/broker/dtld_list_s001.do"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#7C3AED', fontWeight: 600, textDecoration: 'underline' }}
                                          >
                                            부동산 중개업소 조회 (공간정보 오픈플랫폼)
                                          </a>
                                        </div>
                                      </>
                                    ) : null
                                  })()}
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '10px 12px',
                                    background: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: '#92400e',
                                    lineHeight: '1.8',
                                  }}>
                                    <div>📸 사진이 흔들리거나 어둡나요? (빛 반사 주의)</div>
                                    <div>📄 계약서 전체가 다 보이나요? (중개사 인감/직인 포함)</div>
                                    <div>🔍 폐업한 중개소인가요? (최신 정보가 아닐 수 있음)</div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        ) : aiResult && typeof aiResult === 'object' ? (
                          <div className={styles.contractCard}>
                            <div className={styles.contractField}>
                              <span className={styles.fieldLabel}>계약일자:</span>
                              <span className={styles.fieldValue}>{aiResult.contract_date || '-'}</span>
                            </div>
                            {selectedAgents['0'] ? (
                              <>
                                <div className={styles.contractField}>
                                  <span className={styles.fieldLabel}>중개사무소명:</span>
                                  <span className={styles.fieldValue}>{selectedAgents['0'].agent_name}</span>
                                </div>
                                {selectedAgents['0'].representative_name && (
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>대표자명:</span>
                                    <span className={styles.fieldValue}>{selectedAgents['0'].representative_name}</span>
                                  </div>
                                )}
                                <div className={styles.contractField}>
                                  <span className={styles.fieldLabel}>등록번호:</span>
                                  <span className={styles.fieldValue}>{selectedAgents['0'].agent_number}</span>
                                </div>
                                <div className={styles.contractField}>
                                  <span className={styles.fieldLabel}>주소(도로명):</span>
                                  <span className={styles.fieldValue}>{selectedAgents['0'].road_address}</span>
                                </div>
                                <div className={styles.contractField}>
                                  <span className={styles.fieldLabel}>주소(지번):</span>
                                  <span className={styles.fieldValue}>{selectedAgents['0'].lot_address || '-'}</span>
                                </div>
                                <div className={styles.contractField}>
                                  <span className={styles.fieldLabel}>중개사 도장:</span>
                                  {isStampVerifying ? (
                                    <span className={styles.fieldValue} style={{ color: '#64748b' }}>검증 중...</span>
                                  ) : stampResult ? (
                                    <span className={styles.fieldValue} style={{
                                      color: stampResult.agent_stamp ? '#16a34a' : '#ef4444',
                                      fontWeight: 600,
                                    }}>
                                      {stampResult.agent_stamp ? '확인됨' : '미확인'}
                                      <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '6px', fontSize: '12px' }}>
                                        (신뢰도 {stampResult.agent_stamp_confidence}%)
                                      </span>
                                    </span>
                                  ) : (
                                    <span className={styles.fieldValue} style={{ color: '#94a3b8' }}>검증 불가</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={styles.contractField}>
                                  <span className={styles.fieldLabel}>중개사무소:</span>
                                  <span className={styles.fieldValue} style={{ color: '#ef4444', fontWeight: 600 }}>
                                    정보 없음
                                  </span>
                                </div>
                                {(() => {
                                  const nums = getContractAgentNumbers(aiResult)
                                  return nums.length > 0 ? (
                                    <>
                                      <div className={styles.contractField} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                        <span className={styles.fieldLabel}>등록번호:</span>
                                        <span className={styles.fieldValue} style={{ color: '#475569' }}>
                                          <strong>{nums.join(', ')}</strong>
                                          <span style={{ color: '#64748b', fontSize: '11px' }}>(으)로 인식되었습니다.</span>
                                        </span>
                                      </div>
                                      <div style={{ marginTop: '4px', fontSize: '12px' }}>
                                        <a
                                          href="https://www.vworld.kr/dtld/broker/dtld_list_s001.do"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: '#7C3AED', fontWeight: 600, textDecoration: 'underline' }}
                                        >
                                          부동산 중개업소 조회 (공간정보 오픈플랫폼)
                                        </a>
                                      </div>
                                    </>
                                  ) : null
                                })()}
                                <div style={{
                                  marginTop: '8px',
                                  padding: '10px 12px',
                                  background: '#fffbeb',
                                  border: '1px solid #fde68a',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  color: '#92400e',
                                  lineHeight: '1.8',
                                }}>
                                  <div>📸 사진이 흔들리거나 어둡나요? (빛 반사 주의)</div>
                                  <div>📄 계약서 전체가 다 보이나요? (중개사 인감/직인 포함)</div>
                                  <div>🔍 폐업한 중개소인가요? (최신 정보가 아닐 수 있음)</div>
                                </div>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div className={styles.resultControls}>
                        <button
                          className={styles.cancelButton}
                          onClick={handleCancel}
                        >
                          뒤로
                        </button>
                        {hasSelectedAgent && (
                          <button
                            className={styles.submitButton}
                            onClick={() => setMode('review')}
                          >
                            리뷰 작성
                          </button>
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
                              const isDeselecting = transactionTags.includes(tag.code_name)
                              if (isDeselecting) {
                                setTransactionTags([])
                              } else {
                                setTransactionTags([tag.code_name])
                              }
                              // 거래 태그 변경 시 상세 평가 별점 초기화
                              setReviewRatings({})
                              setHoverRatings({})
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
                      {activeDetailEvaluations.length === 0 ? (
                        <div className={styles.ratingEmpty}>상세 평가 항목이 없습니다.</div>
                      ) : (
                        activeDetailEvaluations.map((item) => {
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
                    <div className={styles.reviewBonusTip}>
                      <span className={styles.reviewBonusIcon}>💰</span>
                      <span className={reviewCharCount >= 100 ? styles.reviewBonusTextActive : styles.reviewBonusText}>
                        리뷰 100자 이상 작성 시 포인트 2배 지급 (2,000Point)
                      </span>
                      {reviewCharCount >= 100 && <span className={styles.reviewBonusCheck}>✅</span>}
                    </div>
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
                    공동중개 계약서입니다.<br />
                    <strong>거래하신 중개사무소</strong>를 선택해주세요.
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
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {pendingAgentSelection.notFoundNumbers && pendingAgentSelection.notFoundNumbers.length > 0 && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginTop: '12px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: '#92400e',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠️ 미확인 등록번호</div>
                  {pendingAgentSelection.notFoundNumbers.map((num, idx) => (
                    <div key={idx} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{num}</div>
                  ))}
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#78350f' }}>
                    폐업했거나 OCR 분석이 정확하지 않을 수 있습니다.
                  </div>
                </div>
              )}
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
              {pendingAgentSelection?.notFoundNumbers && pendingAgentSelection.notFoundNumbers.length > 0 && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginTop: '8px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: '#92400e',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠️ 미확인 등록번호</div>
                  {pendingAgentSelection.notFoundNumbers.map((num, idx) => (
                    <div key={idx} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{num}</div>
                  ))}
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#78350f' }}>
                    폐업했거나 OCR 분석이 정확하지 않을 수 있습니다.
                  </div>
                </div>
              )}
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

      {/* 폭죽 효과 중 화면 잠금 오버레이 */}
      {isConfettiLocked && (
        <div className={styles.confettiLock} />
      )}
    </>
  )
}

