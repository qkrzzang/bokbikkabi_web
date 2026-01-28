'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CameraButton.module.css'
import { supabase } from '@/lib/supabase/client'
import { encryptFile, encryptedDataToBlob } from '@/lib/encryption'

export default function CameraButton() {
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
    
    // 로그인 상태 확인
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (isMounted) {
          setIsLoggedIn(!!session)
        }
      } catch (error) {
        // 모든 오류 조용히 처리
      }
    }
    
    checkSession()
    
    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsLoggedIn(!!session)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
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

      const activeData = (data || []).filter((item) => item.use_yn !== 'N')
      setTransactionTagOptions(activeData.filter((item) => item.code_group === 'TRANSACTION_TYPE'))
      setPraiseTagOptions(activeData.filter((item) => item.code_group === 'PRAISE_TAG'))
      setRegretTagOptions(activeData.filter((item) => item.code_group === 'REGRET_TAG'))
      setDetailEvaluations(activeData.filter((item) => item.code_group === 'DETAIL_EVALUATION'))
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
    const raw =
      contract?.agent_number ??
      contract?.agentNumber ??
      contract?.agent_no ??
      contract?.agentNo ??
      contract?.registration_number ??
      contract?.registrationNumber ??
      ''
    return typeof raw === 'string' ? raw.trim() : String(raw || '').trim()
  }

  const getContractAgentName = (contract: any) => {
    const raw =
      contract?.agent_name ??
      contract?.agentName ??
      contract?.office_name ??
      contract?.officeName ??
      ''
    return typeof raw === 'string' ? raw.trim() : String(raw || '').trim()
  }

  const getContractAgentAddress = (contract: any) => {
    const raw =
      contract?.agent_address ??
      contract?.agentAddress ??
      contract?.address ??
      contract?.road_address ??
      contract?.roadAddress ??
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
    console.log(`[클라이언트] agent_master 테이블 정확 조회: "${agentNumber}"`)
    console.log(`[클라이언트] 조회 쿼리:`, {
      table: 'agent_master',
      condition: `agent_number = '${agentNumber}'`
    })
    
    try {
      const { data, error } = await supabase
        .from('agent_master')
        .select('id, agent_number, agent_name, road_address, lot_address, representative_name')
        .eq('agent_number', agentNumber)
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
      console.error('[클라이언트] ❌ 예외 발생:', error)
      return null
    }
  }

  // 유사도 검색
  const fetchByNameAndNumber = async (agentName?: string, agentNumber?: string) => {
    if (!agentName && !agentNumber) {
      console.log(`[클라이언트] ⚠️ 유사도 검색 건너뜀 (검색 조건 없음)`)
      return []
    }
    
    console.log(`[클라이언트] agent_master 테이블 유사도 검색 시작`)
    console.log(`[클라이언트] 검색 조건: name="${agentName}", number="${agentNumber}"`)

    const filters: string[] = []
    
    if (agentName) {
      const cleanName = agentName.replace(/(공인중개사|부동산|사무소)$/g, '').trim()
      if (cleanName.length >= 2) {
        filters.push(`agent_name.ilike.%${cleanName}%`)
        console.log(`[클라이언트] 이름 필터: %${cleanName}%`)
      }
    }
    
    if (agentNumber) {
      const normalized = normalizeAgentNumber(agentNumber)
      if (normalized.length >= 6) {
        const prefix = normalized.substring(0, 6)
        filters.push(`agent_number.ilike.%${prefix}%`)
        console.log(`[클라이언트] 번호 필터 (앞 6자리): %${prefix}%`)
      } else if (normalized.length >= 3) {
        filters.push(`agent_number.ilike.%${normalized}%`)
        console.log(`[클라이언트] 번호 필터 (전체): %${normalized}%`)
      }
    }

    if (filters.length === 0) {
      console.log(`[클라이언트] ⚠️ 유효한 필터 없음`)
      return []
    }

    console.log(`[클라이언트] 최종 필터:`, filters.join(' OR '))

    try {
      const { data, error } = await supabase
        .from('agent_master')
        .select('id, agent_number, agent_name, road_address, lot_address, representative_name')
        .or(filters.join(','))
        .limit(50)

      if (error) {
        console.error('[클라이언트] ❌ 유사도 검색 오류:', error)
        console.error('[클라이언트] 오류 상세:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        return []
      }

      console.log(`[클라이언트] ✅ 1차 DB 조회 성공: ${data?.length || 0}건`)

      if (data && data.length > 0) {
        console.log(`[클라이언트] 샘플 데이터:`, data.slice(0, 3).map(d => ({
          number: d.agent_number,
          name: d.agent_name
        })))
      }

      const scoredCandidates = (data || []).map((candidate) => ({
        ...candidate,
        matchScore: getMatchScore(candidate, agentName, agentNumber),
        road_address: candidate.road_address || '',
        lot_address: candidate.lot_address || '',
      }))
      
      const finalCandidates = scoredCandidates
        .filter(c => (c.matchScore || 0) >= 0.3)
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      
      console.log(`[클라이언트] 유사도 필터링 후 (≥0.3): ${finalCandidates.length}건`)
      
      if (finalCandidates.length > 0) {
        console.log(`[클라이언트] ✅ 상위 2건:`, finalCandidates.slice(0, 2).map(c => ({
          name: c.agent_name,
          number: c.agent_number,
          score: (c.matchScore || 0).toFixed(2)
        })))
      } else {
        console.log(`[클라이언트] ⚠️ 유사도 0.3 이상인 데이터 없음`)
      }

      return finalCandidates
    } catch (error) {
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

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setOriginalFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCapturedImage(reader.result as string)
        setMode('upload')
      }
      reader.readAsDataURL(file)
    } else {
      alert('이미지 파일만 업로드 가능합니다.')
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
        const imageData = canvas.toDataURL('image/jpeg')
        setCapturedImage(imageData)
        
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
      const formData = new FormData()
      formData.append('file', originalFile)

      // OCR 요청 타임아웃 (60초)
      const ocrController = new AbortController()
      const ocrTimeoutId = window.setTimeout(() => ocrController.abort(), 60_000)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
        signal: ocrController.signal,
      }).finally(() => window.clearTimeout(ocrTimeoutId))

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'OCR 처리 중 오류가 발생했습니다.')
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
          // n8n 요청 타임아웃 (45초)
          const n8nController = new AbortController()
          const n8nTimeoutId = window.setTimeout(() => n8nController.abort(), 45_000)

          const n8nResponse = await fetch(
            'https://qkrzzang13.app.n8n.cloud/webhook/4fc817ac-3148-46e1-8127-8960ade84ae3',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: ocrText,
                timestamp: new Date().toISOString(),
              }),
              signal: n8nController.signal,
            }
          ).finally(() => window.clearTimeout(n8nTimeoutId))

          if (!n8nResponse.ok) {
            const errorText = await n8nResponse.text()
            console.error('n8n 웹훅 전송 실패:', n8nResponse.status, errorText)
            setN8nError(`n8n 호출 실패: ${n8nResponse.status}`)
            setMode('result')
            setIsLoading(false)
          } else {
            const n8nData = await n8nResponse.json()
            console.log('====== n8n 응답 받음 ======')
            console.log('n8n 응답 전체:', JSON.stringify(n8nData, null, 2))
            
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
            
            const validContracts = filterValidContracts(n8nData)
            
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
                    agent_name: contractAgentName,
                    raw: contract 
                  })
                  
                  // 1단계: agent_number로 정확 일치 조회 (반드시 실행)
                  if (contractAgentNumber) {
                    console.log(`[1단계] agent_number 정확 일치 조회 시작: "${contractAgentNumber}"`)
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
                      topCandidates.map(c => ({ name: c.agent_name, score: c.matchScore?.toFixed(2) }))
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
          console.error('n8n 웹훅 전송 중 오류:', n8nError)
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
      console.error('OCR 오류:', error)
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

    try {
      setIsReviewSubmitting(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        alert('로그인이 필요합니다.')
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

      // 계약서 이미지를 암호화하여 Supabase Storage에 업로드
      let contractImageUrl: string | null = null
      if (originalFile) {
        try {
          console.log('[리뷰 저장] 계약서 암호화 시작...')
          
          // 1. 파일 암호화
          const encryptedData = await encryptFile(originalFile)
          console.log('[리뷰 저장] 암호화 완료')
          
          // 2. 암호화된 데이터를 Blob으로 변환
          const encryptedBlob = encryptedDataToBlob(encryptedData)
          
          // 3. Supabase Storage에 업로드 (암호화된 파일)
          const fileName = `${session.user.id}/${Date.now()}.encrypted`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('contracts')
            .upload(fileName, encryptedBlob, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'text/plain'
            })

          if (uploadError) {
            console.error('[리뷰 저장] 계약서 업로드 실패:', uploadError)
            // 업로드 실패 시 계약서 없이 리뷰만 저장
          } else {
            // Storage 경로 저장 (publicUrl이 아닌 path 저장)
            contractImageUrl = uploadData.path
            console.log('[리뷰 저장] 암호화된 계약서 업로드 성공:', contractImageUrl)
          }
        } catch (uploadError) {
          console.error('[리뷰 저장] 계약서 업로드 중 오류:', uploadError)
          // 업로드 실패해도 리뷰는 저장
        }
      }

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
          supabase_user_id: session.user.id,
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
          contract_image_url: contractImageUrl,
        })

      if (error) {
        console.error('리뷰 저장 실패:', error)
        alert(`리뷰 저장에 실패했습니다: ${error.message}`)
        return
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
              <p className={styles.confirmMessage}>
                부동산 거래 후기를 작성하여 다른 분들에게 도움을 주세요.
              </p>
              
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
                  개인정보 보호 필수
                </div>
                <div style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
                  <strong style={{ color: '#b45309' }}>주민등록번호와 전화번호는 반드시 가려주세요.</strong><br />
                  가려진 계약서만 업로드 가능합니다.
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
                    (필수) 위조된 문서가 아님을 확인하며, <strong>주민등록번호·전화번호를 가렸음</strong>을 확인합니다. 허위 등록 시 관련 법령(<strong>사문서 위조</strong> 등)에 따른 <strong>처벌</strong>을 감수합니다.
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
                        <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2"/>
                        <path d="M12 8V12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M12 16H12.01" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      주민등록번호와 전화번호는 반드시 가려주세요
                    </div>
                    <div style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
                      가려진 계약서만 업로드 가능합니다.
                    </div>
                  </div>

                  {isMobile ? (
                    <div className={styles.selectMode}>
                      <button
                        className={styles.optionButton}
                        onClick={startCamera}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="13"
                            r="4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>카메라로 촬영</span>
                      </button>
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
                    <strong style={{ color: '#b45309' }}>⚠️ 개인정보 확인:</strong> 주민등록번호와 전화번호가 가려져 있는지 확인해주세요.
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
                      <h3>검증 결과</h3>
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
                                      중개사무소 확인 필요
                                    </span>
                                  </div>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>안내:</span>
                                    <span className={styles.fieldValue} style={{ color: '#64748b', fontSize: '13px' }}>
                                      등록된 중개사무소 정보를 찾을 수 없습니다. 계약서를 다시 확인해주세요.
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
                            <button
                              className={styles.findBySimilarityButton}
                              onClick={async () => {
                                console.log(`[유사도 찾기] 버튼 클릭 - 수동 검색 시작`)
                                if (n8nResult && Array.isArray(n8nResult) && n8nResult.length > 0) {
                                  const contract = n8nResult[0]
                                  const contractAgentNumber = getContractAgentNumber(contract)
                                  const contractAgentName = getContractAgentName(contract)
                                  
                                  console.log(`[유사도 찾기] 검색 조건: name="${contractAgentName}", number="${contractAgentNumber}"`)
                                  
                                  const candidates = await fetchByNameAndNumber(
                                    contractAgentName || undefined,
                                    contractAgentNumber || undefined
                                  )
                                  
                                  console.log(`[유사도 찾기] 검색 결과: ${candidates.length}건`)
                                  
                                  if (candidates.length > 0) {
                                    setPendingAgentSelection({
                                      contractIndex: 0,
                                      agentName: contractAgentName || '알 수 없음',
                                      agentNumber: contractAgentNumber || undefined,
                                      reason: 'fuzzy',
                                      agents: candidates.slice(0, 5)
                                    })
                                    setShowAgentSelection(true)
                                  } else {
                                    alert('유사한 중개사무소를 찾을 수 없습니다.\n\n관리자에게 문의해주세요.')
                                  }
                                }
                              }}
                            >
                              유사도로 찾기
                            </button>
                            <button
                              className={styles.contactAdminButton}
                              onClick={() => {
                                alert('중개사무소 정보를 찾을 수 없습니다.\n\n고객센터 또는 관리자에게 문의해주세요.')
                              }}
                            >
                              관리자에게 문의
                            </button>
                          </>
                        )}
                        {!hasSelectedAgent && (
                          <span className={styles.reviewNotice}>등록된 중개사무소 정보가 없습니다. 관리자에게 문의해주세요.</span>
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
                    {isReviewSubmitting && (
                      <div className={styles.reviewSaving}>
                        <span className={styles.loadingSpinner}></span>
                        저장 중...
                      </div>
                    )}
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

