'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CameraButton.module.css'
import { supabase } from '@/lib/supabase/client'

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
  const [agentAddresses, setAgentAddresses] = useState<Record<string, string>>({})
  const [selectedAgents, setSelectedAgents] = useState<Record<string, { agent_number: string; agent_name: string; road_address: string }>>({})
  const [showAgentSelection, setShowAgentSelection] = useState(false)
  const [pendingAgentSelection, setPendingAgentSelection] = useState<{
    contractIndex: number
    agentName: string
    agents: Array<{ id: number; agent_number: string; agent_name: string; road_address: string }>
  } | null>(null)
  
  // 리뷰 작성 상태
  const [transactionTags, setTransactionTags] = useState<string[]>([])
  const [praiseTags, setPraiseTags] = useState<string[]>([])
  const [regretTags, setRegretTags] = useState<string[]>([])
  const [reviewRatings, setReviewRatings] = useState({
    feeSatisfaction: 0,
    expertise: 0,
    kindness: 0,
    propertyReliability: 0,
    responseSpeed: 0
  })
  const [reviewText, setReviewText] = useState('')
  const [showThankYouModal, setShowThankYouModal] = useState(false)
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
    // 로그인 상태 확인
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    
    checkSession()
    
    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => {
      subscription.unsubscribe()
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

  // 별점에 따른 텍스트 반환 함수
  const getRatingText = (category: string, rating: number): string => {
    if (rating === 0) return ''
    
    const texts: Record<string, Record<number, string>> = {
      feeSatisfaction: {
        1: '법정 수수료보다 더 요구하거나 현금을 강요해요.',
        2: '에누리 없이 법정 상한요율(최대치)을 꽉 채워 받아요.',
        3: '깎아달라고 해서 조금 조정해 주셨어요.',
        4: '먼저 적절한 금액으로 협의해 주셨어요.',
        5: '쿨하게 할인해주셔서 최저 요율로 맞췄어요!'
      },
      expertise: {
        1: '위험한 권리 관계(융자 등)를 제대로 설명 안 해줬어요.',
        2: '제가 물어보기 전까지는 먼저 알려주지 않아요.',
        3: '계약에 필요한 기본적인 내용은 다 숙지하고 계세요.',
        4: '등기부등본과 특약 사항을 꼼꼼하게 짚어주셨어요.',
        5: '대출, 세금 문제까지 전문가처럼 상담해 주셨어요.'
      },
      kindness: {
        1: '당장 계약 안 하면 큰일 난다며 강압적으로 밀어붙여요.',
        2: '말투가 퉁명스럽고 귀찮아하는 게 느껴졌어요.',
        3: '무난하고 정중하게 대해 주셨어요.',
        4: '집 보는 내내 편안하고 친절하게 안내해 주셨어요.',
        5: '가족이 집 구하는 것처럼 정말 따뜻하게 챙겨주셨어요.'
      },
      propertyReliability: {
        1: '완전 낚였어요! 사진이랑 딴판인 허위매물이었어요.',
        2: '곰팡이나 누수 같은 하자를 미리 말 안 해줬어요.',
        3: '설명 들었던 것과 실제 집 상태가 비슷해요.',
        4: '집의 장점뿐만 아니라 단점도 솔직하게 말해줬어요.',
        5: '사진보다 실물이 훨씬 좋고 관리 상태가 완벽해요.'
      },
      responseSpeed: {
        1: '연락 두절! 계약금 넣고 나니 잠수탔어요.',
        2: '답장이 너무 늦어서 속이 터지는 줄 알았어요.',
        3: '급한 용무가 있을 때는 연락이 잘 돼요.',
        4: '문의하면 금방금방 답변을 주셔서 편했어요.',
        5: 'LTE급 속도! 주말/저녁에도 칼답장해 주셨어요.'
      }
    }
    
    return texts[category]?.[rating] || ''
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
    setReviewRatings({
      feeSatisfaction: 0,
      expertise: 0,
      kindness: 0,
      propertyReliability: 0,
      responseSpeed: 0
    })
    setReviewText('')
    setShowThankYouModal(false)
    stopCamera()
  }

  const handleAgentSelect = (selectedAgent: { id: number; agent_number: string; agent_name: string; road_address: string }) => {
    if (pendingAgentSelection && n8nResult) {
      const contract = n8nResult[pendingAgentSelection.contractIndex]
      const key = `${pendingAgentSelection.contractIndex}_${contract.agent_number || contract.agent_name}`
      
      // 선택한 중개사무소 정보 저장
      setAgentAddresses(prev => ({
        ...prev,
        [key]: selectedAgent.road_address
      }))
      
      setSelectedAgents(prev => ({
        ...prev,
        [key]: {
          agent_number: selectedAgent.agent_number,
          agent_name: selectedAgent.agent_name,
          road_address: selectedAgent.road_address
        }
      }))
      
      // 다음 대기 중인 선택이 있는지 확인
      if (Array.isArray(n8nResult)) {
        const remainingSelections: Array<{
          contractIndex: number
          agentName: string
          agents: Array<{ id: number; agent_number: string; agent_name: string; road_address: string }>
        }> = []
        
        // 아직 주소가 없는 계약서들 확인
        const checkPromises = n8nResult.map(async (contract, i) => {
          const checkKey = `${i}_${contract.agent_number || contract.agent_name}`
          if (!agentAddresses[checkKey] && contract.agent_name) {
            // 다시 조회해서 여러 개인지 확인
            const { data, error } = await supabase
              .from('agent_master')
              .select('id, agent_number, agent_name, road_address')
              .eq('agent_name', contract.agent_name)
            
            if (!error && data && data.length > 1) {
              remainingSelections.push({
                contractIndex: i,
                agentName: contract.agent_name,
                agents: data.map(agent => ({
                  id: agent.id,
                  agent_number: agent.agent_number,
                  agent_name: agent.agent_name,
                  road_address: agent.road_address || ''
                }))
              })
            }
          }
        })
        
        Promise.all(checkPromises).then(() => {
          if (remainingSelections.length > 0) {
            setPendingAgentSelection(remainingSelections[0])
          } else {
            setShowAgentSelection(false)
            setPendingAgentSelection(null)
          }
        })
      } else {
        setShowAgentSelection(false)
        setPendingAgentSelection(null)
      }
    }
  }
  
  const handleAgentSelectionCancel = () => {
    setShowAgentSelection(false)
    setPendingAgentSelection(null)
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
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
      // OCR이 끝났으면 즉시 결과 화면으로 전환 (n8n은 결과 화면에서 로딩 처리)
      setMode('result')
      setIsLoading(false)
      
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
          } else {
            const n8nData = await n8nResponse.json()
            console.log('n8n 응답 받음:', n8nData)
            
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
            } else {
              setN8nResult(validContracts)
              
              // agent_number 또는 agent_name으로 Supabase에서 road_address 조회
              const contractsToProcess = Array.isArray(validContracts) ? validContracts : [validContracts]
              
              if (contractsToProcess.length > 0) {
                const addresses: Record<string, string> = {}
                const pendingSelections: Array<{
                  contractIndex: number
                  agentName: string
                  agents: Array<{ id: number; agent_number: string; agent_name: string; road_address: string }>
                }> = []
                
                // 모든 계약서에 대해 조회 수행
                for (let i = 0; i < contractsToProcess.length; i++) {
                  const contract = contractsToProcess[i]
                  const key = `${i}_${contract.agent_number || contract.agent_name}`
                  let found = false
                  
                  if (contract.agent_number) {
                    try {
                      // 1단계: agent_number로 agent_number 일치 조회
                      const { data: numberData, error: numberError } = await supabase
                        .from('agent_master')
                        .select('agent_number, agent_name, road_address')
                        .eq('agent_number', contract.agent_number)
                        .single()
                      
                      if (!numberError && numberData) {
                        addresses[key] = numberData.road_address || ''
                        // agent_number로 조회한 경우 전체 정보 저장
                        setSelectedAgents(prev => ({
                          ...prev,
                          [key]: {
                            agent_number: numberData.agent_number,
                            agent_name: numberData.agent_name,
                            road_address: numberData.road_address || ''
                          }
                        }))
                        found = true
                      }
                    } catch (error) {
                      console.error('agent_number 조회 오류:', error)
                    }
                  }
                  
                  // 2단계: agent_number가 없거나 일치하지 않으면 agent_name으로 agent_name 일치 조회
                  if (!found && contract.agent_name) {
                    try {
                      const { data: nameData, error: nameError } = await supabase
                        .from('agent_master')
                        .select('id, agent_number, agent_name, road_address')
                        .eq('agent_name', contract.agent_name)
                      
                      if (!nameError && nameData && nameData.length > 0) {
                        if (nameData.length === 1) {
                          // 단일 결과면 자동 사용
                          addresses[key] = nameData[0].road_address || ''
                          setSelectedAgents(prev => ({
                            ...prev,
                            [key]: {
                              agent_number: nameData[0].agent_number,
                              agent_name: nameData[0].agent_name,
                              road_address: nameData[0].road_address || ''
                            }
                          }))
                        } else {
                          // 여러 개면 선택 팝업 표시
                          pendingSelections.push({
                            contractIndex: i,
                            agentName: contract.agent_name,
                            agents: nameData.map(agent => ({
                              id: agent.id,
                              agent_number: agent.agent_number,
                              agent_name: agent.agent_name,
                              road_address: agent.road_address || ''
                            }))
                          })
                        }
                      }
                    } catch (error) {
                      console.error('agent_name 조회 오류:', error)
                    }
                  }
                }
                
                setAgentAddresses(addresses)
                
                // 여러 개의 중개사무소가 있는 경우 첫 번째 것부터 선택 팝업 표시
                if (pendingSelections.length > 0) {
                  setPendingAgentSelection(pendingSelections[0])
                  setShowAgentSelection(true)
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
        }
      } else {
        console.warn('OCR 결과에서 텍스트를 추출할 수 없습니다:', data)
        setN8nError('부동산 계약서를 다시 올려주세요.')
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

  const handleCancel = async () => {
    if (mode === 'camera') {
      stopCamera()
      setMode('select')
    } else if (mode === 'result') {
      // 검증 결과에서 뒤로 버튼 클릭 시
      if (n8nResult && Array.isArray(n8nResult) && n8nResult.length > 0) {
        // 아직 선택되지 않은 중개사무소가 있는지 확인
        const pendingSelections: Array<{
          contractIndex: number
          agentName: string
          agents: Array<{ id: number; agent_number: string; agent_name: string; road_address: string }>
        }> = []
        
        for (let i = 0; i < n8nResult.length; i++) {
          const contract = n8nResult[i]
          const key = `${i}_${contract.agent_number || contract.agent_name}`
          
          // 선택되지 않은 계약서 확인
          if (!selectedAgents[key] && contract.agent_name) {
            try {
              // agent_name으로 조회해서 여러 개인지 확인
              const { data, error } = await supabase
                .from('agent_master')
                .select('id, agent_number, agent_name, road_address')
                .eq('agent_name', contract.agent_name)
              
              if (!error && data && data.length > 1) {
                // 2개 이상이면 선택 팝업 표시
                pendingSelections.push({
                  contractIndex: i,
                  agentName: contract.agent_name,
                  agents: data.map(agent => ({
                    id: agent.id,
                    agent_number: agent.agent_number,
                    agent_name: agent.agent_name,
                    road_address: agent.road_address || ''
                  }))
                })
              }
            } catch (error) {
              console.error('중개사무소 조회 오류:', error)
            }
          }
        }
        
        if (pendingSelections.length > 0) {
          // 2개 이상의 중개사무소가 있으면 선택 팝업 표시
          setPendingAgentSelection(pendingSelections[0])
          setShowAgentSelection(true)
        } else {
          // 1개이거나 모두 선택된 경우 업로드 모드로 이동
          setMode('upload')
        }
      } else {
        // n8nResult가 없으면 업로드 모드로 이동
        setMode('upload')
      }
    } else {
      setCapturedImage(null)
      setOriginalFile(null)
      setMode('select')
    }
  }

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
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 10.5L9.2 11.85L10.65 12L9.6 13.05L9.9 14.5L8.5 13.8L7.1 14.5L7.4 13.05L6.35 12L7.8 11.85L8.5 10.5Z"
            fill="currentColor"
          />
          <path
            d="M12 10.5L12.7 11.85L14.15 12L13.1 13.05L13.4 14.5L12 13.8L10.6 14.5L10.9 13.05L9.85 12L11.3 11.85L12 10.5Z"
            fill="currentColor"
          />
          <path
            d="M15.5 10.5L16.2 11.85L17.65 12L16.6 13.05L16.9 14.5L15.5 13.8L14.1 14.5L14.4 13.05L13.35 12L14.8 11.85L15.5 10.5Z"
            fill="currentColor"
          />
        </svg>
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
              <div className={styles.agreementContainer}>
                <label className={styles.agreementLabel}>
                  <input
                    type="checkbox"
                    checked={isAgreementChecked}
                    onChange={(e) => setIsAgreementChecked(e.target.checked)}
                    className={styles.agreementCheckbox}
                  />
                  <span className={styles.agreementText}>
                    (필수) 위조된 문서가 아님을 확인하며, 허위 등록 시 관련 법령(<strong>사문서 위조</strong> 등)에 따른 <strong>처벌</strong>을 감수합니다.
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
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>{mode === 'review' ? '리뷰 작성' : '부동산 계약서 업로드'}</h3>
                {mode !== 'review' && (
                  <p className={styles.uploadWarning}>부동산 계약서는 검증 후 즉시 삭제 처리됩니다.</p>
                )}
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
                              {selectedAgents[`${index}_${contract.agent_number || contract.agent_name}`] ? (
                                <>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>중개사무소명:</span>
                                    <span className={styles.fieldValue}>{selectedAgents[`${index}_${contract.agent_number || contract.agent_name}`].agent_name}</span>
                                  </div>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>등록번호:</span>
                                    <span className={styles.fieldValue}>{selectedAgents[`${index}_${contract.agent_number || contract.agent_name}`].agent_number}</span>
                                  </div>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>주소(도로명):</span>
                                    <span className={styles.fieldValue}>{selectedAgents[`${index}_${contract.agent_number || contract.agent_name}`].road_address}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>중개사무소명:</span>
                                    <span className={styles.fieldValue}>{contract.agent_name || '-'}</span>
                                  </div>
                                  {agentAddresses[`${index}_${contract.agent_number || contract.agent_name}`] && (
                                    <div className={styles.contractField}>
                                      <span className={styles.fieldLabel}>주소(도로명):</span>
                                      <span className={styles.fieldValue}>{agentAddresses[`${index}_${contract.agent_number || contract.agent_name}`]}</span>
                                    </div>
                                  )}
                                  {!agentAddresses[`${index}_${contract.agent_number || contract.agent_name}`] && pendingAgentSelection?.contractIndex === index && (
                                    <div className={styles.contractField}>
                                      <span className={styles.fieldLabel}>주소(도로명):</span>
                                      <span className={styles.fieldValue} style={{ color: '#64748b', fontStyle: 'italic' }}>선택 중...</span>
                                    </div>
                                  )}
                                  <div className={styles.contractField}>
                                    <span className={styles.fieldLabel}>등록번호:</span>
                                    <span className={styles.fieldValue}>{contract.agent_number || '-'}</span>
                                  </div>
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
                      </div>
                    </div>
                  ) : ocrResult ? (
                    <div className={styles.resultContainer}>
                      <div className={styles.loadingContainer}>
                        <div className={styles.loadingSpinnerLarge}></div>
                        <h3>처리 중...</h3>
                        <p>검증 결과를 불러오는 중입니다.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {mode === 'review' && (
                <div className={styles.reviewContainer}>
                  {/* 거래 태그 */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>거래 태그</h4>
                    <div className={styles.tagContainer}>
                      {['#전월세', '#매매'].map((tag) => (
                        <button
                          key={tag}
                          className={`${styles.tagButton} ${transactionTags.includes(tag) ? styles.tagButtonActive : ''}`}
                          onClick={() => {
                            if (transactionTags.includes(tag)) {
                              setTransactionTags(transactionTags.filter((t) => t !== tag))
                            } else {
                              setTransactionTags([...transactionTags, tag])
                            }
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 칭찬 태그 */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>칭찬 태그</h4>
                    <div className={styles.tagContainer}>
                      {['친절하고 상세한 설명', '빠른 응답', '정확한 정보 제공', '좋은 매물 추천', '협상 도움', '전문적인 조언'].map(tag => (
                        <button
                          key={tag}
                          className={`${styles.tagButton} ${praiseTags.includes(tag) ? styles.tagButtonPraiseActive : ''}`}
                          onClick={() => {
                            if (praiseTags.includes(tag)) {
                              setPraiseTags(praiseTags.filter(t => t !== tag))
                            } else {
                              setPraiseTags([...praiseTags, tag])
                            }
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 아쉬움 태그 */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>아쉬움 태그</h4>
                    <div className={styles.tagContainer}>
                      {['응답이 느림', '정보 부족', '매물 설명 부족', '협상 미흡', '전문성 부족', '친절하지 않음'].map(tag => (
                        <button
                          key={tag}
                          className={`${styles.tagButton} ${regretTags.includes(tag) ? styles.tagButtonRegretActive : ''}`}
                          onClick={() => {
                            if (regretTags.includes(tag)) {
                              setRegretTags(regretTags.filter(t => t !== tag))
                            } else {
                              setRegretTags([...regretTags, tag])
                            }
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 상세 평가 */}
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>상세 평가</h4>
                    <div className={styles.ratingContainer}>
                      <div className={styles.ratingItem}>
                        <span className={styles.ratingLabel}>수수료 만족도</span>
                        <div className={styles.starRating}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              className={`${styles.starButton} ${reviewRatings.feeSatisfaction >= star ? styles.starActive : ''}`}
                              onClick={() => setReviewRatings({...reviewRatings, feeSatisfaction: star})}
                            >
                              ★
                            </button>
                          ))}
                          {reviewRatings.feeSatisfaction > 0 && (
                            <span className={styles.starRatingText}>
                              {getRatingText('feeSatisfaction', reviewRatings.feeSatisfaction)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.ratingItem}>
                        <span className={styles.ratingLabel}>전문성/지식</span>
                        <div className={styles.starRating}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              className={`${styles.starButton} ${reviewRatings.expertise >= star ? styles.starActive : ''}`}
                              onClick={() => setReviewRatings({...reviewRatings, expertise: star})}
                            >
                              ★
                            </button>
                          ))}
                          {reviewRatings.expertise > 0 && (
                            <span className={styles.starRatingText}>
                              {getRatingText('expertise', reviewRatings.expertise)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.ratingItem}>
                        <span className={styles.ratingLabel}>친절/태도</span>
                        <div className={styles.starRating}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              className={`${styles.starButton} ${reviewRatings.kindness >= star ? styles.starActive : ''}`}
                              onClick={() => setReviewRatings({...reviewRatings, kindness: star})}
                            >
                              ★
                            </button>
                          ))}
                          {reviewRatings.kindness > 0 && (
                            <span className={styles.starRatingText}>
                              {getRatingText('kindness', reviewRatings.kindness)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.ratingItem}>
                        <span className={styles.ratingLabel}>매물 신뢰도</span>
                        <div className={styles.starRating}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              className={`${styles.starButton} ${reviewRatings.propertyReliability >= star ? styles.starActive : ''}`}
                              onClick={() => setReviewRatings({...reviewRatings, propertyReliability: star})}
                            >
                              ★
                            </button>
                          ))}
                          {reviewRatings.propertyReliability > 0 && (
                            <span className={styles.starRatingText}>
                              {getRatingText('propertyReliability', reviewRatings.propertyReliability)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.ratingItem}>
                        <span className={styles.ratingLabel}>응답 속도</span>
                        <div className={styles.starRating}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              className={`${styles.starButton} ${reviewRatings.responseSpeed >= star ? styles.starActive : ''}`}
                              onClick={() => setReviewRatings({...reviewRatings, responseSpeed: star})}
                            >
                              ★
                            </button>
                          ))}
                          {reviewRatings.responseSpeed > 0 && (
                            <span className={styles.starRatingText}>
                              {getRatingText('responseSpeed', reviewRatings.responseSpeed)}
                            </span>
                          )}
                        </div>
                      </div>
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
                  </div>

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
                      onClick={() => {
                        // TODO: 리뷰 저장 로직
                        console.log('리뷰 제출:', {
                          transactionTags,
                          praiseTags,
                          regretTags,
                          ratings: reviewRatings,
                          text: reviewText
                        })
                        setShowThankYouModal(true)
                      }}
                    >
                      리뷰 제출
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
                "{pendingAgentSelection.agentName}"와 동일한 이름의 중개사무소가 여러 개 있습니다.<br />
                해당하는 사무소를 선택해주세요.
                <span className={styles.agentSelectionWarning}>(등록번호로 검색 된 중개사무소가 없습니다.)</span>
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
                        <span>등록번호: {agent.agent_number}</span>
                        {agent.road_address && (
                          <span>주소: {agent.road_address}</span>
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

