'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Sidebar.module.css'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/lib/api/interceptor'
import AdModal from './AdModal'

type ScreenType = 'menu' | 'contracts' | 'favorites' | 'survey' | 'points' | 'partnership' | 'policy' | 'admin'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  user: any
  isAdmin: boolean
  onGradeInfoClick: () => void
  onAdminScreenClick: () => void
  onLogout: () => void
}

export default function Sidebar({
  isOpen,
  onClose,
  user,
  isAdmin,
  onGradeInfoClick,
  onAdminScreenClick,
  onLogout,
}: SidebarProps) {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('menu')
  const [myContracts, setMyContracts] = useState<any[]>([])
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [favoriteAgents, setFavoriteAgents] = useState<any[]>([])
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false)
  const [userPoints, setUserPoints] = useState<number>(0)
  const [surveyQuestions, setSurveyQuestions] = useState<any[]>([])
  const [surveyResponses, setSurveyResponses] = useState<Record<string, string>>({})
  const [tempSurveyResponses, setTempSurveyResponses] = useState<Record<string, string>>({}) // 제출 전 임시 응답
  const [isSurveySubmitted, setIsSurveySubmitted] = useState(false) // 서베이 제출 여부
  const [isSurveySubmitting, setIsSurveySubmitting] = useState(false) // 서베이 제출 중
  const [pointTransactions, setPointTransactions] = useState<any[]>([])
  const [pointPolicies, setPointPolicies] = useState<any[]>([]) // 공통 코드에서 로드
  const [isAdVisible, setIsAdVisible] = useState(false) // 광고 노출 여부
  const [isSurveyVisible, setIsSurveyVisible] = useState(true) // 서베이 메뉴 노출 여부
  const [isAdModalOpen, setIsAdModalOpen] = useState(false) // 광고 모달 열림 여부
  const [isPolicyExpanded, setIsPolicyExpanded] = useState(false) // 포인트 받는 방법 펼침 여부
  const [transactionLimit, setTransactionLimit] = useState(10) // 포인트 내역 표시 개수
  const [isGradeTooltipVisible, setIsGradeTooltipVisible] = useState(false) // 등급 툴팁 표시 여부
  const [transactionTagOptions, setTransactionTagOptions] = useState<Array<{
    code_value: string
    code_name: string
  }>>([]) // Transaction tag options from common_code_detail
  
  // 사이드바가 닫힐 때 메뉴로 리셋
  useEffect(() => {
    if (!isOpen) {
      setCurrentScreen('menu')
      setSelectedContract(null)
      setDecryptedImageUrl(null)
    }
  }, [isOpen])

  // Load transaction tag options from common_code_detail
  useEffect(() => {
    const fetchTransactionTags = async () => {
      console.log('[Sidebar] Loading transaction tags...')
      const { data, error } = await supabase
        .from('common_code_detail')
        .select('code_value, code_name')
        .eq('code_group', 'TRANSACTION_TYPE')
        .eq('use_yn', 'Y')
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('[Sidebar] Error loading transaction tags:', error)
      } else if (data) {
        console.log('[Sidebar] Loaded transaction tags:', data)
        setTransactionTagOptions(data)
      } else {
        console.warn('[Sidebar] No transaction tags found')
      }
    }

    if (isOpen) fetchTransactionTags()
  }, [isOpen])

  // Debug: Log transaction tag options
  useEffect(() => {
    console.log('[Sidebar] transactionTagOptions updated:', transactionTagOptions)
  }, [transactionTagOptions])



  // 사이드바가 열릴 때 포인트 로드 및 노출 설정 로드
  useEffect(() => {
    if (isOpen && user) {
      loadUserPoints()
      loadVisibilitySettings()
    }
  }, [isOpen, user])

  // visibility:changed 이벤트 리스너 추가
  useEffect(() => {
    const handleVisibilityChanged = () => {
      if (isOpen) {
        loadVisibilitySettings()
      }
    }

    window.addEventListener('visibility:changed', handleVisibilityChanged)
    return () => window.removeEventListener('visibility:changed', handleVisibilityChanged)
  }, [isOpen])

  // 광고/서베이 노출 설정 로드
  const loadVisibilitySettings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const { data, error } = await supabase
        .from('common_code_detail')
        .select('code_value, description')
        .eq('code_group', 'SYSTEM_CONFIG')
        .in('code_value', ['ADVERTISEMENT_VISIBLE', 'SURVEY_VISIBLE'])
        .eq('use_yn', 'Y')
        .lte('sta_ymd', today)
        .gte('end_ymd', today)

      if (!error && data) {
        data.forEach((item: any) => {
          const isVisible = item.description?.startsWith('Y') ?? false
          if (item.code_value === 'ADVERTISEMENT_VISIBLE') {
            setIsAdVisible(isVisible)
          } else if (item.code_value === 'SURVEY_VISIBLE') {
            setIsSurveyVisible(isVisible)
          }
        })
      }
    } catch (error) {
      console.error('노출 설정 로드 오류:', error)
      setIsAdVisible(false)
      setIsSurveyVisible(true)
    }
  }

  // 광고 모달 완료 핸들러
  const handleAdComplete = () => {
    // 포인트 새로고침
    loadUserPoints()
  }
  
  if (!isOpen || !user) return null

  // 내 리뷰 불러오기
  const loadMyContracts = async () => {
    if (!authUser) return

    const { data } = await apiRequest<any[]>(
      () => supabase
        .from('agent_reviews')
        .select(`
          *,
          agent:agent_master(agent_name, road_address, lot_address)
        `)
        .eq('supabase_user_id', authUser.id)
        .order('created_at', { ascending: false }),
      { requireAuth: true }
    )

    if (data) {
      setMyContracts(data)
    }
  }

  // 사용자 포인트 불러오기
  const loadUserPoints = async () => {
    if (!authUser) return

    const { data } = await apiRequest<{ total_points: number }>(
      () => supabase
        .from('user_points')
        .select('total_points')
        .eq('supabase_user_id', authUser.id)
        .maybeSingle(),
      { requireAuth: true }
    )

    if (data) {
      setUserPoints(data.total_points || 0)
    } else {
      setUserPoints(0)
    }

    // 포인트 거래 내역도 함께 로드 (최근 50개)
    const { data: transactions } = await apiRequest<any[]>(
      () => supabase
        .from('point_transactions')
        .select('*')
        .eq('supabase_user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(50),
      { requireAuth: true }
    )

    if (transactions) {
      setPointTransactions(transactions)
    }

    // 포인트 정책 로드 (공통 코드에서)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD
    
    const { data: policies } = await apiRequest<any[]>(
      () => supabase
        .from('common_code_detail')
        .select('*')
        .eq('code_group', 'POINT_POLICY')
        .eq('use_yn', 'Y')
        .lte('sta_ymd', today)
        .gte('end_ymd', today)
        .order('sort_order', { ascending: true }),
      { requireAuth: false }
    )

    if (policies) {
      setPointPolicies(policies)
    }
  }

  // 서베이 질문 불러오기
  const loadSurveyQuestions = async () => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD
    
    const { data } = await apiRequest<any[]>(
      () => supabase
        .from('common_code_detail')
        .select('*')
        .eq('code_group', 'SURVEY')
        .eq('use_yn', 'Y')
        .lte('sta_ymd', today)
        .gte('end_ymd', today)
        .order('sort_order', { ascending: true }),
      { requireAuth: false }
    )

    if (data) {
      setSurveyQuestions(data)
    }
  }

  // 서베이 응답 불러오기
  const loadSurveyResponses = async () => {
    if (!authUser) return

    const { data: responses } = await apiRequest<any[]>(
      () => supabase
        .from('survey_responses')
        .select('*')
        .eq('supabase_user_id', authUser.id),
      { requireAuth: true }
    )

    if (responses && responses.length > 0) {
      const responsesMap: Record<string, string> = {}
      responses.forEach((r: any) => {
        responsesMap[r.question_code] = r.response_value
      })
      setSurveyResponses(responsesMap)
      // 이미 제출된 서베이가 있으면 제출 완료로 처리
      setIsSurveySubmitted(true)
      setTempSurveyResponses(responsesMap) // 임시 응답도 동기화
    } else {
      // 응답이 없으면 초기화
      setSurveyResponses({})
      setIsSurveySubmitted(false)
      setTempSurveyResponses({})
    }
  }

  // 서베이 임시 응답 선택 (제출 전)
  const handleSurveyOptionSelect = (questionCode: string, responseValue: string) => {
    if (isSurveySubmitted) return // 이미 제출된 경우 수정 불가
    
    setTempSurveyResponses(prev => ({
      ...prev,
      [questionCode]: responseValue
    }))
  }

  // 서베이 최종 제출
  const submitSurvey = async () => {
    if (!authUser) {
      alert('로그인이 필요합니다.')
      return
    }

    // 모든 질문에 응답했는지 확인
    const allQuestionsAnswered = surveyQuestions.every(q => tempSurveyResponses[q.code_value])
    if (!allQuestionsAnswered) {
      alert('모든 질문에 답변해주세요.')
      return
    }

    setIsSurveySubmitting(true)

    try {
      // 모든 응답을 DB에 저장
      const insertData = surveyQuestions.map(q => ({
        supabase_user_id: authUser.id,
        question_code: q.code_value,
        response_value: tempSurveyResponses[q.code_value]
      }))

      const { error: insertError } = await apiRequest<any>(
        () => supabase
          .from('survey_responses')
          .insert(insertData),
        { requireAuth: true }
      )

      if (insertError) {
        console.error('[서베이] 제출 오류:', insertError)
        alert('서베이 제출 중 오류가 발생했습니다.')
        return
      }

      // 포인트 지급
      const { data: pointResult, error: pointError } = await supabase.rpc('award_points', {
        p_user_id: authUser.id,
        p_transaction_type: 'SURVEY',
        p_description: '서베이 완료'
      })

      if (pointError) {
        console.error('[포인트] 지급 오류:', pointError)
      } else {
        console.log('[포인트] 지급 완료:', pointResult)
      }

      // 상태 업데이트
      setSurveyResponses({ ...tempSurveyResponses })
      setIsSurveySubmitted(true)
      
      // 포인트 새로고침
      await loadUserPoints()
      
      alert('🎉 서베이가 제출되었습니다! 포인트가 적립되었습니다.')
    } catch (error) {
      console.error('[서베이] 제출 예외:', error)
      alert('서베이 제출 중 오류가 발생했습니다.')
    } finally {
      setIsSurveySubmitting(false)
    }
  }

  // 출석 체크
  const checkInAttendance = async () => {
    if (!authUser) {
      alert('로그인이 필요합니다.')
      return
    }

    const { data } = await apiRequest<{ success: boolean; message: string }>(
      () => supabase.rpc('check_in_attendance', {
        p_user_id: authUser.id
      }),
      { requireAuth: true, showErrorAlert: true }
    )

    if (data) {
      alert(data.message)
      if (data.success) {
        loadUserPoints() // 포인트 새로고침
      }
    }
  }

  // 내 관심 부동산 불러오기
  const loadFavoriteAgents = async () => {
    if (!authUser) return

    setIsFavoritesLoading(true)

    const { data } = await apiRequest<any[]>(
      () => supabase
        .from('favorite_agents')
        .select(`
          id,
          agent_id,
          created_at,
          agent:agent_master(
            id,
            agent_name,
            road_address,
            lot_address
          )
        `)
        .eq('supabase_user_id', authUser.id)
        .order('created_at', { ascending: false }),
      { requireAuth: true }
    )

    if (data) {
      setFavoriteAgents(data)
    }
    
    setIsFavoritesLoading(false)
  }

  // 관심 부동산 제거
  const handleRemoveFavorite = async (favoriteId: number) => {
    if (!confirm('관심 부동산을 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('favorite_agents')
      .delete()
      .eq('id', favoriteId)

    if (error) {
      console.error('[Sidebar] 관심 부동산 삭제 오류:', error)
      alert('관심 부동산 삭제에 실패했습니다.')
    } else {
      // 목록 새로고침
      loadFavoriteAgents()
    }
  }

  // 관심 부동산 클릭 시 메인 화면에서 검색 및 상세 모달 열기
  const handleFavoriteClick = (agentName: string, agentId: number) => {
    // 1. 사이드바 닫기
    onClose()
    
    // 2. 메인 화면에서 부동산명으로 검색하고 상세 모달 열기
    window.dispatchEvent(new CustomEvent('search:and-open-detail', { 
      detail: { 
        searchQuery: agentName,
        agentId: agentId 
      } 
    }))
  }

  // 계약서 상세 보기
  const handleContractClick = async (contract: any) => {
    setSelectedContract(contract)
    setDecryptedImageUrl(null)
    setIsImageLoading(true)

    if (contract.contract_image_url) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('contracts')
          .download(contract.contract_image_url)

        if (!downloadError && fileData) {
          // Blob을 base64로 변환
          const reader = new FileReader()
          reader.onloadend = () => {
            setDecryptedImageUrl(reader.result as string)
            setIsImageLoading(false)
          }
          reader.onerror = () => {
            setIsImageLoading(false)
          }
          reader.readAsDataURL(fileData)
        } else {
          setIsImageLoading(false)
        }
      } catch (error) {
        // 이미지 로드 실패 시 조용히 무시
        setIsImageLoading(false)
      }
    } else {
      setIsImageLoading(false)
    }
  }

  // 뒤로 가기
  const handleBack = () => {
    if (selectedContract) {
      setSelectedContract(null)
      setDecryptedImageUrl(null)
    } else {
      setCurrentScreen('menu')
    }
  }

  return (
    <>
      {/* 오버레이 */}
      <div className={styles.overlay} onClick={onClose} />
      
      {/* 사이드바 */}
      <div className={styles.sidebar}>
        {/* 헤더 - 뒤로 가기 또는 닫기 */}
        <div className={styles.sidebarHeader}>
          {currentScreen !== 'menu' || selectedContract ? (
            <button
              className={styles.backButton}
              onClick={handleBack}
              aria-label="뒤로"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : null}
          <h3 className={styles.screenTitle}>
            {selectedContract ? '리뷰 상세' :
             currentScreen === 'menu' ? '' :
             currentScreen === 'contracts' ? '내 리뷰' :
             currentScreen === 'favorites' ? '내 관심 부동산' :
             currentScreen === 'survey' ? '서베이' :
             currentScreen === 'points' ? '내 포인트' :
             currentScreen === 'partnership' ? '광고/제휴 문의' :
             currentScreen === 'policy' ? '약관/정책' :
             currentScreen === 'admin' ? '관리자 메뉴' : ''}
          </h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* 프로필 정보 - 메뉴 화면에서만 표시 */}
        {currentScreen === 'menu' && !selectedContract && (
          <div className={styles.profileSection}>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="닫기"
          >
            <svg
              width="24"
              height="24"
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
          <div className={styles.profileInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h4 className={styles.profileName} style={{ margin: 0 }}>
                {user.user_metadata?.name ||
                  user.user_metadata?.kakao_account?.profile?.nickname ||
                  user.user_metadata?.properties?.nickname ||
                  user.user_metadata?.nickname ||
                  '사용자'}
              </h4>
              <div className={styles.gradeBadge} style={{ margin: 0, position: 'relative' }}>
                <span>갓까비</span>
                <button
                  className={styles.gradeInfoButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsGradeTooltipVisible(!isGradeTooltipVisible)
                  }}
                  aria-label="등급 안내"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 10V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                {isGradeTooltipVisible && (
                  <div className={styles.gradeTooltip}>
                    <div className={styles.gradeTooltipArrow}></div>
                    <div className={styles.gradeTooltipContent}>
                      <h4 className={styles.gradeTooltipTitle}>등급 안내</h4>
                      <div className={styles.gradeTooltipList}>
                        <div className={styles.gradeTooltipItem}>
                          <span className={styles.gradeTooltipBadge}>임장까비</span>
                          <span className={styles.gradeTooltipDesc}>신규 가입자</span>
                        </div>
                        <div className={styles.gradeTooltipItem}>
                          <span className={styles.gradeTooltipBadge}>인주까비</span>
                          <span className={styles.gradeTooltipDesc}>리뷰 1개 작성</span>
                        </div>
                        <div className={styles.gradeTooltipItem}>
                          <span className={styles.gradeTooltipBadge}>동네까비</span>
                          <span className={styles.gradeTooltipDesc}>리뷰 3개 이상</span>
                        </div>
                        <div className={styles.gradeTooltipItem}>
                          <span className={styles.gradeTooltipBadge}>갓까비</span>
                          <span className={styles.gradeTooltipDesc}>리뷰 10개 이상</span>
                        </div>
                      </div>
                      <button 
                        className={styles.gradeTooltipClose}
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsGradeTooltipVisible(false)
                        }}
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className={styles.profileEmail}>
              {user.email || user.user_metadata?.kakao_account?.email || ''}
            </p>
            <button 
              className={styles.pointsButton}
              onClick={() => {
                loadUserPoints()
                setCurrentScreen('points')
              }}
            >
              <span className={styles.pointsIcon}>💰</span>
              <span className={styles.pointsText}>내 포인트: {userPoints.toLocaleString()}P</span>
              <span className={styles.chevron}>›</span>
            </button>
          </div>
        </div>
        )}

        {/* 컨텐츠 영역 */}
        <div className={styles.content}>
          {/* 메뉴 화면 */}
          {currentScreen === 'menu' && !selectedContract && (
            <nav className={styles.navList}>
              <button 
                className={styles.navItem} 
                onClick={() => {
                  loadMyContracts()
                  setCurrentScreen('contracts')
                }}
              >
                <span className={styles.navIcon}>📝</span>
                <span className={styles.navLabel}>내 리뷰 보기</span>
                <span className={styles.chevron}>›</span>
              </button>

              <button 
                className={styles.navItem} 
                onClick={() => {
                  loadFavoriteAgents()
                  setCurrentScreen('favorites')
                }}
              >
                <span className={styles.navIcon}>❤️</span>
                <span className={styles.navLabel}>내 관심 부동산</span>
                <span className={styles.chevron}>›</span>
              </button>

              {/* 서베이 버튼 (설정에서 활성화된 경우에만 표시) */}
              {isSurveyVisible && (
                <button 
                  className={styles.navItem} 
                  onClick={() => {
                    loadSurveyQuestions()
                    loadSurveyResponses()
                    setCurrentScreen('survey')
                  }}
                >
                  <span className={styles.navIcon}>📋</span>
                  <span className={styles.navLabel}>서베이</span>
                  <span className={styles.chevron}>›</span>
                </button>
              )}

              {/* 광고보기 버튼 (설정에서 활성화된 경우에만 표시) */}
              {isAdVisible && (
                <button 
                  className={styles.navItem} 
                  onClick={() => setIsAdModalOpen(true)}
                >
                  <span className={styles.navIcon}>📺</span>
                  <span className={styles.navLabel}>광고보기 (10P 적립)</span>
                  <span className={styles.chevron}>›</span>
                </button>
              )}

              <button 
                className={styles.navItem} 
                onClick={() => setCurrentScreen('partnership')}
              >
                <span className={styles.navIcon}>🤝</span>
                <span className={styles.navLabel}>광고/제휴 문의</span>
                <span className={styles.chevron}>›</span>
              </button>

              {/* 시스템 관리 - 관리자만 표시 */}
              {isAdmin && (
                <button 
                  className={`${styles.navItem} ${styles.adminNavItem}`} 
                  onClick={() => {
                    onAdminScreenClick()
                    onClose()
                  }}
                >
                  <span className={styles.navIcon}>🔧</span>
                  <span className={styles.navLabel}>시스템 관리</span>
                  <span className={styles.chevron}>›</span>
                </button>
              )}
            </nav>
          )}

          {/* 내 리뷰 목록 화면 */}
          {currentScreen === 'contracts' && !selectedContract && (
            <div className={styles.screenContent}>
              {myContracts.length === 0 ? (
                <div className={styles.emptyState}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                    등록된 리뷰가 없습니다
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', textAlign: 'center' }}>
                    카메라 버튼을 눌러 계약서를 등록하고<br />
                    첫 번째 리뷰를 작성해보세요!
                  </div>
                </div>
              ) : (
                <div className={styles.contractList}>
                  {myContracts.map((contract) => (
                    <button
                      key={contract.id}
                      className={styles.contractItem}
                      onClick={() => handleContractClick(contract)}
                    >
                      <div className={styles.contractName}>
                        {contract.agent?.agent_name || '알 수 없음'}
                      </div>
                      <div className={styles.contractDate}>
                        계약일: {contract.contract_date || '-'}
                      </div>
                      <div className={styles.contractCreated}>
                        등록일: {new Date(contract.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 리뷰 상세 화면 */}
          {selectedContract && (
            <div className={styles.screenContent}>
              {/* 계약서 이미지 */}
              {selectedContract.contract_image_url && (
                <div className={styles.imageSection}>
                  {isImageLoading ? (
                    <div className={styles.loading}>이미지 로딩 중...</div>
                  ) : decryptedImageUrl ? (
                    <img src={decryptedImageUrl} alt="계약서" className={styles.contractImage} />
                  ) : (
                    <div className={styles.noImage}>이미지를 불러올 수 없습니다</div>
                  )}
                </div>
              )}

              {/* 리뷰 정보 */}
              <div className={styles.reviewInfo}>
                {/* 기본 정보 */}
                <div className={styles.reviewSection}>
                  <h4 className={styles.reviewSectionTitle}>📍 기본 정보</h4>
                  <div className={styles.reviewField}>
                    <span className={styles.reviewLabel}>공인중개사:</span>
                    <span className={styles.reviewValue}>{selectedContract.agent?.agent_name || '알 수 없음'}</span>
                  </div>
                  {selectedContract.agent?.road_address && (
                    <div className={styles.reviewField}>
                      <span className={styles.reviewLabel}>주소:</span>
                      <span className={styles.reviewValue}>{selectedContract.agent.road_address}</span>
                    </div>
                  )}
                  {selectedContract.contract_date && (
                    <div className={styles.reviewField}>
                      <span className={styles.reviewLabel}>계약일:</span>
                      <span className={styles.reviewValue}>{selectedContract.contract_date}</span>
                    </div>
                  )}
                  {selectedContract.transaction_tag && (
                    <div className={styles.reviewField}>
                      <span className={styles.reviewLabel}>거래 구분:</span>
                      <span className={`${styles.reviewValue} ${styles.transactionBadge}`}>
                        {(() => {
                          const tagName = transactionTagOptions.find(tag => tag.code_value === selectedContract.transaction_tag)?.code_name || selectedContract.transaction_tag
                          console.log('[Sidebar] Transaction tag display:', { 
                            code_value: selectedContract.transaction_tag, 
                            code_name: tagName,
                            availableOptions: transactionTagOptions
                          })
                          return tagName
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                {/* 상세 평가 */}
                {(selectedContract.fee_satisfaction || selectedContract.expertise || selectedContract.kindness || 
                  selectedContract.property_reliability || selectedContract.response_speed) && (
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>⭐ 상세 평가</h4>
                    {selectedContract.fee_satisfaction && (
                      <div className={styles.reviewField}>
                        <span className={styles.reviewLabel}>수수료 만족도:</span>
                        <span className={styles.reviewValue}>{'⭐'.repeat(selectedContract.fee_satisfaction)}</span>
                      </div>
                    )}
                    {selectedContract.expertise && (
                      <div className={styles.reviewField}>
                        <span className={styles.reviewLabel}>전문성:</span>
                        <span className={styles.reviewValue}>{'⭐'.repeat(selectedContract.expertise)}</span>
                      </div>
                    )}
                    {selectedContract.kindness && (
                      <div className={styles.reviewField}>
                        <span className={styles.reviewLabel}>친절도:</span>
                        <span className={styles.reviewValue}>{'⭐'.repeat(selectedContract.kindness)}</span>
                      </div>
                    )}
                    {selectedContract.property_reliability && (
                      <div className={styles.reviewField}>
                        <span className={styles.reviewLabel}>매물 신뢰도:</span>
                        <span className={styles.reviewValue}>{'⭐'.repeat(selectedContract.property_reliability)}</span>
                      </div>
                    )}
                    {selectedContract.response_speed && (
                      <div className={styles.reviewField}>
                        <span className={styles.reviewLabel}>응답 속도:</span>
                        <span className={styles.reviewValue}>{'⭐'.repeat(selectedContract.response_speed)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 칭찬 태그 */}
                {selectedContract.praise_tags && selectedContract.praise_tags.length > 0 && (
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>👍 칭찬 태그</h4>
                    <div className={styles.tagList}>
                      {selectedContract.praise_tags.map((tag: string, index: number) => (
                        <span key={index} className={styles.praiseTag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 아쉬움 태그 */}
                {selectedContract.regret_tags && selectedContract.regret_tags.length > 0 && (
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>💭 아쉬움 태그</h4>
                    <div className={styles.tagList}>
                      {selectedContract.regret_tags.map((tag: string, index: number) => (
                        <span key={index} className={styles.regretTag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 상세 리뷰 */}
                {selectedContract.review_text && (
                  <div className={styles.reviewSection}>
                    <h4 className={styles.reviewSectionTitle}>✍️ 상세 리뷰</h4>
                    <p className={styles.reviewText}>{selectedContract.review_text}</p>
                  </div>
                )}

                {/* 등록일 */}
                <div className={styles.reviewSection}>
                  <div className={styles.reviewField}>
                    <span className={styles.reviewLabel}>등록일:</span>
                    <span className={styles.reviewValue}>{new Date(selectedContract.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 내 관심 부동산 화면 */}
          {currentScreen === 'favorites' && (
            <div className={styles.screenContent}>
              {isFavoritesLoading ? (
                <div className={styles.emptyState}>관심 부동산을 불러오는 중...</div>
              ) : favoriteAgents.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>❤️</div>
                  <p className={styles.emptyText}>아직 관심 등록한 부동산이 없습니다.</p>
                  <p className={styles.emptySubtext}>부동산 상세 화면에서 관심 등록을 해보세요!</p>
                </div>
              ) : (
                <div className={styles.favoritesList}>
                  {favoriteAgents.map((fav: any) => (
                    <div key={fav.id} className={styles.favoriteCard}>
                      <div 
                        className={styles.favoriteCardContent}
                        onClick={() => handleFavoriteClick(fav.agent?.agent_name || '알 수 없음', fav.agent?.id)}
                      >
                        <h4 className={styles.favoriteName}>{fav.agent?.agent_name || '알 수 없음'}</h4>
                        <div className={styles.favoriteFooter}>
                          <span className={styles.favoriteDate}>
                            등록일: {new Date(fav.created_at).toLocaleDateString('ko-KR')}
                          </span>
                          <button
                            className={styles.favoriteRemoveButton}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveFavorite(fav.id)
                            }}
                            aria-label="관심 해제"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                              />
                            </svg>
                            <span>관심 해제</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 서베이 화면 */}
          {currentScreen === 'survey' && (
            <div className={styles.screenContent}>
              {surveyQuestions.length === 0 ? (
                <div className={styles.emptyState}>서베이 질문을 불러오는 중...</div>
              ) : (
                <div className={styles.surveyContainer}>
                  <p className={styles.surveyDescription}>
                    서비스 개선을 위한 간단한 질문에 답변해주세요! 
                    {!isSurveySubmitted && ' 완료 시 포인트가 적립됩니다. 🎁'}
                  </p>
                  
                  {surveyQuestions.map((question) => {
                    // extra_value1 ~ extra_value5에서 옵션 가져오기
                    const options = [
                      question.extra_value1,
                      question.extra_value2,
                      question.extra_value3,
                      question.extra_value4,
                      question.extra_value5
                    ].filter(Boolean) // null/undefined 제거

                    // 제출 여부에 따라 다른 응답 사용
                    const selectedValue = isSurveySubmitted 
                      ? surveyResponses[question.code_value] 
                      : tempSurveyResponses[question.code_value]

                    return (
                      <div key={question.code_value} className={styles.surveyQuestion}>
                        <h4 className={styles.questionTitle}>{question.code_name}</h4>
                        <div className={styles.optionsList}>
                          {options.map((option: string) => (
                            <button
                              key={option}
                              className={`${styles.optionButton} ${
                                selectedValue === option 
                                  ? styles.optionSelected 
                                  : ''
                              }`}
                              onClick={() => handleSurveyOptionSelect(question.code_value, option)}
                              disabled={isSurveySubmitted}
                              style={{ 
                                cursor: isSurveySubmitted ? 'not-allowed' : 'pointer',
                                opacity: isSurveySubmitted ? 0.6 : 1
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {isSurveySubmitted ? (
                    <div className={styles.surveyComplete}>
                      ✅ 서베이 응답이 제출되었습니다. 감사합니다!
                    </div>
                  ) : (
                    <button
                      className={styles.surveySubmitButton}
                      onClick={submitSurvey}
                      disabled={isSurveySubmitting || surveyQuestions.length !== Object.keys(tempSurveyResponses).length}
                      style={{
                        marginTop: '20px',
                        padding: '12px 24px',
                        backgroundColor: surveyQuestions.length === Object.keys(tempSurveyResponses).length ? '#4CAF50' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: surveyQuestions.length === Object.keys(tempSurveyResponses).length ? 'pointer' : 'not-allowed',
                        width: '100%'
                      }}
                    >
                      {isSurveySubmitting ? '제출 중...' : '제출하기'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 포인트 화면 */}
          {currentScreen === 'points' && (
            <div className={styles.screenContent}>
              <div className={styles.pointsContainer}>
                {/* 보유 포인트 */}
                <div className={styles.pointsHeader}>
                  <div className={styles.pointsBalance}>
                    <span className={styles.pointsLabel}>보유 포인트</span>
                    <span className={styles.pointsAmount}>{userPoints.toLocaleString()}P</span>
                  </div>
                </div>

                {/* 포인트 획득 방법 (접기/펼치기) */}
                <div className={styles.pointsSection}>
                  <button 
                    className={styles.sectionTitleButton}
                    onClick={() => setIsPolicyExpanded(!isPolicyExpanded)}
                  >
                    <span>💡 포인트 받는 방법</span>
                    <span className={styles.expandIcon}>{isPolicyExpanded ? '▼' : '▶'}</span>
                  </button>
                  {isPolicyExpanded && (
                    <div className={styles.policyList}>
                      {pointPolicies.map((policy) => (
                        <div key={policy.code_value} className={styles.policyItem}>
                          <div className={styles.policyDescription}>{policy.description}</div>
                          <div className={styles.policyPoints}>+{policy.code_name} {policy.extra_value1}P</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 포인트 내역 (스크롤 + 더 보기) */}
                <div className={styles.pointsSection}>
                  <h4 className={styles.sectionTitle}>📝 포인트 내역</h4>
                  {pointTransactions.length === 0 ? (
                    <div className={styles.emptyState}>아직 포인트 내역이 없습니다.</div>
                  ) : (
                    <>
                      <div className={styles.transactionsScrollList}>
                        {pointTransactions.slice(0, transactionLimit).map((tx) => {
                          // transaction_type에 해당하는 extra_value2 찾기
                          const policy = pointPolicies.find(p => p.code_value === tx.transaction_type)
                          const displayText = policy?.extra_value2 || tx.description
                          
                          return (
                            <div key={tx.id} className={styles.transactionItem}>
                              <div className={styles.transactionInfo}>
                                <span className={styles.transactionDesc}>{displayText}</span>
                                <span className={styles.transactionDate}>
                                  {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                                </span>
                              </div>
                              <span className={`${styles.transactionPoints} ${tx.points > 0 ? styles.pointsPlus : styles.pointsMinus}`}>
                                {tx.points > 0 ? '+' : ''}{tx.points}P
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      {pointTransactions.length > transactionLimit && (
                        <button 
                          className={styles.loadMoreButton}
                          onClick={() => setTransactionLimit(prev => prev + 10)}
                        >
                          더 보기 ({pointTransactions.length - transactionLimit}개 남음)
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 광고/제휴 문의 화면 */}
          {currentScreen === 'partnership' && (
            <div className={styles.screenContent}>
              <form className={styles.partnershipForm} onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                
                if (!authUser) {
                  alert('로그인이 필요합니다.')
                  return
                }

                try {
                  const { error } = await apiRequest(
                    () => supabase
                      .from('partnership_inquiries')
                      .insert({
                        supabase_user_id: authUser.id,
                        user_email: formData.get('email'),
                        user_name: formData.get('name'),
                        company_name: formData.get('company'),
                        contact_phone: formData.get('phone'),
                        inquiry_type: formData.get('type'),
                        title: formData.get('title'),
                        content: formData.get('content'),
                      }),
                    { requireAuth: true }
                  )

                  if (!error) {
                    alert('문의가 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.')
                    e.currentTarget.reset()
                    setCurrentScreen('menu')
                  } else {
                    alert('문의 접수 중 오류가 발생했습니다.')
                  }
                } catch (error: any) {
                  alert('문의 접수 중 오류가 발생했습니다.')
                }
              }}>
                <div className={styles.formGroup}>
                  <label>문의 유형 *</label>
                  <select name="type" required className={styles.formSelect}>
                    <option value="광고">광고</option>
                    <option value="제휴">제휴</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>이름 *</label>
                  <input type="text" name="name" required className={styles.formInput} placeholder="홍길동" />
                </div>
                
                <div className={styles.formGroup}>
                  <label>이메일 *</label>
                  <input type="email" name="email" required className={styles.formInput} placeholder="example@email.com" defaultValue={user.email || ''} />
                </div>
                
                <div className={styles.formGroup}>
                  <label>회사명</label>
                  <input type="text" name="company" className={styles.formInput} placeholder="회사명 (선택)" />
                </div>
                
                <div className={styles.formGroup}>
                  <label>연락처 *</label>
                  <input type="tel" name="phone" required className={styles.formInput} placeholder="010-0000-0000" />
                </div>
                
                <div className={styles.formGroup}>
                  <label>제목 *</label>
                  <input type="text" name="title" required className={styles.formInput} placeholder="문의 제목" />
                </div>
                
                <div className={styles.formGroup}>
                  <label>문의 내용 *</label>
                  <textarea name="content" required className={styles.formTextarea} rows={6} placeholder="문의하실 내용을 상세히 작성해주세요." />
                </div>
                
                <button type="submit" className={styles.submitButton}>문의하기</button>
              </form>
            </div>
          )}

        </div>

        {/* 로그아웃 - 메뉴 화면에서만 표시 */}
        {currentScreen === 'menu' && !selectedContract && (
          <div className={styles.sidebarFooter}>
            <button 
              className={styles.logoutButton} 
              onClick={async (e) => {
                e.stopPropagation()
                await onLogout()
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>

      {/* 광고 모달 */}
      <AdModal 
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onComplete={handleAdComplete}
      />
    </>
  )
}

