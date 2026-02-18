'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './Header.module.css'
import { signInWithKakao, signInWithGoogle, getCurrentUser } from '@/lib/auth'
import { logAccess } from '@/lib/accessLog'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useAlert } from '@/contexts/AlertContext'
import { apiRequest } from '@/lib/api/interceptor'
import Sidebar from './Sidebar'

export default function Header() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isGradeInfoModalOpen, setIsGradeInfoModalOpen] = useState(false)
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false)
  const [headerInquiryType, setHeaderInquiryType] = useState('광고')
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [isMyContractsModalOpen, setIsMyContractsModalOpen] = useState(false)
  const [myContracts, setMyContracts] = useState<any[]>([])
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [isContractDetailModalOpen, setIsContractDetailModalOpen] = useState(false)
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [isAdminScreenOpen, setIsAdminScreenOpen] = useState(false)
  const [adminMenu, setAdminMenu] = useState<'common-code' | 'account' | 'batch' | 'survey' | 'partnership' | 'content-visibility' | 'analytics' | 'reports' | 'review-mgmt'>('common-code')
  const [isMobileAdminMenuOpen, setIsMobileAdminMenuOpen] = useState(false)
  const [selectedCodeGroup, setSelectedCodeGroup] = useState<string | null>(null)
  const [showSaveSuccessToast, setShowSaveSuccessToast] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
  const [masterSearchTerm, setMasterSearchTerm] = useState('')
  const [masterDateFrom, setMasterDateFrom] = useState('')
  const [masterDateTo, setMasterDateTo] = useState('')
  const [detailSearchTerm, setDetailSearchTerm] = useState('')
  const [detailDateFrom, setDetailDateFrom] = useState('')
  const [detailDateTo, setDetailDateTo] = useState('')
  
  // 배치 관리 State
  interface BatchJob {
    id: number
    job_name: string
    job_description: string | null
    cron_expression: string
    cron_description: string | null
    is_active: boolean
    endpoint_url: string | null
    last_run_at: string | null
    last_status: string
    last_message: string | null
    created_at: string
    updated_at: string
  }
  interface BatchJobLog {
    id: number
    job_id: number
    status: string
    started_at: string
    finished_at: string | null
    message: string | null
    error_detail: string | null
    created_at: string
  }
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([])
  const [isBatchLoading, setIsBatchLoading] = useState(false)
  const [editingBatchJob, setEditingBatchJob] = useState<BatchJob | null>(null)
  const [isAddingBatchJob, setIsAddingBatchJob] = useState(false)
  const [newBatchJob, setNewBatchJob] = useState({
    job_name: '',
    job_description: '',
    cron_expression: '',
    cron_description: '',
    endpoint_url: '',
  })
  const [batchLogs, setBatchLogs] = useState<BatchJobLog[]>([])
  const [showBatchLogs, setShowBatchLogs] = useState<number | null>(null)
  const [isBatchLogLoading, setIsBatchLogLoading] = useState(false)
  const [runningBatchJobId, setRunningBatchJobId] = useState<number | null>(null)
  const [batchRunElapsed, setBatchRunElapsed] = useState(0)

  // 신고 관리 State
  interface Report {
    id: number
    review_id: string
    reporter_user_id: string
    reason: string
    detail: string | null
    status: string
    admin_note: string | null
    processed_at: string | null
    created_at: string
    updated_at: string
    reporter?: { nickname: string | null; email: string | null }
    review?: {
      id: string
      review_text: string | null
      agent_id: number | null
      transaction_tag: string | null
      fee_satisfaction: number | null
      expertise: number | null
      kindness: number | null
      property_reliability: number | null
      response_speed: number | null
      praise_tags: string[] | null
      regret_tags: string[] | null
      contract_date: string | null
      created_at: string | null
      is_hidden: boolean | null
      agent?: {
        id: number
        agent_name: string | null
        road_address: string | null
        agent_number: string | null
      } | null
    }
  }
  const [reports, setReports] = useState<Report[]>([])
  const [isReportsLoading, setIsReportsLoading] = useState(false)
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('ALL')
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [editReportStatus, setEditReportStatus] = useState('')
  const [editReportNote, setEditReportNote] = useState('')

  // 데이터 분석 State
  const [analyticsData, setAnalyticsData] = useState<any>({
    totalUsers: 0,
    totalReviews: 0,
    totalAgents: 0,
    avgRating: 0,
    praiseTags: [],
    regretTags: [],
    transactionTypes: [],
    userGrades: [],
    avgRatings: {},
    surveyResponses: [],
    monthlyTrend: [],
    monthlySignups: [] as Array<{ month: string; kakao: number; google: number; total: number }>
  })
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)

  // 리뷰 관리 State
  const [reviewMgmtList, setReviewMgmtList] = useState<any[]>([])
  const [isReviewMgmtLoading, setIsReviewMgmtLoading] = useState(false)
  const [reviewMgmtPage, setReviewMgmtPage] = useState(0)
  const [reviewMgmtDecryptedImages, setReviewMgmtDecryptedImages] = useState<Record<string, string>>({})
  const [reviewMgmtImageLoading, setReviewMgmtImageLoading] = useState<Record<string, boolean>>({})

  const [codeMasterList, setCodeMasterList] = useState<Array<{
    code_group: string
    code_group_name: string
    description: string | null
    sta_ymd: string
    end_ymd: string | null
    use_yn: string
    detail_count?: number
  }>>([])
  const [codeDetailList, setCodeDetailList] = useState<Array<{
    id: number
    code_group: string
    code_value: string
    code_name: string
    description: string | null
    extra_value1: string | null
    extra_value2: string | null
    extra_value3: string | null
    extra_value4: string | null
    extra_value5: string | null
    sta_ymd: string
    end_ymd: string | null
    use_yn: string
    sort_order: number
  }>>([])
  const [isCodeLoading, setIsCodeLoading] = useState(false)
  
  // 마스터 코드 편집 상태
  const [editingMaster, setEditingMaster] = useState<{
    code_group: string
    code_group_name: string
    description: string
    sta_ymd: string
    end_ymd: string
    use_yn: string
  } | null>(null)
  const [isNewMaster, setIsNewMaster] = useState(false)
  
  // 상세 코드 편집 상태
  const [editingDetail, setEditingDetail] = useState<{
    id: number | null
    code_group: string
    code_value: string
    code_name: string
    description: string
    sta_ymd: string
    end_ymd: string
    use_yn: string
    sort_order: number
    extra_value1: string
    extra_value2: string
    extra_value3: string
    extra_value4: string
    extra_value5: string
  } | null>(null)
  const [isNewDetail, setIsNewDetail] = useState(false)
  
  // 계정 관리 상태
  const [userList, setUserList] = useState<Array<{
    supabase_user_id: string
    email: string | null
    nickname: string | null
    user_type: string | null
    user_grade: string | null
    created_at: string
    last_login_at: string | null
    review_count: number
  }>>([])
  const [isUserLoading, setIsUserLoading] = useState(false)
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState('')
  const [editingUser, setEditingUser] = useState<{
    supabase_user_id: string
    email: string | null
    nickname: string | null
    user_type: string | null
    user_grade: string | null
  } | null>(null)
  // 사용자별 리뷰 리스트 팝업
  const [userReviewPopup, setUserReviewPopup] = useState<{
    userId: string
    nickname: string
    reviews: Array<{
      id: string
      agent_name: string
      agent_road_address: string
      contract_date: string
      transaction_tag: string
      avg_rating: string
      review_text: string
      created_at: string
    }>
  } | null>(null)
  const [isUserReviewLoading, setIsUserReviewLoading] = useState(false)
  
  // 광고/제휴/오류 문의 관리 상태
  const [partnershipList, setPartnershipList] = useState<Array<{
    id: number
    supabase_user_id: string
    user_email: string | null
    user_name: string | null
    company_name: string | null
    contact_phone: string | null
    inquiry_type: string
    title: string
    content: string
    status: string
    admin_reply: string | null
    created_at: string
    updated_at: string
    replied_at: string | null
  }>>([])
  const [isPartnershipLoading, setIsPartnershipLoading] = useState(false)
  const [partnershipStatusFilter, setPartnershipStatusFilter] = useState('')
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [adVisibility, setAdVisibility] = useState('Y')
  const [surveyVisibility, setSurveyVisibility] = useState('Y')
  const [mainAdVisibility, setMainAdVisibility] = useState('Y')
  const [mainAdPosition, setMainAdPosition] = useState<'TOP' | 'BOTTOM'>('BOTTOM')
  const [mainAdDevice, setMainAdDevice] = useState<'MOBILE' | 'PC' | 'ALL'>('ALL')
  const [adViewDailyLimit, setAdViewDailyLimit] = useState('3')
  
  // useAuth Hook으로 중앙화된 인증 상태 관리
  const { user, session, userType, isLoading, signOut } = useAuth()
  const { showAlert, showSuccess, showError, showWarning, showConfirm } = useAlert()

  // TODO: Supabase 연동 전까지 목 데이터 사용
  const mockFavoriteAgents: Array<{
    id: number
    name: string
    address: string
    commentCount: number
  }> = [
    {
      id: 1,
      name: '미금퍼스트공인중개사사무소(테스트)',
      address: '경기도 성남시 분당구 미금일로90번길 10, 1층(구미동)',
      commentCount: 152,
    },
    {
      id: 2,
      name: '기쁨부동산',
      address: '서울특별시 성북구 동소문로 109 (동선동4가)',
      commentCount: 89,
    },
    {
      id: 3,
      name: '서초부동산',
      address: '서울특별시 서초구 (목 데이터)',
      commentCount: 5,
    },
  ]
  const mockFavoriteCommentsTotal = mockFavoriteAgents.reduce((sum, a) => sum + a.commentCount, 0)

  // users 테이블에서 user_type 조회 - AuthContext에서 관리하므로 제거됨

  // 공통코드 마스터 조회
  const fetchCodeMaster = async () => {
    try {
      setIsCodeLoading(true)
      // 마스터 조회
      const { data: masterData, error: masterError } = await supabase
        .from('common_code_master')
        .select('*')
        .order('sort_order', { ascending: true })

      if (masterError) {
        console.warn('[Admin] 마스터 조회 실패:', masterError.message, masterError.code)
        setIsCodeLoading(false)
        return
      }

      // 상세 개수 조회
      const { data: detailCountData } = await supabase
        .from('common_code_detail')
        .select('code_group')

      // 마스터별 상세 개수 계산
      const countMap: Record<string, number> = {}
      if (detailCountData) {
        detailCountData.forEach((item: any) => {
          countMap[item.code_group] = (countMap[item.code_group] || 0) + 1
        })
      }

      // 마스터 데이터에 상세 개수 추가
      const masterWithCount = (masterData || []).map((m: any) => ({
        ...m,
        detail_count: countMap[m.code_group] || 0,
      }))

      setCodeMasterList(masterWithCount)
    } catch (error: any) {
      console.warn('[Admin] 마스터 조회 예외:', error?.message)
    } finally {
      setIsCodeLoading(false)
    }
  }

  // 공통코드 상세 조회
  const fetchCodeDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('common_code_detail')
        .select('*')
        .order('code_group', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) {
        console.warn('[Admin] 상세 조회 실패:', error.message, error.code)
        return
      }

      setCodeDetailList(data || [])
    } catch (error: any) {
      console.warn('[Admin] 상세 조회 예외:', error?.message)
    }
  }

  // 마스터 코드 저장
  const saveMaster = async () => {
    if (!editingMaster) return
    
    try {
      if (isNewMaster) {
        // 신규 추가
        const { error } = await supabase
          .from('common_code_master')
          .insert({
            code_group: editingMaster.code_group,
            code_group_name: editingMaster.code_group_name,
            description: editingMaster.description || null,
            sta_ymd: editingMaster.sta_ymd,
            end_ymd: editingMaster.end_ymd || '9999-12-31',
            use_yn: editingMaster.use_yn,
          })
        
        if (error) {
          showError('마스터 코드 추가 실패: ' + error.message)
          return
        }
        // 토스트 표시
        setSaveSuccessMessage('마스터 코드가 추가되었습니다.')
        setShowSaveSuccessToast(true)
        setTimeout(() => setShowSaveSuccessToast(false), 3000)
      } else {
        // 수정
        const { error } = await supabase
          .from('common_code_master')
          .update({
            code_group_name: editingMaster.code_group_name,
            description: editingMaster.description || null,
            sta_ymd: editingMaster.sta_ymd,
            end_ymd: editingMaster.end_ymd || '9999-12-31',
            use_yn: editingMaster.use_yn,
            updated_at: new Date().toISOString(),
          })
          .eq('code_group', editingMaster.code_group)
        
        if (error) {
          showError('마스터 코드 수정 실패: ' + error.message)
          return
        }
        // 토스트 표시
        setSaveSuccessMessage('마스터 코드가 수정되었습니다.')
        setShowSaveSuccessToast(true)
        setTimeout(() => setShowSaveSuccessToast(false), 3000)
      }
      
      setEditingMaster(null)
      setIsNewMaster(false)
      fetchCodeMaster()
    } catch (error) {
      console.error('마스터 코드 저장 오류:', error)
      showError('저장 중 오류가 발생했습니다.')
    }
  }

  // 상세 코드 저장
  const saveDetail = async () => {
    if (!editingDetail) return
    
    try {
      if (isNewDetail) {
        // 신규 추가
        const { error } = await supabase
          .from('common_code_detail')
          .insert({
            code_group: editingDetail.code_group,
            code_value: editingDetail.code_value,
            code_name: editingDetail.code_name,
            description: editingDetail.description || null,
            sta_ymd: editingDetail.sta_ymd,
            end_ymd: editingDetail.end_ymd || '9999-12-31',
            use_yn: editingDetail.use_yn,
            sort_order: editingDetail.sort_order,
            extra_value1: editingDetail.extra_value1 || null,
            extra_value2: editingDetail.extra_value2 || null,
            extra_value3: editingDetail.extra_value3 || null,
            extra_value4: editingDetail.extra_value4 || null,
            extra_value5: editingDetail.extra_value5 || null,
          })
        
        if (error) {
          showError('상세 코드 추가 실패: ' + error.message)
          return
        }
        // 토스트 표시
        setSaveSuccessMessage('상세 코드가 추가되었습니다.')
        setShowSaveSuccessToast(true)
        setTimeout(() => setShowSaveSuccessToast(false), 3000)
      } else {
        // 수정
        const { error } = await supabase
          .from('common_code_detail')
          .update({
            code_group: editingDetail.code_group,
            code_value: editingDetail.code_value,
            code_name: editingDetail.code_name,
            description: editingDetail.description || null,
            sta_ymd: editingDetail.sta_ymd,
            end_ymd: editingDetail.end_ymd || '9999-12-31',
            use_yn: editingDetail.use_yn,
            sort_order: editingDetail.sort_order,
            extra_value1: editingDetail.extra_value1 || null,
            extra_value2: editingDetail.extra_value2 || null,
            extra_value3: editingDetail.extra_value3 || null,
            extra_value4: editingDetail.extra_value4 || null,
            extra_value5: editingDetail.extra_value5 || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDetail.id)
        
        if (error) {
          showError('상세 코드 수정 실패: ' + error.message)
          return
        }
        // 토스트 표시
        setSaveSuccessMessage('상세 코드가 수정되었습니다.')
        setShowSaveSuccessToast(true)
        setTimeout(() => setShowSaveSuccessToast(false), 3000)
      }
      
      setEditingDetail(null)
      setIsNewDetail(false)
      fetchCodeDetail()
      fetchCodeMaster() // 개수 업데이트
    } catch (error) {
      console.error('상세 코드 저장 오류:', error)
      showError('저장 중 오류가 발생했습니다.')
    }
  }

  // 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      setIsUserLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('supabase_user_id, email, nickname, user_type, user_grade, created_at, last_login_at')
        .order('created_at', { ascending: false })

      if (error) {
        setIsUserLoading(false)
        return
      }

      // 각 사용자의 리뷰 수 조회
      const userIds = (data || []).map((u: any) => u.supabase_user_id).filter(Boolean)
      let reviewCountMap: Record<string, number> = {}
      if (userIds.length > 0) {
        const { data: reviews } = await supabase
          .from('agent_reviews')
          .select('supabase_user_id')
          .in('supabase_user_id', userIds)
        if (reviews) {
          reviews.forEach((r: any) => {
            reviewCountMap[r.supabase_user_id] = (reviewCountMap[r.supabase_user_id] || 0) + 1
          })
        }
      }

      const enriched = (data || []).map((u: any) => ({
        ...u,
        review_count: reviewCountMap[u.supabase_user_id] || 0,
      }))
      setUserList(enriched)
    } catch (error) {
      // 모든 오류 조용히 처리
    } finally {
      setIsUserLoading(false)
    }
  }

  // 사용자별 리뷰 조회
  const loadUserReviews = async (userId: string, nickname: string) => {
    setIsUserReviewLoading(true)
    try {
      const { data, error } = await supabase
        .from('agent_reviews')
        .select(`
          id, agent_name, contract_date, transaction_tag, review_text, created_at,
          fee_satisfaction, expertise, kindness, property_reliability, response_speed,
          agent:agent_master(agent_name, road_address)
        `)
        .eq('supabase_user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        // fallback: agent join 없이 재시도
        const { data: fallback } = await supabase
          .from('agent_reviews')
          .select('id, agent_name, contract_date, transaction_tag, review_text, created_at, fee_satisfaction, expertise, kindness, property_reliability, response_speed')
          .eq('supabase_user_id', userId)
          .order('created_at', { ascending: false })

        const reviews = (fallback || []).map((r: any) => {
          const fields = [r.fee_satisfaction, r.expertise, r.kindness, r.property_reliability, r.response_speed].filter(Boolean)
          const avg = fields.length > 0 ? (fields.reduce((a: number, b: number) => a + b, 0) / fields.length).toFixed(1) : '-'
          return { ...r, agent_road_address: '', avg_rating: avg }
        })
        setUserReviewPopup({ userId, nickname, reviews })
      } else {
        const reviews = (data || []).map((r: any) => {
          const agent = r.agent || {}
          const fields = [r.fee_satisfaction, r.expertise, r.kindness, r.property_reliability, r.response_speed].filter(Boolean)
          const avg = fields.length > 0 ? (fields.reduce((a: number, b: number) => a + b, 0) / fields.length).toFixed(1) : '-'
          return {
            id: r.id,
            agent_name: agent.agent_name || r.agent_name || '-',
            agent_road_address: agent.road_address || '',
            contract_date: r.contract_date || '-',
            transaction_tag: r.transaction_tag || '-',
            avg_rating: avg,
            review_text: r.review_text || '',
            created_at: r.created_at,
          }
        })
        setUserReviewPopup({ userId, nickname, reviews })
      }
    } catch (err) {
      console.error('[계정관리] 리뷰 조회 오류:', err)
    } finally {
      setIsUserReviewLoading(false)
    }
  }

  // 사용자 정보 저장
  const saveUser = async () => {
    if (!editingUser) return
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nickname: editingUser.nickname,
          user_type: editingUser.user_type,
          user_grade: editingUser.user_grade,
          updated_at: new Date().toISOString(),
        })
        .eq('supabase_user_id', editingUser.supabase_user_id)
      
      if (error) {
        showError('사용자 정보 수정 실패: ' + error.message)
        return
      }
      
      // 토스트 표시
      setSaveSuccessMessage('사용자 정보가 수정되었습니다.')
      setShowSaveSuccessToast(true)
      setTimeout(() => setShowSaveSuccessToast(false), 3000)
      
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      console.error('사용자 정보 저장 오류:', error)
      showError('저장 중 오류가 발생했습니다.')
    }
  }

  // ============ 신고 관리 함수 ============
  const loadReports = async () => {
    try {
      setIsReportsLoading(true)

      // 1) reports + review(agent_reviews -> agent_master) 조회
      //    주의: '*' 사용 시 PostgREST가 reporter_user_id FK(auth.users)를 자동 해석하려 해서 오류 발생
      //    → 필요한 컬럼만 명시적으로 지정
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id, review_id, reporter_user_id, reason, detail,
          status, admin_note, processed_at, processed_by, created_at, updated_at,
          review:agent_reviews!reports_review_id_fkey(
            id, review_text, agent_id, transaction_tag,
            fee_satisfaction, expertise, kindness, property_reliability, response_speed,
            praise_tags, regret_tags, contract_date, created_at, is_hidden,
            agent:agent_master(id, agent_name, road_address, agent_number)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[신고 관리] 조회 오류:', error)
        // fallback: join 없이 조회
        const { data: fallbackData } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
        if (fallbackData) setReports(fallbackData)
        return
      }

      // 2) reporter 정보를 별도로 조회 (reports.reporter_user_id → auth.users → public.users)
      const reporterIds = Array.from(new Set((data || []).map((r: any) => r.reporter_user_id).filter(Boolean))) as string[]
      let reporterMap: Record<string, { nickname: string | null; email: string | null }> = {}

      if (reporterIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('supabase_user_id, nickname, email')
          .in('supabase_user_id', reporterIds)

        if (usersData) {
          usersData.forEach((u: any) => {
            reporterMap[u.supabase_user_id] = { nickname: u.nickname, email: u.email }
          })
        }
      }

      // 3) reporter 정보를 합침
      const enriched = (data || []).map((r: any) => ({
        ...r,
        reporter: reporterMap[r.reporter_user_id] || null,
      }))

      setReports(enriched)
    } catch (err) {
      console.error('[신고 관리] 오류:', err)
    } finally {
      setIsReportsLoading(false)
    }
  }

  const updateReportStatus = async (reportId: number, status: string, adminNote: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          admin_note: adminNote || null,
          processed_at: status === 'COMPLETED' || status === 'DISMISSED' ? new Date().toISOString() : null,
          processed_by: (await supabase.auth.getUser()).data.user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (error) {
        showError('상태 변경에 실패했습니다: ' + error.message)
      } else {
        setEditingReport(null)
        await loadReports()
      }
    } catch {
      showError('상태 변경 중 오류가 발생했습니다.')
    }
  }

  // 리뷰 숨김/해제 토글
  const toggleReviewHidden = async (reviewId: string, currentlyHidden: boolean) => {
    try {
      const adminUser = (await supabase.auth.getUser()).data.user
      const { error } = await supabase
        .from('agent_reviews')
        .update({
          is_hidden: !currentlyHidden,
          hidden_at: !currentlyHidden ? new Date().toISOString() : null,
          hidden_by: !currentlyHidden ? (adminUser?.id || null) : null,
        })
        .eq('id', reviewId)

      if (error) {
        showError('리뷰 숨김 처리에 실패했습니다: ' + error.message)
      } else {
        showSuccess(!currentlyHidden ? '리뷰가 숨김 처리되었습니다.' : '리뷰 숨김이 해제되었습니다.')
        await loadReports()
      }
    } catch {
      showError('리뷰 숨김 처리 중 오류가 발생했습니다.')
    }
  }

  const getReportStatusLabel = (status: string) => {
    switch (status) {
      case 'RECEIVED': return '접수'
      case 'PROCESSING': return '처리중'
      case 'COMPLETED': return '처리완료'
      case 'DISMISSED': return '기각'
      default: return status
    }
  }

  const getReportStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'RECEIVED': return { background: '#fef3c7', color: '#92400e' }
      case 'PROCESSING': return { background: '#dbeafe', color: '#1e40af' }
      case 'COMPLETED': return { background: '#dcfce7', color: '#166534' }
      case 'DISMISSED': return { background: '#f1f5f9', color: '#64748b' }
      default: return {}
    }
  }

  const getReportReasonLabel = (reason: string) => {
    switch (reason) {
      case 'fake': return '허위 리뷰'
      case 'privacy': return '개인정보 노출'
      case 'other': return '기타'
      default: return reason
    }
  }

  // ============ 배치 관리 함수 ============
  const loadBatchJobs = async () => {
    try {
      setIsBatchLoading(true)
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .order('id', { ascending: true })

      if (error) {
        console.error('[배치] 로드 오류:', error)
        return
      }
      setBatchJobs(data || [])
    } catch (err) {
      console.error('[배치] 로드 예외:', err)
    } finally {
      setIsBatchLoading(false)
    }
  }

  const loadBatchLogs = async (jobId: number) => {
    try {
      setIsBatchLogLoading(true)
      const { data, error } = await supabase
        .from('batch_job_logs')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('[배치 로그] 로드 오류:', error)
        return
      }
      setBatchLogs(data || [])
      setShowBatchLogs(jobId)
    } catch (err) {
      console.error('[배치 로그] 로드 예외:', err)
    } finally {
      setIsBatchLogLoading(false)
    }
  }

  const saveBatchJob = async (job: BatchJob) => {
    try {
      const { error } = await supabase
        .from('batch_jobs')
        .update({
          job_name: job.job_name,
          job_description: job.job_description,
          cron_expression: job.cron_expression,
          cron_description: job.cron_description,
          is_active: job.is_active,
          endpoint_url: job.endpoint_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      if (error) {
        console.error('[배치] 저장 오류:', error)
        showError('저장에 실패했습니다.')
        return
      }
      setEditingBatchJob(null)
      setSaveSuccessMessage('배치 작업이 저장되었습니다.')
      setShowSaveSuccessToast(true)
      setTimeout(() => setShowSaveSuccessToast(false), 2000)
      await loadBatchJobs()
    } catch (err) {
      console.error('[배치] 저장 예외:', err)
      showError('저장 중 오류가 발생했습니다.')
    }
  }

  const addBatchJob = async () => {
    if (!newBatchJob.job_name.trim() || !newBatchJob.cron_expression.trim()) {
      showWarning('작업명과 Cron 표현식은 필수입니다.')
      return
    }
    try {
      const { error } = await supabase
        .from('batch_jobs')
        .insert({
          job_name: newBatchJob.job_name,
          job_description: newBatchJob.job_description || null,
          cron_expression: newBatchJob.cron_expression,
          cron_description: newBatchJob.cron_description || null,
          endpoint_url: newBatchJob.endpoint_url || null,
          is_active: true,
        })

      if (error) {
        console.error('[배치] 추가 오류:', error)
        showError('추가에 실패했습니다.')
        return
      }
      setIsAddingBatchJob(false)
      setNewBatchJob({ job_name: '', job_description: '', cron_expression: '', cron_description: '', endpoint_url: '' })
      setSaveSuccessMessage('배치 작업이 추가되었습니다.')
      setShowSaveSuccessToast(true)
      setTimeout(() => setShowSaveSuccessToast(false), 2000)
      await loadBatchJobs()
    } catch (err) {
      console.error('[배치] 추가 예외:', err)
      showError('추가 중 오류가 발생했습니다.')
    }
  }

  const deleteBatchJob = async (jobId: number) => {
    if (!confirm('이 배치 작업을 삭제하시겠습니까?\n관련 로그도 함께 삭제됩니다.')) return
    try {
      const { error } = await supabase
        .from('batch_jobs')
        .delete()
        .eq('id', jobId)

      if (error) {
        console.error('[배치] 삭제 오류:', error)
        showError('삭제에 실패했습니다.')
        return
      }
      setSaveSuccessMessage('배치 작업이 삭제되었습니다.')
      setShowSaveSuccessToast(true)
      setTimeout(() => setShowSaveSuccessToast(false), 2000)
      await loadBatchJobs()
    } catch (err) {
      console.error('[배치] 삭제 예외:', err)
      showError('삭제 중 오류가 발생했습니다.')
    }
  }

  const toggleBatchJobActive = async (job: BatchJob) => {
    try {
      const { error } = await supabase
        .from('batch_jobs')
        .update({ is_active: !job.is_active, updated_at: new Date().toISOString() })
        .eq('id', job.id)

      if (error) {
        console.error('[배치] 상태 변경 오류:', error)
        return
      }
      await loadBatchJobs()
    } catch (err) {
      console.error('[배치] 상태 변경 예외:', err)
    }
  }

  const runBatchJobManually = async (job: BatchJob) => {
    // 이미 실행 중이면 무시
    if (runningBatchJobId) return

    showAlert(`"${job.job_name}" 배치를 수동 실행하시겠습니까?`, {
      title: '배치 수동 실행',
      icon: '⚙️',
      onClose: () => { executeBatchJob(job) },
    })
  }

  const executeBatchJob = async (job: BatchJob) => {
    // 경과 시간 타이머 시작
    setRunningBatchJobId(job.id)
    setBatchRunElapsed(0)
    const timerStart = Date.now()
    const timer = setInterval(() => {
      setBatchRunElapsed(Math.floor((Date.now() - timerStart) / 1000))
    }, 1000)

    try {
      // 로그 기록 - RUNNING
      const { data: logData } = await supabase
        .from('batch_job_logs')
        .insert({
          job_id: job.id,
          status: 'RUNNING',
          started_at: new Date().toISOString(),
          message: '수동 실행',
        })
        .select('id')
        .single()

      // 배치 상태 업데이트
      await supabase
        .from('batch_jobs')
        .update({
          last_run_at: new Date().toISOString(),
          last_status: 'RUNNING',
          last_message: '수동 실행 중...',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      await loadBatchJobs()

      // endpoint_url이 있으면 실제 호출
      if (job.endpoint_url) {
        try {
          // 상대 경로면 현재 도메인 기준으로 절대 URL 생성
          const url = job.endpoint_url.startsWith('/') 
            ? `${window.location.origin}${job.endpoint_url}` 
            : job.endpoint_url
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: job.id }),
          })
          const resultJson = await response.json().catch(() => null)
          const elapsed = ((Date.now() - timerStart) / 1000).toFixed(1)
          const resultMessage = response.ok 
            ? (resultJson?.message || `수동 실행 성공 (${elapsed}초)`) 
            : `실행 실패 (HTTP ${response.status}, ${elapsed}초)`
          const resultStatus = response.ok ? 'SUCCESS' : 'FAILED'

          // 로그 완료 업데이트
          if (logData?.id) {
            await supabase
              .from('batch_job_logs')
              .update({
                status: resultStatus,
                finished_at: new Date().toISOString(),
                message: resultMessage,
              })
              .eq('id', logData.id)
          }

          // 배치 상태 업데이트
          await supabase
            .from('batch_jobs')
            .update({
              last_status: resultStatus,
              last_message: resultMessage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id)

          // 결과에 따라 다른 알림 표시
          if (response.ok) {
            const details = resultJson?.details
            if (details) {
              showSuccess(
                `INSERT ${details.inserted || 0}건, UPDATE ${details.updated || 0}건, 오류 ${details.errors || 0}건\nAPI 호출 ${details.apiCalls || 0}회 (소요시간: ${details.elapsed || elapsed + 's'})`,
                { title: '배치 실행 완료' }
              )
            } else {
              showSuccess(resultMessage, { title: '배치 실행 완료' })
            }
          } else {
            showError(`${resultMessage}\n${resultJson?.error || ''}`, { title: '배치 실행 실패' })
          }

        } catch (fetchErr: any) {
          const elapsed = ((Date.now() - timerStart) / 1000).toFixed(1)
          if (logData?.id) {
            await supabase
              .from('batch_job_logs')
              .update({
                status: 'FAILED',
                finished_at: new Date().toISOString(),
                message: `실행 오류 (${elapsed}초)`,
                error_detail: fetchErr?.message || '알 수 없는 오류',
              })
              .eq('id', logData.id)
          }
          await supabase
            .from('batch_jobs')
            .update({
              last_status: 'FAILED',
              last_message: fetchErr?.message || `실행 오류 (${elapsed}초)`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id)
          showError(`API 호출 중 오류가 발생했습니다.\n${fetchErr?.message || '알 수 없는 오류'}`, { title: '배치 실행 오류' })
        }
      } else {
        // endpoint 없으면 바로 성공 처리
        if (logData?.id) {
          await supabase
            .from('batch_job_logs')
            .update({
              status: 'SUCCESS',
              finished_at: new Date().toISOString(),
              message: '수동 실행 완료 (엔드포인트 미설정)',
            })
            .eq('id', logData.id)
        }
        await supabase
          .from('batch_jobs')
          .update({
            last_status: 'SUCCESS',
            last_message: '수동 실행 완료 (엔드포인트 미설정)',
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)
        showWarning('엔드포인트 URL이 설정되지 않았습니다.', { title: '배치 실행' })
      }

      await loadBatchJobs()
    } catch (err) {
      console.error('[배치] 수동 실행 예외:', err)
      showError('배치 실행 중 오류가 발생했습니다.')
    } finally {
      clearInterval(timer)
      setRunningBatchJobId(null)
      setBatchRunElapsed(0)
    }
  }

  // cron 표현식 프리셋
  const cronPresets = [
    { label: '매분', value: '* * * * *', desc: '매분 실행' },
    { label: '매시간', value: '0 * * * *', desc: '매시간 정각' },
    { label: '매일 02:00', value: '0 2 * * *', desc: '매일 새벽 2시' },
    { label: '매일 06:00', value: '0 6 * * *', desc: '매일 오전 6시' },
    { label: '매주 월요일 02:00', value: '0 2 * * 1', desc: '매주 월요일 새벽 2시' },
    { label: '매주 일요일 04:00', value: '0 4 * * 0', desc: '매주 일요일 새벽 4시' },
    { label: '매월 1일 02:00', value: '0 2 1 * *', desc: '매월 1일 새벽 2시' },
  ]

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const getBatchStatusLabel = (status: string) => {
    switch (status) {
      case 'RUNNING': return '실행 중'
      case 'SUCCESS': return '성공'
      case 'FAILED': return '실패'
      case 'IDLE': return '대기'
      default: return status
    }
  }

  const getBatchStatusStyle = (status: string) => {
    switch (status) {
      case 'RUNNING': return styles.batchStatusRunning
      case 'SUCCESS': return styles.batchStatusSuccess
      case 'FAILED': return styles.batchStatusFailed
      default: return ''
    }
  }

  // 리뷰 관리 로드
  const loadReviewMgmt = async (page = 0) => {
    try {
      setIsReviewMgmtLoading(true)
      // 이전 Blob URL 메모리 해제
      Object.values(reviewMgmtDecryptedImages).forEach(url => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
      })
      setReviewMgmtDecryptedImages({})
      const pageSize = 20
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, error } = await supabase
        .from('agent_reviews')
        .select(`
          id, agent_id, supabase_user_id, transaction_tag, agent_name,
          fee_satisfaction, expertise, kindness, property_reliability, response_speed,
          review_text, contract_date, created_at, is_hidden,
          agent_stamp, agent_stamp_confidence,
          contract_image_encrypted, contract_image_iv,
          agent:agent_master(id, agent_name, road_address, agent_number)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('[리뷰 관리] 조회 오류:', error)
        // fallback
        const { data: fallback } = await supabase
          .from('agent_reviews')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to)
        setReviewMgmtList(fallback || [])
      } else {
        // 작성자 닉네임 조회
        const userIds = Array.from(new Set((data || []).map((r: any) => r.supabase_user_id).filter(Boolean))) as string[]
        let userMap: Record<string, string> = {}
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('supabase_user_id, nickname')
            .in('supabase_user_id', userIds)
          if (usersData) {
            usersData.forEach((u: any) => { userMap[u.supabase_user_id] = u.nickname || '(미설정)' })
          }
        }
        const enriched = (data || []).map((r: any) => ({
          ...r,
          reviewer_nickname: userMap[r.supabase_user_id] || '(알수없음)',
        }))
        setReviewMgmtList(enriched)
      }
      setReviewMgmtPage(page)
    } catch (err) {
      console.error('[리뷰 관리] 오류:', err)
    } finally {
      setIsReviewMgmtLoading(false)
    }
  }

  // 리뷰 이미지 다운로드 (관리자)
  const downloadReviewImage = (reviewId: string, agentName?: string) => {
    const dataUrl = reviewMgmtDecryptedImages[reviewId]
    if (!dataUrl) return
    const link = document.createElement('a')
    link.href = dataUrl
    const safeName = (agentName || '계약서').replace(/[^가-힣a-zA-Z0-9]/g, '_')
    link.download = `review_${reviewId}_${safeName}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 리뷰 이미지 수정(재업로드) (관리자)
  const replaceReviewImage = async (reviewId: string, file: File) => {
    setReviewMgmtImageLoading(prev => ({ ...prev, [reviewId]: true }))
    try {
      // 파일 → base64 변환
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          // data:image/...;base64, 접두어 제거
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/admin/review-image', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, imageBase64: base64 }),
      })
      const data = await res.json()

      if (data.success) {
        showSuccess('이미지가 수정되었습니다. "이미지 보기"를 다시 클릭하여 확인하세요.')
        // 이전 복호화 캐시 제거 (새 이미지를 다시 복호화하도록)
        setReviewMgmtDecryptedImages(prev => {
          const next = { ...prev }
          delete next[reviewId]
          return next
        })
        // 리스트 새로고침
        await loadReviewMgmt(reviewMgmtPage)
      } else {
        showError(`이미지 수정 실패: ${data.error}`)
      }
    } catch (err) {
      console.error('[리뷰 관리] 이미지 수정 오류:', err)
      showError('이미지 수정 중 오류가 발생했습니다.')
    } finally {
      setReviewMgmtImageLoading(prev => ({ ...prev, [reviewId]: false }))
    }
  }

  // 리뷰 이미지 복호화
  const decryptReviewImage = async (reviewId: string, encrypted: string, iv: string) => {
    if (reviewMgmtDecryptedImages[reviewId]) return // 이미 복호화됨
    setReviewMgmtImageLoading(prev => ({ ...prev, [reviewId]: true }))
    try {
      // 바이너리 방식으로 요청 (모바일 호환 - Blob URL 사용)
      const res = await fetch('/api/decrypt-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encrypted, iv, returnType: 'binary' }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        setReviewMgmtDecryptedImages(prev => ({ ...prev, [reviewId]: blobUrl }))
      }
    } catch (err) {
      console.error('[리뷰 관리] 이미지 복호화 실패:', err)
    } finally {
      setReviewMgmtImageLoading(prev => ({ ...prev, [reviewId]: false }))
    }
  }

  // 데이터 분석 로드 (병렬 쿼리로 최적화)
  const loadAnalytics = async () => {
    try {
      setIsAnalyticsLoading(true)

      // 모든 쿼리를 병렬로 실행 (성능 3-5배 향상)
      const [
        { count: usersCount },
        { count: reviewsCount },
        { count: agentsCount },
        { data: reviews },
        { data: allReviews },
        { data: usersData },
        { data: surveyData },
        { data: surveyQuestions },
        { data: monthlyReviews },
        { data: monthlyUsers }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('agent_reviews').select('*', { count: 'exact', head: true }).or('is_hidden.is.null,is_hidden.eq.false'),
        supabase.from('agent_master').select('*', { count: 'exact', head: true }),
        supabase.from('agent_reviews').select('fee_satisfaction, expertise, kindness, property_reliability, response_speed').or('is_hidden.is.null,is_hidden.eq.false'),
        supabase.from('agent_reviews').select('praise_tags, regret_tags, transaction_tag, created_at').or('is_hidden.is.null,is_hidden.eq.false'),
        supabase.from('users').select('user_grade'),
        supabase.from('survey_responses').select('question_code, response_value'),
        supabase.from('common_code_detail').select('*').eq('code_group', 'SURVEY').eq('use_yn', 'Y').order('sort_order'),
        supabase.from('agent_reviews').select('created_at').gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()).or('is_hidden.is.null,is_hidden.eq.false'),
        supabase.from('users').select('created_at, provider').gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      ])

      // 평균 평점 계산
      let totalRating = 0
      let ratingCount = 0
      const ratingFields = ['fee_satisfaction', 'expertise', 'kindness', 'property_reliability', 'response_speed']
      
      reviews?.forEach((review: any) => {
        ratingFields.forEach(field => {
          if (review[field]) {
            totalRating += review[field]
            ratingCount++
          }
        })
      })

      const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0

      // 칭찬/아쉬움/거래 태그 집계
      const praiseCounts: Record<string, number> = {}
      const regretCounts: Record<string, number> = {}
      const transactionCounts: Record<string, number> = {}

      allReviews?.forEach((review: any) => {
        if (review.praise_tags && Array.isArray(review.praise_tags)) {
          review.praise_tags.forEach((tag: string) => {
            praiseCounts[tag] = (praiseCounts[tag] || 0) + 1
          })
        }
        if (review.regret_tags && Array.isArray(review.regret_tags)) {
          review.regret_tags.forEach((tag: string) => {
            regretCounts[tag] = (regretCounts[tag] || 0) + 1
          })
        }
        if (review.transaction_tag) {
          transactionCounts[review.transaction_tag] = (transactionCounts[review.transaction_tag] || 0) + 1
        }
      })

      const praiseTags = Object.entries(praiseCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }))

      const regretTags = Object.entries(regretCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }))

      const transactionTypes = Object.entries(transactionCounts)
        .map(([type, count]) => ({ type, count }))

      // 사용자 등급 분포
      const gradeCounts: Record<string, number> = {}
      usersData?.forEach((user: any) => {
        const grade = user.user_grade || '임장까비'
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1
      })

      const userGrades = Object.entries(gradeCounts)
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => b.count - a.count)

      // 상세 평가 평균
      const avgRatings: Record<string, number> = {}
      ratingFields.forEach(field => {
        const values = reviews?.map((r: any) => r[field]).filter(Boolean)
        if (values && values.length > 0) {
          avgRatings[field] = Number((values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(1))
        }
      })

      // 서베이 응답 집계
      const surveyResponses: Record<string, Record<string, number>> = {}
      surveyData?.forEach((response: any) => {
        if (!surveyResponses[response.question_code]) {
          surveyResponses[response.question_code] = {}
        }
        const value = response.response_value
        surveyResponses[response.question_code][value] = (surveyResponses[response.question_code][value] || 0) + 1
      })

      const surveyResponsesArray = surveyQuestions?.map((q: any) => ({
        question: q.code_name,
        code: q.code_value,
        responses: surveyResponses[q.code_value] || {}
      })) || []

      // 월별 리뷰 추이 (최근 6개월)

      const monthlyData: Record<string, number> = {}
      monthlyReviews?.forEach((review: any) => {
        const date = new Date(review.created_at)
        const monthKey = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
      })

      const monthlyTrend = Object.entries(monthlyData)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 6)
        .map(([month, count]) => ({ month, count }))

      // 월별 가입자 현황 (최근 6개월)
      const signupData: Record<string, { kakao: number; google: number; total: number }> = {}
      monthlyUsers?.forEach((u: any) => {
        const date = new Date(u.created_at)
        const monthKey = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!signupData[monthKey]) signupData[monthKey] = { kakao: 0, google: 0, total: 0 }
        signupData[monthKey].total++
        const p = (u.provider || '').toLowerCase()
        if (p.includes('kakao')) signupData[monthKey].kakao++
        else if (p.includes('google')) signupData[monthKey].google++
      })
      const monthlySignups = Object.entries(signupData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({ month, ...data }))

      setAnalyticsData({
        totalUsers: usersCount || 0,
        totalReviews: reviewsCount || 0,
        totalAgents: agentsCount || 0,
        avgRating: avgRating,
        praiseTags,
        regretTags,
        transactionTypes,
        userGrades,
        avgRatings,
        surveyResponses: surveyResponsesArray,
        monthlyTrend,
        monthlySignups
      })
    } catch (error) {
      console.error('[데이터 분석] 로드 오류:', error)
    } finally {
      setIsAnalyticsLoading(false)
    }
  }

  // 광고/제휴/오류 문의 목록 조회
  const fetchPartnershipInquiries = async () => {
    try {
      setIsPartnershipLoading(true)
      const { data, error } = await supabase
        .from('partnership_inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setIsPartnershipLoading(false)
        return
      }

      setPartnershipList(data || [])
    } catch (error) {
      // 모든 오류 조용히 처리
    } finally {
      setIsPartnershipLoading(false)
    }
  }

  // 문의 상태 업데이트
  const updateInquiryStatus = async (id: number, status: string, reply?: string) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      }
      
      if (reply) {
        updateData.admin_reply = reply
        updateData.replied_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('partnership_inquiries')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      await fetchPartnershipInquiries()
      setSelectedInquiry(null)
      setReplyText('')
      
      setSaveSuccessMessage('저장되었습니다')
      setShowSaveSuccessToast(true)
      setTimeout(() => setShowSaveSuccessToast(false), 2000)
    } catch (error) {
      showError('저장 중 오류가 발생했습니다.')
    }
  }

  // 사용자 정보 가져오기 - AuthContext에서 관리하므로 제거됨

  // 모달이 열릴 때 body 스크롤 잠금
  const anyModalOpen = isLoginModalOpen || isFavoritesModalOpen || isSettingsModalOpen || isGradeInfoModalOpen || isPartnershipModalOpen || isPolicyModalOpen || isMyContractsModalOpen || isContractDetailModalOpen || isAdminModalOpen
  useEffect(() => {
    if (anyModalOpen) {
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
  }, [anyModalOpen])

  // ── 관리자 데이터 로드 함수 (재사용 가능) ──
  const loadAdminData = useCallback(async (menu: string) => {
    if (!isAdminScreenOpen) return
    
    try {
      if (menu === 'common-code') {
        await Promise.all([fetchCodeMaster(), fetchCodeDetail()])
      } else if (menu === 'analytics') {
        await loadAnalytics()
      } else if (menu === 'review-mgmt') {
        await loadReviewMgmt(0)
      } else if (menu === 'account') {
        await fetchUsers()
      } else if (menu === 'batch') {
        await loadBatchJobs()
      }
    } catch (error) {
      console.warn('[Admin] 데이터 로드 실패:', error)
    }
  }, [isAdminScreenOpen])

  // 관리자 화면 데이터 로드
  // session 의존성: 탭 복귀 시 useSessionSync가 세션을 갱신하면
  // session 객체가 변경 → 이 effect가 재실행 → 데이터 자동 재조회
  // (타이머나 visibilitychange 핸들러가 불필요)
  useEffect(() => {
    let isMounted = true
    
    if (isAdminScreenOpen && isMounted) {
      loadAdminData(adminMenu)
    }
    
    return () => {
      isMounted = false
    }
  }, [isAdminScreenOpen, adminMenu, session, loadAdminData])

  // 관리자 화면 열릴 때 광고/제휴/오류 문의 데이터 로드
  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      if (isAdminScreenOpen && adminMenu === 'partnership' && isMounted) {
        await fetchPartnershipInquiries()
      }
    }
    
    loadData()
    
    return () => {
      isMounted = false
    }
  }, [isAdminScreenOpen, adminMenu])

  // 관리자 화면 열릴 때 신고 데이터 로드
  useEffect(() => {
    let isMounted = true
    
    if (isAdminScreenOpen && adminMenu === 'reports' && isMounted) {
      loadReports()
    }
    
    return () => {
      isMounted = false
    }
  }, [isAdminScreenOpen, adminMenu])

  // 콘텐츠 노출 설정 로드
  const loadVisibilitySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('common_code_detail')
        .select('code_value, description')
        .eq('code_group', 'SYSTEM_CONFIG')
        .in('code_value', ['ADVERTISEMENT_VISIBLE', 'SURVEY_VISIBLE', 'MAIN_AD_VISIBLE', 'AD_VIEW_DAILY_LIMIT'])

      if (!error && data) {
        data.forEach((item: any) => {
          if (item.code_value === 'ADVERTISEMENT_VISIBLE') {
            setAdVisibility(item.description?.startsWith('Y:') ? 'Y' : 'N')
          } else if (item.code_value === 'SURVEY_VISIBLE') {
            setSurveyVisibility(item.description?.startsWith('Y:') ? 'Y' : 'N')
          } else if (item.code_value === 'MAIN_AD_VISIBLE') {
            const desc = (item.description || '') as string
            setMainAdVisibility(desc.startsWith('Y') ? 'Y' : 'N')
            setMainAdPosition(desc.toUpperCase().includes('TOP') ? 'TOP' : 'BOTTOM')
            const upper = desc.toUpperCase()
            if (upper.includes('MOBILE')) setMainAdDevice('MOBILE')
            else if (upper.includes(',PC') || upper.endsWith('PC')) setMainAdDevice('PC')
            else setMainAdDevice('ALL')
          } else if (item.code_value === 'AD_VIEW_DAILY_LIMIT') {
            setAdViewDailyLimit(item.code_name || '3')
          }
        })
        console.log('[콘텐츠 노출] 설정 로드 완료:', data)
      }
    } catch (error) {
      console.error('[콘텐츠 노출] 설정 로드 오류:', error)
    }
  }

  // 관리자 화면 열릴 때 콘텐츠 노출 설정 로드
  useEffect(() => {
    let isMounted = true
    
    if (isAdminScreenOpen && adminMenu === 'content-visibility' && isMounted) {
      loadVisibilitySettings()
    }
    
    return () => {
      isMounted = false
    }
  }, [isAdminScreenOpen, adminMenu])

  const handleLogin = () => {
    setIsLoginModalOpen(true)
    logAccess({ action: 'login_modal_open' })
  }

  const handleCloseModal = () => {
    setIsLoginModalOpen(false)
  }

  const handleKakaoLogin = async () => {
    try {
      await signInWithKakao()
      logAccess({ action: 'kakao_login_initiated' })
      // OAuth 리다이렉트가 발생하므로 모달은 자동으로 닫힘
    } catch (error) {
      console.error('카카오 로그인 오류:', error)
      showError('카카오 로그인 중 오류가 발생했습니다.')
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
      logAccess({ action: 'google_login_initiated' })
      // OAuth 리다이렉트가 발생하므로 모달은 자동으로 닫힘
    } catch (error) {
      console.error('구글 로그인 오류:', error)
      showError('구글 로그인 중 오류가 발생했습니다.')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      logAccess({ action: 'logout' })
      
      // 로그아웃 시 화면 초기화 이벤트 발생
      window.dispatchEvent(new CustomEvent('user:logout'))
    } catch (error) {
      console.error('로그아웃 오류:', error)
      // 오류 발생 시에만 알림
      showError('로그아웃 중 오류가 발생했습니다.')
    }
  }


  const closeProfileModal = () => {
    // 프로필 모달 제거됨 (사이드바로 대체)
  }

  const openSettingsModal = () => {
    setIsSettingsModalOpen(true)
  }

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false)
  }

  const openGradeInfoModal = () => {
    setIsGradeInfoModalOpen(true)
  }

  const closeGradeInfoModal = () => {
    setIsGradeInfoModalOpen(false)
  }

  const openPartnershipModal = () => {
    setIsPartnershipModalOpen(true)
  }

  const closePartnershipModal = () => {
    setIsPartnershipModalOpen(false)
  }

  const openPolicyModal = () => {
    setIsPolicyModalOpen(true)
  }

  const closePolicyModal = () => {
    setIsPolicyModalOpen(false)
  }

  const openAdminModal = () => {
    setIsAdminModalOpen(true)
  }

  const closeAdminModal = () => {
    setIsAdminModalOpen(false)
  }

  const openAdminScreen = () => {
    setIsAdminScreenOpen(true)
  }

  const closeAdminScreen = () => {
    setIsAdminScreenOpen(false)
    // 페이지 최상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 관리자 체크 (user_type이 'ADMIN'인 경우)
  const isAdmin = userType === 'ADMIN'

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toISOString().slice(0, 10)
  }

  const filteredUsers = userList.filter((item) => {
    const term = userSearchTerm.trim().toLowerCase()
    const matchesTerm =
      term === '' ||
      (item.email || '').toLowerCase().includes(term) ||
      (item.nickname || '').toLowerCase().includes(term)

    const matchesType = userTypeFilter === '' || item.user_type === userTypeFilter

    return matchesTerm && matchesType
  })

  const openFavoritesModal = () => {
    setIsFavoritesModalOpen(true)
  }

  const closeFavoritesModal = () => {
    setIsFavoritesModalOpen(false)
  }

  return (
    <>
      {/* 사이드바 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        isAdmin={isAdmin}
        onGradeInfoClick={() => {
          setIsGradeInfoModalOpen(true)
        }}
        onAdminScreenClick={() => {
          setIsAdminScreenOpen(true)
          setIsSidebarOpen(false)
        }}
        onLogout={async () => {
          try {
            await signOut()
            setIsSidebarOpen(false)
            logAccess({ action: 'logout' })
            
            // 로그아웃 시 화면 초기화 이벤트 발생
            window.dispatchEvent(new CustomEvent('user:logout'))
          } catch (error) {
            showError('로그아웃 중 오류가 발생했습니다.')
          }
        }}
      />

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div 
            className={styles.logo}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('logo:click'))
            }}
            style={{ cursor: 'pointer' }}
          >
            복비까비
          </div>
          <div className={styles.rightSection}>
            {user ? (
              <div className={styles.userMenu}>
                <button
                  className={styles.iconButton}
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="메뉴"
                >
                  {/* 햄버거 아이콘 */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 12H21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 6H21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 18H21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button className={styles.loginButton} onClick={handleLogin}>
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {isLoginModalOpen && (
        <div className={styles.overlay} onClick={handleCloseModal}>
          <div className={styles.loginModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.loginModalContent}>
              <div className={styles.loginModalHeader}>
                <h3 className={styles.loginModalTitle}>로그인</h3>
                <button
                  className={styles.closeButton}
                  onClick={handleCloseModal}
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
              <div className={styles.loginModalMessage}>
                <p className={styles.loginMessageText}>
                  내 복비가 아깝지 않도록, <br />검증된 중개사 찾기
                  복비까비에서 시작하세요
                </p>
              </div>
              <div className={styles.loginOptions}>
                <button
                  className={styles.kakaoLoginButton}
                  onClick={handleKakaoLogin}
                  disabled={isLoading}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 3C6.48 3 2 6.48 2 11C2 14.54 4.5 17.64 8 18.68V21L10.5 19.5C11.33 19.67 12.17 19.75 13 19.75C18.52 19.75 23 16.27 23 11C23 6.48 18.52 3 12 3Z"
                      fill="#3C1E1E"
                    />
                  </svg>
                  카카오로 시작하기
                </button>
                <button
                  className={styles.googleLoginButton}
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  구글로 시작하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 모달 - 사이드바로 대체되어 제거됨 */}
      {false && (
        <div className={styles.overlay} onClick={closeProfileModal}>
          <div className={styles.profileModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.profileModalContent}>
              <div className={styles.profileModalHeader}>
                <h3 className={styles.profileModalTitle}>프로필</h3>
                <button
                  className={styles.closeButton}
                  onClick={closeProfileModal}
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
              <div className={styles.profileInfo}>
                <div className={styles.profileDetails}>
                  <div className={styles.profileNameRow}>
                    <div className={styles.profileNameWithBadge}>
                      <h4 className={styles.profileName}>
                        {user?.user_metadata?.name ||
                          user?.user_metadata?.kakao_account?.profile?.nickname ||
                          user?.user_metadata?.properties?.nickname ||
                          user?.user_metadata?.nickname ||
                          '사용자'}
                      </h4>
                      <div className={styles.gradeBadgeGroup}>
                        <span className={styles.gradeBadge} aria-label="등급: 갓까비">
                          갓까비
                        </span>
                        <button
                          className={styles.gradeInfoButton}
                          type="button"
                          onClick={openGradeInfoModal}
                          aria-label="등급 안내"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 10V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <button
                      className={styles.settingsButton}
                      onClick={openSettingsModal}
                      aria-label="설정"
                      type="button"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.78 16.87A2 2 0 0 1 18.36 20.29L18.28 20.3A2 2 0 0 1 16.21 18.88L16.2 18.82A1.65 1.65 0 0 0 14.95 17.7A1.65 1.65 0 0 0 13 18.09L12.9 18.15A2 2 0 0 1 11.1 18.15L11 18.09A1.65 1.65 0 0 0 9.05 17.7A1.65 1.65 0 0 0 7.8 18.82L7.79 18.88A2 2 0 0 1 5.72 20.3L5.64 20.29A2 2 0 0 1 4.22 16.87L4.27 16.82A1.65 1.65 0 0 0 4.6 15A1.65 1.65 0 0 0 3.25 13.87L3.17 13.85A2 2 0 0 1 3.17 10.15L3.25 10.13A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 4.27 7.18L4.22 7.13A2 2 0 0 1 5.64 3.71L5.72 3.7A2 2 0 0 1 7.79 5.12L7.8 5.18A1.65 1.65 0 0 0 9.05 6.3A1.65 1.65 0 0 0 11 5.91L11.1 5.85A1.65 1.65 0 0 1 12.9 5.85L13 5.91A1.65 1.65 0 0 0 14.95 6.3A1.65 1.65 0 0 0 16.2 5.18L16.21 5.12A2 2 0 0 1 18.28 3.7L18.36 3.71A2 2 0 0 1 19.78 7.13L19.73 7.18A1.65 1.65 0 0 0 19.4 9A1.65 1.65 0 0 0 20.75 10.13L20.83 10.15A2 2 0 0 1 20.83 13.85L20.75 13.87A1.65 1.65 0 0 0 19.4 15Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  <p className={styles.profileEmail}>{user?.email || user?.user_metadata?.kakao_account?.email || ''}</p>

                  <div className={styles.profileStats}>작성 리뷰 12 · 도움 58</div>
                </div>
              </div>
              <div className={styles.profileActions}>
                <div className={styles.navList}>
                  <button 
                    className={styles.navItem} 
                    type="button"
                    onClick={async () => {
                      if (!user) return

                      // 내 계약서 리스트 가져오기
                      const { data, error } = await supabase
                        .from('agent_reviews')
                        .select(`
                          *,
                          agent:agent_master(agent_name, road_address, lot_address)
                        `)
                        .eq('supabase_user_id', user.id)
                        .order('created_at', { ascending: false })

                      if (!error && data) {
                        setMyContracts(data)
                        setIsMyContractsModalOpen(true)
                        closeProfileModal()
                      }
                    }}
                  >
                    <span className={styles.navLeft}>
                      <span className={styles.navIcon} aria-hidden="true">
                        📄
                      </span>
                      <span className={styles.navLabel}>내 계약서 보기</span>
                    </span>
                    <span className={styles.navRight} aria-hidden="true">
                      <span className={styles.chevron}>›</span>
                    </span>
                  </button>

                  <button className={styles.navItem} type="button" onClick={openFavoritesModal}>
                    <span className={styles.navLeft}>
                      <span className={styles.navIcon} aria-hidden="true">
                        ❤️
                      </span>
                      <span className={styles.navLabel}>내 관심 부동산</span>
                    </span>
                    <span className={styles.navRight}>
                      <span className={styles.inlineBadge} aria-label={`관심 부동산 댓글 ${mockFavoriteCommentsTotal}개`}>
                        {mockFavoriteCommentsTotal}
                      </span>
                      <span className={styles.chevron} aria-hidden="true">
                        ›
                      </span>
                    </span>
                  </button>

                  <button className={styles.navItem} type="button" onClick={openPartnershipModal}>
                    <span className={styles.navLeft}>
                      <span className={styles.navIcon} aria-hidden="true">
                        🤝
                      </span>
                      <span className={styles.navLabel}>광고/제휴/오류 문의</span>
                    </span>
                    <span className={styles.navRight} aria-hidden="true">
                      <span className={styles.chevron}>›</span>
                    </span>
                  </button>

                  <button className={styles.navItem} type="button" onClick={openPolicyModal}>
                    <span className={styles.navLeft}>
                      <span className={styles.navIcon} aria-hidden="true">
                        📄
                      </span>
                      <span className={styles.navLabel}>약관/정책</span>
                    </span>
                    <span className={styles.navRight} aria-hidden="true">
                      <span className={styles.chevron}>›</span>
                    </span>
                  </button>
                </div>

                <button className={styles.logoutLink} onClick={handleLogout} type="button">
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 광고/제휴/오류 문의 */}
      {isPartnershipModalOpen && user && (
        <div className={styles.overlay} onClick={closePartnershipModal}>
          <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoModalContent}>
              <div className={styles.infoModalHeader}>
                <h3 className={styles.infoModalTitle}>광고/제휴/오류 문의</h3>
                <button className={styles.closeButton} onClick={closePartnershipModal} aria-label="닫기">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div className={styles.infoModalBody}>
                <form className={styles.partnershipForm} onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  
                  if (!user) {
                    showWarning('로그인이 필요합니다.')
                    return
                  }

                  try {
                    const { error } = await apiRequest(
                      () => supabase
                        .from('partnership_inquiries')
                        .insert({
                          supabase_user_id: user.id,
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
                      showSuccess('문의가 접수되었습니다.\n빠른 시일 내에 답변드리겠습니다.')
                      e.currentTarget.reset()
                      closePartnershipModal()
                    } else {
                      showError('문의 접수 중 오류가 발생했습니다.')
                    }
                  } catch (error: any) {
                    showError('문의 접수 중 오류가 발생했습니다.')
                  }
                }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>문의 유형 *</label>
                    <input type="hidden" name="type" value={headerInquiryType} />
                    <div className={styles.chipGroup}>
                      {['광고', '제휴', '오류', '기타'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          className={`${styles.chip} ${headerInquiryType === type ? styles.chipActive : ''}`}
                          onClick={() => setHeaderInquiryType(type)}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>이름 *</label>
                    <input type="text" name="name" required className={styles.formInput} placeholder="홍길동" />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>이메일 *</label>
                    <input type="email" name="email" required className={styles.formInput} placeholder="example@email.com" defaultValue={user.email || ''} />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>회사명</label>
                    <input type="text" name="company" className={styles.formInput} placeholder="회사명 (선택)" />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>연락처 *</label>
                    <input type="tel" name="phone" required className={styles.formInput} placeholder="010-0000-0000" />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>제목 *</label>
                    <input type="text" name="title" required className={styles.formInput} placeholder="문의 제목" />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>문의 내용 *</label>
                    <textarea name="content" required className={styles.formTextarea} rows={6} placeholder="문의하실 내용을 상세히 작성해주세요." />
                  </div>
                  
                  <button type="submit" className={styles.submitButton}>문의하기</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 약관/정책 */}
      {isPolicyModalOpen && user && (
        <div className={styles.overlay} onClick={closePolicyModal}>
          <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoModalContent}>
              <div className={styles.infoModalHeader}>
                <h3 className={styles.infoModalTitle}>약관/정책</h3>
                <button className={styles.closeButton} onClick={closePolicyModal} aria-label="닫기">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div className={styles.infoModalBody}>
                <div className={styles.infoList}>
                  <div className={styles.infoListItem}>서비스 이용약관 (목)</div>
                  <div className={styles.infoListItem}>개인정보 처리방침 (목)</div>
                  <div className={styles.infoListItem}>위치기반 서비스 이용약관 (목)</div>
                </div>
                <p className={styles.infoHint}>추후 실제 문서 링크로 연결하면 됩니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 등급 안내 팝업 */}
      {isGradeInfoModalOpen && user && (
        <div className={styles.overlay} onClick={closeGradeInfoModal}>
          <div className={styles.gradeInfoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.gradeInfoModalContent}>
              <div className={styles.gradeInfoModalHeader}>
                <h3 className={styles.gradeInfoModalTitle}>등급 안내</h3>
                <button className={styles.closeButton} onClick={closeGradeInfoModal} aria-label="닫기">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

              <div className={styles.gradeInfoList}>
                <div className={styles.gradeInfoItem}>
                  <span className={styles.gradeLabel}>임장까비</span>
                  <div className={styles.gradeDesc}>
                    <div className={styles.gradeTagline}>좋은 집 어디 없나</div>
                    아직 계약 경험은 없지만, 열심히 발품 팔며 정보를 탐색하는 단계
                    <div className={styles.gradeCondition}>달성 조건: 신규 가입자</div>
                  </div>
                </div>
                <div className={styles.gradeInfoItem}>
                  <span className={styles.gradeLabel}>인주까비</span>
                  <div className={styles.gradeDesc}>
                    <div className={styles.gradeTagline}>첫 도장 꾹!</div>
                    첫 계약서에 인주가 마르기도 전! 따끈따끈한 실전 경험을 인증한 단계
                    <div className={styles.gradeCondition}>달성 조건: 리뷰 1~3건 등록</div>
                  </div>
                </div>
                <div className={styles.gradeInfoItem}>
                  <span className={styles.gradeLabel}>명당까비</span>
                  <div className={styles.gradeDesc}>
                    <div className={styles.gradeTagline}>여기가 명당이로구나!</div>
                    여러 번의 계약 경험을 통해, 좋은 집과 중개사를 알아보는 '안목'을 갖춘 고수 단계
                    <div className={styles.gradeCondition}>달성 조건: 리뷰 4~9건 등록</div>
                  </div>
                </div>
                <div className={styles.gradeInfoItem}>
                  <span className={styles.gradeLabel}>갓까비</span>
                  <div className={styles.gradeDesc}>
                    <div className={styles.gradeTagline}>부동산의 신</div>
                    산전수전 다 겪어 부동산의 이치를 통달한, 모두가 우러러보는 최고 존엄 단계
                    <div className={styles.gradeCondition}>달성 조건: 리뷰 10건 등록</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 설정 팝업 */}
      {isSettingsModalOpen && user && (
        <div className={styles.overlay} onClick={closeSettingsModal}>
          <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.settingsModalContent}>
              <div className={styles.settingsModalHeader}>
                <h3 className={styles.settingsModalTitle}>설정</h3>
                <button className={styles.closeButton} onClick={closeSettingsModal} aria-label="닫기">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div className={styles.settingsList}>
                <button
                  className={styles.settingsItem}
                  type="button"
                  onClick={() => {
                    // TODO: 알림설정 화면/모달 연결
                    showAlert('알림설정 (목)')
                  }}
                >
                  알림설정
                </button>
                <button
                  className={styles.settingsItem}
                  type="button"
                  onClick={() => {
                    // TODO: 서비스 설정 화면/모달 연결
                    showAlert('서비스 설정 (목)')
                  }}
                >
                  서비스 설정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 내 관심 부동산 모달 */}
      {isFavoritesModalOpen && user && (
        <div className={styles.overlay} onClick={closeFavoritesModal}>
          <div className={styles.favoritesModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.favoritesModalContent}>
              <div className={styles.favoritesModalHeader}>
                <h3 className={styles.favoritesModalTitle}>내 관심 부동산</h3>
                <button className={styles.closeButton} onClick={closeFavoritesModal} aria-label="닫기">
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

              <div className={styles.favoritesList}>
                {mockFavoriteAgents.length === 0 ? (
                  <div className={styles.favoritesState}>관심 부동산이 없습니다.</div>
                ) : (
                  mockFavoriteAgents.map((fav) => {
                    return (
                      <div key={fav.id} className={styles.favoriteItem}>
                        <div className={styles.favoriteInfo}>
                          <div className={styles.favoriteName}>{fav.name}</div>
                          {fav.address && <div className={styles.favoriteAddress}>{fav.address}</div>}
                        </div>
                        <div className={styles.favoriteRight}>
                          <span className={styles.commentCountBadge} aria-label={`댓글 ${fav.commentCount}개`}>
                            {fav.commentCount}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 관리자 모달 (프로필에서 접근) */}
      {isAdminModalOpen && user && isAdmin && (
        <div className={styles.overlay} onClick={closeAdminModal}>
          <div className={styles.adminModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.adminModalContent}>
              <div className={styles.adminModalHeader}>
                <h3 className={styles.adminModalTitle}>관리자</h3>
                <button className={styles.closeButton} onClick={closeAdminModal} aria-label="닫기">
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
              <div className={styles.adminMenuList}>
                <button
                  className={styles.adminMenuItem}
                  type="button"
                  onClick={() => {
                    closeAdminModal()
                    openAdminScreen()
                  }}
                >
                  <span className={styles.adminMenuIcon}>📋</span>
                  <span className={styles.adminMenuLabel}>공통코드 관리</span>
                </button>
                <button
                  className={styles.adminMenuItem}
                  type="button"
                  onClick={() => showAlert('사용자 관리 (목)')}
                >
                  <span className={styles.adminMenuIcon}>👥</span>
                  <span className={styles.adminMenuLabel}>사용자 관리</span>
                </button>
                <button
                  className={styles.adminMenuItem}
                  type="button"
                  onClick={() => showAlert('리뷰 관리 (목)')}
                >
                  <span className={styles.adminMenuIcon}>📝</span>
                  <span className={styles.adminMenuLabel}>리뷰 관리</span>
                </button>
                <button
                  className={styles.adminMenuItem}
                  type="button"
                  onClick={() => {
                    setAdminMenu('reports')
                    setIsAdminModalOpen(false)
                    setIsAdminScreenOpen(true)
                  }}
                >
                  <span className={styles.adminMenuIcon}>🚨</span>
                  <span className={styles.adminMenuLabel}>신고 관리</span>
                </button>
                <button
                  className={styles.adminMenuItem}
                  type="button"
                  onClick={() => showAlert('통계 (목)')}
                >
                  <span className={styles.adminMenuIcon}>📊</span>
                  <span className={styles.adminMenuLabel}>통계</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 관리자 화면 (전체 화면 - 사이드바 레이아웃) */}
      {isAdminScreenOpen && user && isAdmin && (
        <div className={styles.adminScreen}>
          {/* 상단 헤더 */}
          <div className={styles.adminScreenHeader}>
            <button
              className={styles.adminScreenBackButton}
              onClick={closeAdminScreen}
              aria-label="뒤로가기"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19 12H5M12 19L5 12L12 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className={styles.adminScreenTitle}>관리자</h1>
            {/* 모바일 햄버거 버튼 */}
            <button
              className={styles.adminMobileMenuButton}
              onClick={() => setIsMobileAdminMenuOpen(true)}
              aria-label="메뉴"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 12H21M3 6H21M3 18H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className={styles.adminScreenBody}>
            {/* 모바일 메뉴 모달 */}
            {isMobileAdminMenuOpen && (
              <div className={styles.mobileAdminMenuOverlay} onClick={() => setIsMobileAdminMenuOpen(false)}>
                <div className={styles.mobileAdminMenu} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.mobileAdminMenuHeader}>
                    <h2 className={styles.mobileAdminMenuTitle}>관리자 메뉴</h2>
                    <button
                      className={styles.mobileAdminMenuClose}
                      onClick={() => setIsMobileAdminMenuOpen(false)}
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
                  </div>
                  <nav className={styles.mobileAdminMenuNav}>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'common-code' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('common-code')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>📋</span>
                      <span className={styles.mobileAdminMenuLabel}>공통코드 관리</span>
                    </button>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'account' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('account')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>👥</span>
                      <span className={styles.mobileAdminMenuLabel}>계정 관리</span>
                    </button>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'batch' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('batch')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>⚙️</span>
                      <span className={styles.mobileAdminMenuLabel}>배치 관리</span>
                    </button>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'partnership' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('partnership')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>🤝</span>
                      <span className={styles.mobileAdminMenuLabel}>광고/제휴/오류 문의</span>
                    </button>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'survey' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('survey')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>📋</span>
                      <span className={styles.mobileAdminMenuLabel}>서베이 결과</span>
                    </button>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'content-visibility' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('content-visibility')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>👁️</span>
                      <span className={styles.mobileAdminMenuLabel}>콘텐츠 노출 관리</span>
                    </button>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'reports' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('reports')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>🚨</span>
                      <span className={styles.mobileAdminMenuLabel}>신고 관리</span>
                    </button>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'review-mgmt' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('review-mgmt')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>📋</span>
                      <span className={styles.mobileAdminMenuLabel}>리뷰 관리</span>
                    </button>
                    <button
                      className={`${styles.mobileAdminMenuItem} ${adminMenu === 'analytics' ? styles.mobileAdminMenuItemActive : ''}`}
                      onClick={() => {
                        setAdminMenu('analytics')
                        setIsMobileAdminMenuOpen(false)
                      }}
                    >
                      <span className={styles.mobileAdminMenuIcon}>📊</span>
                      <span className={styles.mobileAdminMenuLabel}>데이터 분석</span>
                    </button>
                  </nav>
                </div>
              </div>
            )}

            {/* 좌측 사이드바 (PC 전용) */}
            <aside className={styles.adminSidebar}>
              <nav className={styles.adminSidebarNav}>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'common-code' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('common-code')}
                >
                  <span className={styles.adminSidebarIcon}>📋</span>
                  <span className={styles.adminSidebarLabel}>공통코드 관리</span>
                </button>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'account' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('account')}
                >
                  <span className={styles.adminSidebarIcon}>👥</span>
                  <span className={styles.adminSidebarLabel}>계정 관리</span>
                </button>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'batch' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('batch')}
                >
                  <span className={styles.adminSidebarIcon}>⚙️</span>
                  <span className={styles.adminSidebarLabel}>배치 관리</span>
                </button>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'partnership' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('partnership')}
                >
                  <span className={styles.adminSidebarIcon}>🤝</span>
                  <span className={styles.adminSidebarLabel}>광고/제휴/오류 문의</span>
                </button>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'survey' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('survey')}
                >
                  <span className={styles.adminSidebarIcon}>📋</span>
                  <span className={styles.adminSidebarLabel}>서베이 결과</span>
                </button>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'content-visibility' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('content-visibility')}
                >
                  <span className={styles.adminSidebarIcon}>👁️</span>
                  <span className={styles.adminSidebarLabel}>콘텐츠 노출 관리</span>
                </button>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'reports' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('reports')}
                >
                  <span className={styles.adminSidebarIcon}>🚨</span>
                  <span className={styles.adminSidebarLabel}>신고 관리</span>
                </button>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'review-mgmt' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('review-mgmt')}
                >
                  <span className={styles.adminSidebarIcon}>📋</span>
                  <span className={styles.adminSidebarLabel}>리뷰 관리</span>
                </button>
                <button
                  className={`${styles.adminSidebarItem} ${adminMenu === 'analytics' ? styles.adminSidebarItemActive : ''}`}
                  onClick={() => setAdminMenu('analytics')}
                >
                  <span className={styles.adminSidebarIcon}>📊</span>
                  <span className={styles.adminSidebarLabel}>데이터 분석</span>
                </button>
              </nav>
            </aside>

            {/* 우측 컨텐츠 영역 */}
            <main className={styles.adminMainContent}>
              {/* 공통코드 관리 */}
              {adminMenu === 'common-code' && (
                <div className={styles.adminSectionWide}>
                  <div className={styles.adminSectionHeader}>
                    <div>
                      <h2 className={styles.adminSectionTitle}>공통코드 관리</h2>
                      <p className={styles.adminSectionDesc}>
                        마스터를 클릭하면 해당 코드그룹의 상세 정보가 표시됩니다.
                      </p>
                    </div>
                    {selectedCodeGroup && (
                      <button
                        className={styles.adminClearFilterBtn}
                        onClick={() => setSelectedCodeGroup(null)}
                      >
                        전체 보기
                      </button>
                    )}
                  </div>

                  <div className={styles.codeManagementGrid}>
                    {/* 좌측: Master 테이블 */}
                    <div className={styles.codeMasterPanel}>
                      <div className={styles.panelHeader}>
                        <h3 className={styles.panelTitle}>📋 코드 마스터</h3>
                        <button
                          className={styles.adminSmallAddButton}
                          type="button"
                          onClick={() => {
                            setIsNewMaster(true)
                            setEditingMaster({
                              code_group: '',
                              code_group_name: '',
                              description: '',
                              sta_ymd: new Date().toISOString().slice(0, 10),
                              end_ymd: '9999-12-31',
                              use_yn: 'Y',
                            })
                          }}
                        >
                          + 추가
                        </button>
                      </div>
                      <div className={styles.masterSearchBox}>
                        <input
                          type="text"
                          className={styles.masterSearchInput}
                          placeholder="코드그룹명 검색..."
                          value={masterSearchTerm}
                          onChange={(e) => setMasterSearchTerm(e.target.value)}
                        />
                        {masterSearchTerm && (
                          <button
                            className={styles.masterSearchClear}
                            onClick={() => setMasterSearchTerm('')}
                            type="button"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className={styles.masterDateFilter}>
                        <label className={styles.dateFilterLabel}>기간</label>
                        <input
                          type="date"
                          className={styles.dateFilterInput}
                          value={masterDateFrom}
                          onChange={(e) => setMasterDateFrom(e.target.value)}
                        />
                        <span className={styles.dateFilterSeparator}>~</span>
                        <input
                          type="date"
                          className={styles.dateFilterInput}
                          value={masterDateTo}
                          onChange={(e) => setMasterDateTo(e.target.value)}
                        />
                        {(masterDateFrom || masterDateTo) && (
                          <button
                            className={styles.dateFilterClear}
                            onClick={() => { setMasterDateFrom(''); setMasterDateTo(''); }}
                            type="button"
                          >
                            초기화
                          </button>
                        )}
                      </div>
                      <div className={styles.masterList}>
                        {isCodeLoading ? (
                          <div className={styles.loadingMessage}>데이터를 불러오는 중...</div>
                        ) : codeMasterList.length === 0 ? (
                          <div className={styles.emptyMessage}>등록된 코드 마스터가 없습니다.</div>
                        ) : (
                          codeMasterList
                            .filter((item) => {
                              // 명칭 검색
                              const matchSearch = masterSearchTerm === '' || 
                                item.code_group_name.toLowerCase().includes(masterSearchTerm.toLowerCase()) ||
                                item.code_group.toLowerCase().includes(masterSearchTerm.toLowerCase())
                              
                              // 기간 필터
                              let matchDate = true
                              if (masterDateFrom) {
                                matchDate = matchDate && item.sta_ymd >= masterDateFrom
                              }
                              if (masterDateTo) {
                                const endDate = item.end_ymd || '9999-12-31'
                                matchDate = matchDate && endDate <= masterDateTo
                              }
                              
                              return matchSearch && matchDate
                            })
                            .map((item) => (
                              <div
                                key={item.code_group}
                                className={`${styles.masterItem} ${selectedCodeGroup === item.code_group ? styles.masterItemSelected : ''}`}
                                onClick={() => setSelectedCodeGroup(selectedCodeGroup === item.code_group ? null : item.code_group)}
                              >
                                <div className={styles.masterItemMain}>
                                  <code className={styles.masterCode}>{item.code_group}</code>
                                  <span className={styles.masterName}>{item.code_group_name}</span>
                                </div>
                                <div className={styles.masterItemSub}>
                                  <span className={styles.masterDesc}>{item.description || '-'}</span>
                                  <span className={styles.masterCount}>{item.detail_count || 0}건</span>
                                </div>
                                <div className={styles.masterItemMeta}>
                                  <span className={styles.masterDate}>{item.sta_ymd} ~ {item.end_ymd || '9999-12-31'}</span>
                                  <span className={item.use_yn === 'Y' ? styles.statusActive : styles.statusInactive}>{item.use_yn}</span>
                                  <button
                                    className={styles.masterEditButton}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setIsNewMaster(false)
                                      setEditingMaster({
                                        code_group: item.code_group,
                                        code_group_name: item.code_group_name,
                                        description: item.description || '',
                                        sta_ymd: item.sta_ymd,
                                        end_ymd: item.end_ymd || '9999-12-31',
                                        use_yn: item.use_yn,
                                      })
                                    }}
                                  >
                                    수정
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    {/* 우측: Detail 테이블 */}
                    <div className={styles.codeDetailPanel}>
                      <div className={styles.panelHeader}>
                        <h3 className={styles.panelTitle}>
                          📝 코드 상세
                          {selectedCodeGroup && <span className={styles.filterBadge}>{selectedCodeGroup}</span>}
                        </h3>
                        <button
                          className={styles.adminSmallAddButton}
                          type="button"
                          onClick={() => {
                            setIsNewDetail(true)
                            setEditingDetail({
                              id: null,
                              code_group: selectedCodeGroup || '',
                              code_value: '',
                              code_name: '',
                              description: '',
                              sta_ymd: new Date().toISOString().slice(0, 10),
                              end_ymd: '9999-12-31',
                              use_yn: 'Y',
                              sort_order: 0,
                              extra_value1: '',
                              extra_value2: '',
                              extra_value3: '',
                              extra_value4: '',
                              extra_value5: '',
                            })
                          }}
                        >
                          + 추가
                        </button>
                      </div>

                      {/* 상세 검색/필터 */}
                      <div className={styles.detailFilterBox}>
                        <input
                          type="text"
                          className={styles.detailSearchInput}
                          placeholder="코드명 검색..."
                          value={detailSearchTerm}
                          onChange={(e) => setDetailSearchTerm(e.target.value)}
                        />
                        <div className={styles.detailDateFilter}>
                          <input
                            type="date"
                            className={styles.dateFilterInput}
                            value={detailDateFrom}
                            onChange={(e) => setDetailDateFrom(e.target.value)}
                          />
                          <span className={styles.dateFilterSeparator}>~</span>
                          <input
                            type="date"
                            className={styles.dateFilterInput}
                            value={detailDateTo}
                            onChange={(e) => setDetailDateTo(e.target.value)}
                          />
                        </div>
                        {(detailSearchTerm || detailDateFrom || detailDateTo) && (
                          <button
                            className={styles.dateFilterClear}
                            onClick={() => { setDetailSearchTerm(''); setDetailDateFrom(''); setDetailDateTo(''); }}
                            type="button"
                          >
                            초기화
                          </button>
                        )}
                      </div>

                      {editingDetail && (
                        <div className={styles.codeEditor}>
                          <div className={styles.codeEditorTitle}>
                            {isNewDetail ? '상세 코드 추가' : '상세 코드 수정'}
                          </div>
                          <div className={styles.codeEditorGrid}>
                            <label className={styles.codeEditorLabel}>
                              코드 그룹
                              <select
                                className={styles.codeEditorSelect}
                                value={editingDetail.code_group}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, code_group: e.target.value } : prev)}
                              >
                                <option value="">선택</option>
                                {codeMasterList.map((master) => (
                                  <option key={master.code_group} value={master.code_group}>
                                    {master.code_group} - {master.code_group_name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className={styles.codeEditorLabel}>
                              코드값
                              <input
                                className={styles.codeEditorInput}
                                value={editingDetail.code_value}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, code_value: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              코드명
                              <input
                                className={styles.codeEditorInput}
                                value={editingDetail.code_name}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, code_name: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              정렬 순서
                              <input
                                type="number"
                                className={styles.codeEditorInput}
                                value={editingDetail.sort_order}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, sort_order: Number(e.target.value) || 0 } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              시작일자
                              <input
                                type="date"
                                className={styles.codeEditorInput}
                                value={editingDetail.sta_ymd}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, sta_ymd: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              종료일자
                              <input
                                type="date"
                                className={styles.codeEditorInput}
                                value={editingDetail.end_ymd}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, end_ymd: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              사용 여부
                              <select
                                className={styles.codeEditorSelect}
                                value={editingDetail.use_yn}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, use_yn: e.target.value } : prev)}
                              >
                                <option value="Y">Y</option>
                                <option value="N">N</option>
                              </select>
                            </label>
                            <label className={styles.codeEditorLabel}>
                              설명
                              <textarea
                                className={styles.codeEditorTextarea}
                                value={editingDetail.description}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              EXTRA1
                              <input
                                className={styles.codeEditorInput}
                                value={editingDetail.extra_value1 || ''}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, extra_value1: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              EXTRA2
                              <input
                                className={styles.codeEditorInput}
                                value={editingDetail.extra_value2 || ''}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, extra_value2: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              EXTRA3
                              <input
                                className={styles.codeEditorInput}
                                value={editingDetail.extra_value3 || ''}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, extra_value3: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              EXTRA4
                              <input
                                className={styles.codeEditorInput}
                                value={editingDetail.extra_value4 || ''}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, extra_value4: e.target.value } : prev)}
                              />
                            </label>
                            <label className={styles.codeEditorLabel}>
                              EXTRA5
                              <input
                                className={styles.codeEditorInput}
                                value={editingDetail.extra_value5 || ''}
                                onChange={(e) => setEditingDetail((prev) => prev ? { ...prev, extra_value5: e.target.value } : prev)}
                              />
                            </label>
                          </div>
                          <div className={styles.codeEditorActions}>
                            <button className={styles.adminTableBtn} type="button" onClick={saveDetail}>저장</button>
                            <button
                              className={styles.adminTableBtn}
                              type="button"
                              onClick={() => {
                                setEditingDetail(null)
                                setIsNewDetail(false)
                              }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={styles.detailTableScrollWrapper}>
                        <table className={styles.detailTable}>
                          <thead>
                            <tr>
                              <th className={styles.stickyCol}>코드그룹</th>
                              <th className={styles.stickyCol2}>코드값</th>
                              <th>코드명</th>
                              <th>설명</th>
                              <th>Extra1</th>
                              <th>Extra2</th>
                              <th>Extra3</th>
                              <th>Extra4</th>
                              <th>Extra5</th>
                              <th>기간</th>
                              <th>사용</th>
                              <th className={styles.stickyColRight}>관리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isCodeLoading ? (
                              <tr>
                                <td colSpan={12} className={styles.loadingCell}>데이터를 불러오는 중...</td>
                              </tr>
                            ) : codeDetailList.length === 0 ? (
                              <tr>
                                <td colSpan={12} className={styles.emptyCell}>등록된 코드 상세가 없습니다.</td>
                              </tr>
                            ) : (
                              codeDetailList
                                .filter((item) => {
                                  // 선택된 코드그룹 필터
                                  const matchGroup = !selectedCodeGroup || item.code_group === selectedCodeGroup
                                  
                                  // 코드명 검색
                                  const matchSearch = detailSearchTerm === '' ||
                                    item.code_name.toLowerCase().includes(detailSearchTerm.toLowerCase()) ||
                                    item.code_value.toLowerCase().includes(detailSearchTerm.toLowerCase())
                                  
                                  // 기간 필터
                                  let matchDate = true
                                  if (detailDateFrom) {
                                    matchDate = matchDate && item.sta_ymd >= detailDateFrom
                                  }
                                  if (detailDateTo) {
                                    const endDate = item.end_ymd || '9999-12-31'
                                    matchDate = matchDate && endDate <= detailDateTo
                                  }
                                  
                                  return matchGroup && matchSearch && matchDate
                                })
                                .map((item) => (
                                  <tr key={item.id}>
                                    <td className={styles.stickyCol}><code className={styles.codeGroupBadge}>{item.code_group}</code></td>
                                    <td className={styles.stickyCol2}><strong>{item.code_value}</strong></td>
                                    <td>{item.code_name}</td>
                                    <td className={styles.descriptionCell}>{item.description || '-'}</td>
                                    <td>{item.extra_value1 || '-'}</td>
                                    <td>{item.extra_value2 || '-'}</td>
                                    <td>{item.extra_value3 || '-'}</td>
                                    <td>{item.extra_value4 || '-'}</td>
                                    <td>{item.extra_value5 || '-'}</td>
                                    <td className={styles.dateCell}>{item.sta_ymd} ~ {item.end_ymd || '9999-12-31'}</td>
                                    <td><span className={item.use_yn === 'Y' ? styles.statusActive : styles.statusInactive}>{item.use_yn}</span></td>
                                    <td className={styles.stickyColRight}>
                                      <button
                                        className={styles.adminTableBtn}
                                        type="button"
                                        onClick={() => {
                                          setIsNewDetail(false)
                                          setEditingDetail({
                                            id: item.id,
                                            code_group: item.code_group,
                                            code_value: item.code_value,
                                            code_name: item.code_name,
                                            description: item.description || '',
                                            sta_ymd: item.sta_ymd,
                                            end_ymd: item.end_ymd || '9999-12-31',
                                            use_yn: item.use_yn,
                                            sort_order: item.sort_order || 0,
                                            extra_value1: item.extra_value1 || '',
                                            extra_value2: item.extra_value2 || '',
                                            extra_value3: item.extra_value3 || '',
                                            extra_value4: item.extra_value4 || '',
                                            extra_value5: item.extra_value5 || '',
                                          })
                                        }}
                                      >
                                        수정
                                      </button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 계정 관리 */}
              {adminMenu === 'account' && (
                <div className={styles.adminSection}>
                  <h2 className={styles.adminSectionTitle}>계정 관리</h2>
                  <p className={styles.adminSectionDesc}>
                    사용자 계정을 조회하고 관리합니다.
                  </p>

                  {/* 계정 통계 요약 */}
                  <div className={styles.adminStatsSummary}>
                    <div className={styles.adminStatCard}>
                      <div className={styles.adminStatLabel}>가입 채널별</div>
                      <div className={styles.adminStatValues}>
                        <div className={styles.adminStatItem}>
                          <span className={styles.statTagKakao}>Kakao</span>
                          <span className={styles.statCount}>
                            {userList.filter(u => u.email?.includes('kakao')).length}
                          </span>
                        </div>
                        <div className={styles.adminStatItem}>
                          <span className={styles.statTagGmail}>Gmail</span>
                          <span className={styles.statCount}>
                            {userList.filter(u => u.email?.includes('gmail')).length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.adminStatCard}>
                      <div className={styles.adminStatLabel}>사용자 등급별</div>
                      <div className={styles.adminStatValues}>
                        <div className={styles.adminStatItem}>
                          <span className={styles.statTagGrade}>동네주민</span>
                          <span className={styles.statCount}>
                            {userList.filter(u => u.user_grade === '동네주민').length}
                          </span>
                        </div>
                        <div className={styles.adminStatItem}>
                          <span className={styles.statTagGrade}>동네보안관</span>
                          <span className={styles.statCount}>
                            {userList.filter(u => u.user_grade === '동네보안관').length}
                          </span>
                        </div>
                        <div className={styles.adminStatItem}>
                          <span className={styles.statTagGrade}>동네시장</span>
                          <span className={styles.statCount}>
                            {userList.filter(u => u.user_grade === '동네시장').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 검색 필터 */}
                  <div className={styles.adminFilterBar}>
                    <input
                      type="text"
                      className={styles.adminSearchInput}
                      placeholder="이메일 또는 닉네임으로 검색..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                    <select
                      className={styles.adminFilterSelect}
                      value={userTypeFilter}
                      onChange={(e) => setUserTypeFilter(e.target.value)}
                    >
                      <option value="">전체 유형</option>
                      <option value="ADMIN">관리자</option>
                      <option value="USER">일반 사용자</option>
                    </select>
                    <button
                      className={styles.adminSearchButton}
                      type="button"
                      onClick={fetchUsers}
                    >
                      검색
                    </button>
                  </div>

                  {/* 계정 목록 테이블 */}
                  <div className={styles.adminTableWrapper}>
                    <table className={styles.adminTable}>
                      <thead>
                        <tr>
                          <th>이메일</th>
                          <th>닉네임</th>
                          <th>유형</th>
                          <th>등급</th>
                          <th>리뷰</th>
                          <th>가입일</th>
                          <th>최근 로그인</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isUserLoading ? (
                          <tr>
                            <td colSpan={8} className={styles.loadingCell}>계정 정보를 불러오는 중...</td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className={styles.emptyCell}>조회된 계정이 없습니다.</td>
                          </tr>
                        ) : (
                          filteredUsers.map((account) => {
                            const isEditing = editingUser?.supabase_user_id === account.supabase_user_id
                            return (
                              <tr key={account.supabase_user_id}>
                                <td>{account.email || '-'}</td>
                                <td>
                                  {isEditing ? (
                                    <input
                                      className={styles.adminInlineInput}
                                      value={editingUser?.nickname || ''}
                                      onChange={(e) => setEditingUser((prev) => prev ? { ...prev, nickname: e.target.value } : prev)}
                                    />
                                  ) : (
                                    account.nickname || '-'
                                  )}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <select
                                      className={styles.adminInlineSelect}
                                      value={editingUser?.user_type || ''}
                                      onChange={(e) => setEditingUser((prev) => prev ? { ...prev, user_type: e.target.value } : prev)}
                                    >
                                      <option value="">미지정</option>
                                      <option value="ADMIN">ADMIN</option>
                                      <option value="USER">USER</option>
                                    </select>
                                  ) : (
                                    account.user_type === 'ADMIN'
                                      ? <span className={styles.adminBadge}>ADMIN</span>
                                      : <span className={styles.userBadge}>USER</span>
                                  )}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <select
                                      className={styles.adminInlineSelect}
                                      value={editingUser?.user_grade || ''}
                                      onChange={(e) => setEditingUser((prev) => prev ? { ...prev, user_grade: e.target.value } : prev)}
                                    >
                                      <option value="">미지정</option>
                                      <option value="IMJANG">IMJANG</option>
                                      <option value="INJU">INJU</option>
                                      <option value="MYUNGDANG">MYUNGDANG</option>
                                      <option value="GOD">GOD</option>
                                    </select>
                                  ) : (
                                    <span className={styles.userGradeBadge}>{account.user_grade || '-'}</span>
                                  )}
                                </td>
                                <td>
                                  {account.review_count > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => loadUserReviews(account.supabase_user_id, account.nickname || account.email || '사용자')}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#7C3AED',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        padding: '2px 4px',
                                      }}
                                      title="클릭하여 리뷰 목록 보기"
                                    >
                                      {account.review_count}건
                                    </button>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>0건</span>
                                  )}
                                </td>
                                <td>{formatDate(account.created_at)}</td>
                                <td>{formatDate(account.last_login_at)}</td>
                                <td>
                                  {isEditing ? (
                                    <>
                                      <button className={styles.adminTableBtn} type="button" onClick={saveUser}>저장</button>
                                      <button className={styles.adminTableBtn} type="button" onClick={() => setEditingUser(null)}>취소</button>
                                    </>
                                  ) : (
                                    <button
                                      className={styles.adminTableBtn}
                                      type="button"
                                      onClick={() => setEditingUser({
                                        supabase_user_id: account.supabase_user_id,
                                        email: account.email,
                                        nickname: account.nickname,
                                        user_type: account.user_type,
                                        user_grade: account.user_grade,
                                      })}
                                    >
                                      수정
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 페이지네이션 */}
                  <div className={styles.adminPagination}>
                    <button className={styles.adminPageBtn} disabled>이전</button>
                    <span className={styles.adminPageInfo}>1 / 1</span>
                    <button className={styles.adminPageBtn} disabled>다음</button>
                  </div>

                  {/* 사용자 리뷰 목록 팝업 */}
                  {userReviewPopup && (
                    <div
                      style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 10001,
                      }}
                      onClick={() => setUserReviewPopup(null)}
                    >
                      <div
                        style={{
                          background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '640px',
                          maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 헤더 */}
                        <div style={{
                          padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                              {userReviewPopup.nickname}님의 리뷰 목록
                            </h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                              총 {userReviewPopup.reviews.length}건의 리뷰
                            </p>
                          </div>
                          <button
                            onClick={() => setUserReviewPopup(null)}
                            style={{
                              background: 'none', border: 'none', fontSize: '20px',
                              cursor: 'pointer', color: '#94a3b8', padding: '4px',
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* 리뷰 리스트 */}
                        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
                          {isUserReviewLoading ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>리뷰 불러오는 중...</p>
                          ) : userReviewPopup.reviews.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>등록된 리뷰가 없습니다.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {userReviewPopup.reviews.map((rv, idx) => (
                                <div key={rv.id || idx} style={{
                                  background: '#f8fafc', border: '1px solid #e2e8f0',
                                  borderRadius: '10px', padding: '14px 16px',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>
                                        {rv.agent_name}
                                      </div>
                                      {rv.agent_road_address && (
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                          {rv.agent_road_address}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                      ⭐ {rv.avg_rating}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginBottom: '6px', flexWrap: 'wrap' }}>
                                    <span>거래: {rv.transaction_tag}</span>
                                    <span>계약일: {rv.contract_date}</span>
                                    <span>작성: {new Date(rv.created_at).toLocaleDateString('ko-KR')}</span>
                                  </div>
                                  {rv.review_text && (
                                    <p style={{
                                      fontSize: '13px', color: '#334155', margin: 0,
                                      lineHeight: 1.5, whiteSpace: 'pre-wrap',
                                      overflow: 'hidden', textOverflow: 'ellipsis',
                                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any,
                                    }}>
                                      {rv.review_text}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 배치 관리 */}
              {adminMenu === 'batch' && (
                <div className={styles.adminSection}>
                  <h2 className={styles.adminSectionTitle}>배치 관리</h2>
                  <p className={styles.adminSectionDesc}>
                    Crontab 스케줄 기반으로 배치 작업을 관리하고 실행합니다.
                  </p>

                  {isBatchLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                      배치 작업을 불러오는 중...
                    </div>
                  ) : (
                    <>
                      {/* 배치 작업 목록 */}
                      <div className={styles.adminBatchList}>
                        {batchJobs.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                            등록된 배치 작업이 없습니다.
                          </div>
                        )}
                        {batchJobs.map((job) => (
                          <div key={job.id} className={styles.adminBatchItem} style={{ opacity: job.is_active ? 1 : 0.5 }}>
                            {editingBatchJob?.id === job.id ? (
                              /* 수정 모드 */
                              <div style={{ width: '100%' }}>
                                <div className={styles.batchEditForm}>
                                  <div className={styles.batchEditRow}>
                                    <label className={styles.batchEditLabel}>작업명 *</label>
                                    <input
                                      type="text"
                                      className={styles.batchEditInput}
                                      value={editingBatchJob.job_name}
                                      onChange={(e) => setEditingBatchJob({ ...editingBatchJob, job_name: e.target.value })}
                                    />
                                  </div>
                                  <div className={styles.batchEditRow}>
                                    <label className={styles.batchEditLabel}>설명</label>
                                    <input
                                      type="text"
                                      className={styles.batchEditInput}
                                      value={editingBatchJob.job_description || ''}
                                      onChange={(e) => setEditingBatchJob({ ...editingBatchJob, job_description: e.target.value })}
                                    />
                                  </div>
                                  <div className={styles.batchEditRow}>
                                    <label className={styles.batchEditLabel}>Cron 표현식 *</label>
                                    <div style={{ flex: 1 }}>
                                      <input
                                        type="text"
                                        className={styles.batchEditInput}
                                        value={editingBatchJob.cron_expression}
                                        onChange={(e) => setEditingBatchJob({ ...editingBatchJob, cron_expression: e.target.value })}
                                        placeholder="예: 0 2 * * *"
                                      />
                                      <div className={styles.cronPresets}>
                                        {cronPresets.map((p) => (
                                          <button
                                            key={p.value}
                                            type="button"
                                            className={styles.cronPresetBtn}
                                            onClick={() => setEditingBatchJob({
                                              ...editingBatchJob,
                                              cron_expression: p.value,
                                              cron_description: p.desc,
                                            })}
                                          >
                                            {p.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className={styles.batchEditRow}>
                                    <label className={styles.batchEditLabel}>스케줄 설명</label>
                                    <input
                                      type="text"
                                      className={styles.batchEditInput}
                                      value={editingBatchJob.cron_description || ''}
                                      onChange={(e) => setEditingBatchJob({ ...editingBatchJob, cron_description: e.target.value })}
                                      placeholder="예: 매일 새벽 2시"
                                    />
                                  </div>
                                  <div className={styles.batchEditRow}>
                                    <label className={styles.batchEditLabel}>API 엔드포인트</label>
                                    <input
                                      type="text"
                                      className={styles.batchEditInput}
                                      value={editingBatchJob.endpoint_url || ''}
                                      onChange={(e) => setEditingBatchJob({ ...editingBatchJob, endpoint_url: e.target.value })}
                                      placeholder="예: /api/batch/sync-agents"
                                    />
                                  </div>
                                  <div className={styles.batchEditActions}>
                                    <button
                                      type="button"
                                      className={styles.adminBatchRunBtn}
                                      onClick={() => saveBatchJob(editingBatchJob)}
                                    >
                                      저장
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.adminBatchLogBtn}
                                      onClick={() => setEditingBatchJob(null)}
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* 조회 모드 */
                              <>
                                <div className={styles.adminBatchInfo}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <h3 className={styles.adminBatchName} style={{ margin: 0 }}>{job.job_name}</h3>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: job.is_active ? '#dcfce7' : '#f1f5f9',
                                        color: job.is_active ? '#16a34a' : '#94a3b8',
                                      }}
                                    >
                                      {job.is_active ? '활성' : '비활성'}
                                    </span>
                                  </div>
                                  {job.job_description && (
                                    <p className={styles.adminBatchDesc}>{job.job_description}</p>
                                  )}
                                  <div className={styles.adminBatchMeta}>
                                    <span className={styles.adminBatchSchedule}>
                                      <code style={{ fontSize: '12px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                        {job.cron_expression}
                                      </code>
                                      {job.cron_description && (
                                        <span style={{ marginLeft: '6px', color: '#64748b' }}>{job.cron_description}</span>
                                      )}
                                    </span>
                                  </div>
                                  <div className={styles.adminBatchMeta} style={{ marginTop: '6px' }}>
                                    <span className={styles.adminBatchLastRun}>
                                      마지막 실행: {formatDateTime(job.last_run_at)}
                                    </span>
                                    <span className={`${styles.adminBatchStatus} ${getBatchStatusStyle(job.last_status)}`}>
                                      {getBatchStatusLabel(job.last_status)}
                                    </span>
                                  </div>
                                  {job.last_message && (
                                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>{job.last_message}</p>
                                  )}
                                </div>
                                {runningBatchJobId === job.id && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '8px',
                                    margin: '8px 0',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                  }}>
                                    <span style={{
                                      display: 'inline-block',
                                      width: '14px',
                                      height: '14px',
                                      border: '2px solid rgba(59, 130, 246, 0.3)',
                                      borderTopColor: '#3b82f6',
                                      borderRadius: '50%',
                                      animation: 'spin 1s linear infinite',
                                    }} />
                                    <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
                                      API 실행 중... ({batchRunElapsed}초 경과)
                                    </span>
                                  </div>
                                )}
                                <div className={styles.adminBatchActions}>
                                  <button
                                    className={styles.adminBatchRunBtn}
                                    type="button"
                                    onClick={() => runBatchJobManually(job)}
                                    disabled={job.last_status === 'RUNNING' || runningBatchJobId !== null}
                                  >
                                    {runningBatchJobId === job.id ? `실행 중 (${batchRunElapsed}초)` : job.last_status === 'RUNNING' ? '실행 중...' : '수동 실행'}
                                  </button>
                                  <button
                                    className={styles.adminBatchLogBtn}
                                    type="button"
                                    onClick={() => loadBatchLogs(job.id)}
                                  >
                                    로그 보기
                                  </button>
                                  <button
                                    className={styles.adminBatchLogBtn}
                                    type="button"
                                    onClick={() => setEditingBatchJob({ ...job })}
                                  >
                                    수정
                                  </button>
                                  <button
                                    className={styles.adminBatchLogBtn}
                                    type="button"
                                    onClick={() => toggleBatchJobActive(job)}
                                    style={{ color: job.is_active ? '#dc2626' : '#16a34a' }}
                                  >
                                    {job.is_active ? '비활성화' : '활성화'}
                                  </button>
                                  <button
                                    className={styles.adminBatchLogBtn}
                                    type="button"
                                    onClick={() => deleteBatchJob(job.id)}
                                    style={{ color: '#dc2626' }}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 배치 로그 모달 */}
                      {showBatchLogs !== null && (
                        <div className={styles.batchLogOverlay}>
                          <div className={styles.batchLogModal}>
                            <div className={styles.batchLogHeader}>
                              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                                실행 로그 - {batchJobs.find(j => j.id === showBatchLogs)?.job_name}
                              </h3>
                              <button
                                type="button"
                                onClick={() => { setShowBatchLogs(null); setBatchLogs([]) }}
                                className={styles.batchLogCloseBtn}
                              >
                                닫기
                              </button>
                            </div>
                            <div className={styles.batchLogBody}>
                              {isBatchLogLoading ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>로그를 불러오는 중...</div>
                              ) : batchLogs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>실행 로그가 없습니다.</div>
                              ) : (
                                <table className={styles.batchLogTable}>
                                  <thead>
                                    <tr>
                                      <th>상태</th>
                                      <th>시작 시간</th>
                                      <th>종료 시간</th>
                                      <th>메시지</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {batchLogs.map((log) => (
                                      <tr key={log.id}>
                                        <td>
                                          <span className={`${styles.adminBatchStatus} ${getBatchStatusStyle(log.status)}`}>
                                            {getBatchStatusLabel(log.status)}
                                          </span>
                                        </td>
                                        <td style={{ fontSize: '12px' }}>{formatDateTime(log.started_at)}</td>
                                        <td style={{ fontSize: '12px' }}>{formatDateTime(log.finished_at)}</td>
                                        <td style={{ fontSize: '12px' }}>
                                          {log.message}
                                          {log.error_detail && (
                                            <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>{log.error_detail}</div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 배치 추가 폼 */}
                      {isAddingBatchJob ? (
                        <div className={styles.adminBatchItem} style={{ marginTop: '16px' }}>
                          <div style={{ width: '100%' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px', color: '#1e293b' }}>새 배치 작업 추가</h3>
                            <div className={styles.batchEditForm}>
                              <div className={styles.batchEditRow}>
                                <label className={styles.batchEditLabel}>작업명 *</label>
                                <input
                                  type="text"
                                  className={styles.batchEditInput}
                                  value={newBatchJob.job_name}
                                  onChange={(e) => setNewBatchJob({ ...newBatchJob, job_name: e.target.value })}
                                  placeholder="배치 작업명을 입력하세요"
                                />
                              </div>
                              <div className={styles.batchEditRow}>
                                <label className={styles.batchEditLabel}>설명</label>
                                <input
                                  type="text"
                                  className={styles.batchEditInput}
                                  value={newBatchJob.job_description}
                                  onChange={(e) => setNewBatchJob({ ...newBatchJob, job_description: e.target.value })}
                                  placeholder="배치 작업 설명"
                                />
                              </div>
                              <div className={styles.batchEditRow}>
                                <label className={styles.batchEditLabel}>Cron 표현식 *</label>
                                <div style={{ flex: 1 }}>
                                  <input
                                    type="text"
                                    className={styles.batchEditInput}
                                    value={newBatchJob.cron_expression}
                                    onChange={(e) => setNewBatchJob({ ...newBatchJob, cron_expression: e.target.value })}
                                    placeholder="분 시 일 월 요일 (예: 0 2 * * *)"
                                  />
                                  <div className={styles.cronPresets}>
                                    {cronPresets.map((p) => (
                                      <button
                                        key={p.value}
                                        type="button"
                                        className={styles.cronPresetBtn}
                                        onClick={() => setNewBatchJob({
                                          ...newBatchJob,
                                          cron_expression: p.value,
                                          cron_description: p.desc,
                                        })}
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                                    형식: 분(0-59) 시(0-23) 일(1-31) 월(1-12) 요일(0-7, 0=일)
                                  </div>
                                </div>
                              </div>
                              <div className={styles.batchEditRow}>
                                <label className={styles.batchEditLabel}>스케줄 설명</label>
                                <input
                                  type="text"
                                  className={styles.batchEditInput}
                                  value={newBatchJob.cron_description}
                                  onChange={(e) => setNewBatchJob({ ...newBatchJob, cron_description: e.target.value })}
                                  placeholder="예: 매일 새벽 2시"
                                />
                              </div>
                              <div className={styles.batchEditRow}>
                                <label className={styles.batchEditLabel}>API 엔드포인트</label>
                                <input
                                  type="text"
                                  className={styles.batchEditInput}
                                  value={newBatchJob.endpoint_url}
                                  onChange={(e) => setNewBatchJob({ ...newBatchJob, endpoint_url: e.target.value })}
                                  placeholder="예: /api/batch/sync-agents"
                                />
                              </div>
                              <div className={styles.batchEditActions}>
                                <button
                                  type="button"
                                  className={styles.adminBatchRunBtn}
                                  onClick={addBatchJob}
                                >
                                  추가
                                </button>
                                <button
                                  type="button"
                                  className={styles.adminBatchLogBtn}
                                  onClick={() => {
                                    setIsAddingBatchJob(false)
                                    setNewBatchJob({ job_name: '', job_description: '', cron_expression: '', cron_description: '', endpoint_url: '' })
                                  }}
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.adminActionButtons}>
                          <button
                            className={styles.adminAddButton}
                            type="button"
                            onClick={() => setIsAddingBatchJob(true)}
                          >
                            + 배치 작업 추가
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 광고/제휴/오류 문의 관리 */}
              {adminMenu === 'partnership' && (
                <div className={styles.adminSection}>
                  <h2 className={styles.adminSectionTitle}>광고/제휴/오류 문의 관리</h2>
                  <p className={styles.adminSectionDesc}>
                    사용자가 접수한 광고/제휴/오류 문의를 관리합니다.
                  </p>

                  {/* 상태 필터 - pill 버튼 */}
                  <div className={styles.partnerFilterBar}>
                    {[
                      { value: '', label: '전체' },
                      { value: 'pending', label: '대기중' },
                      { value: 'in_progress', label: '처리중' },
                      { value: 'completed', label: '완료' },
                      { value: 'rejected', label: '거절' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        className={`${styles.partnerFilterBtn} ${partnershipStatusFilter === opt.value ? styles.partnerFilterBtnActive : ''}`}
                        onClick={() => setPartnershipStatusFilter(opt.value)}
                      >
                        {opt.label}
                        <span className={styles.partnerFilterCount}>
                          {opt.value === ''
                            ? partnershipList.length
                            : partnershipList.filter(i => i.status === opt.value).length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* 문의 카드 목록 */}
                  {isPartnershipLoading ? (
                    <div className={styles.partnerLoading}>
                      <div className={styles.partnerSpinner} />
                      <span>문의 목록을 불러오는 중...</span>
                    </div>
                  ) : (
                    <div className={styles.partnerCardList}>
                      {partnershipList
                        .filter((item: any) =>
                          partnershipStatusFilter === '' || item.status === partnershipStatusFilter
                        )
                        .map((inquiry: any) => (
                          <div
                            key={inquiry.id}
                            className={`${styles.partnerCard} ${selectedInquiry?.id === inquiry.id ? styles.partnerCardSelected : ''}`}
                            onClick={() => {
                              setSelectedInquiry(inquiry)
                              setReplyText(inquiry.admin_reply || '')
                            }}
                          >
                            <div className={styles.partnerCardTop}>
                              <span className={styles.typeBadge}>{inquiry.inquiry_type}</span>
                              <span className={`${styles.statusBadge} ${
                                inquiry.status === 'pending' ? styles.statusPending :
                                inquiry.status === 'in_progress' ? styles.statusInProgress :
                                inquiry.status === 'completed' ? styles.statusCompleted :
                                styles.statusRejected
                              }`}>
                                {inquiry.status === 'pending' ? '대기중' :
                                 inquiry.status === 'in_progress' ? '처리중' :
                                 inquiry.status === 'completed' ? '완료' : '거절'}
                              </span>
                            </div>

                            <h4 className={styles.partnerCardTitle}>{inquiry.title}</h4>

                            <div className={styles.partnerCardMeta}>
                              <div className={styles.partnerCardMetaRow}>
                                <span className={styles.partnerCardIcon}>👤</span>
                                <span>{inquiry.user_name || '-'}</span>
                                {inquiry.company_name && (
                                  <>
                                    <span className={styles.partnerCardDivider}>·</span>
                                    <span>{inquiry.company_name}</span>
                                  </>
                                )}
                              </div>
                              <div className={styles.partnerCardMetaRow}>
                                <span className={styles.partnerCardIcon}>📞</span>
                                <span>{inquiry.contact_phone || '-'}</span>
                                <span className={styles.partnerCardDivider}>·</span>
                                <span className={styles.partnerCardIcon}>📅</span>
                                <span>{formatDate(inquiry.created_at)}</span>
                              </div>
                            </div>

                            {inquiry.content && (
                              <p className={styles.partnerCardPreview}>
                                {inquiry.content.length > 80 ? inquiry.content.slice(0, 80) + '...' : inquiry.content}
                              </p>
                            )}

                            {inquiry.admin_reply && (
                              <div className={styles.partnerCardReply}>
                                <span className={styles.partnerCardReplyIcon}>💬</span>
                                <span>답변 완료</span>
                              </div>
                            )}
                          </div>
                        ))}

                      {partnershipList.filter((item: any) =>
                        partnershipStatusFilter === '' || item.status === partnershipStatusFilter
                      ).length === 0 && (
                        <div className={styles.partnerEmpty}>
                          <div className={styles.partnerEmptyIcon}>📭</div>
                          <p>문의 내역이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 문의 상세 모달 */}
                  {selectedInquiry && (
                    <div className={styles.overlay} onClick={() => setSelectedInquiry(null)}>
                      <div className={styles.partnerDetailModal} onClick={(e) => e.stopPropagation()}>
                        {/* 헤더 */}
                        <div className={styles.partnerDetailHeader}>
                          <div className={styles.partnerDetailHeaderLeft}>
                            <span className={styles.typeBadge}>{selectedInquiry.inquiry_type}</span>
                            <span className={`${styles.statusBadge} ${
                              selectedInquiry.status === 'pending' ? styles.statusPending :
                              selectedInquiry.status === 'in_progress' ? styles.statusInProgress :
                              selectedInquiry.status === 'completed' ? styles.statusCompleted :
                              styles.statusRejected
                            }`}>
                              {selectedInquiry.status === 'pending' ? '대기중' :
                               selectedInquiry.status === 'in_progress' ? '처리중' :
                               selectedInquiry.status === 'completed' ? '완료' : '거절'}
                            </span>
                          </div>
                          <button
                            className={styles.partnerDetailClose}
                            onClick={() => setSelectedInquiry(null)}
                          >
                            ✕
                          </button>
                        </div>

                        {/* 제목 */}
                        <div className={styles.partnerDetailTitle}>
                          <h3>{selectedInquiry.title}</h3>
                          <span className={styles.partnerDetailDate}>
                            {new Date(selectedInquiry.created_at).toLocaleDateString('ko-KR')} {new Date(selectedInquiry.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* 본문 스크롤 영역 */}
                        <div className={styles.partnerDetailBody}>
                          {/* 문의자 정보 카드 */}
                          <div className={styles.partnerInfoCard}>
                            <div className={styles.partnerInfoCardTitle}>문의자 정보</div>
                            <div className={styles.partnerInfoGrid}>
                              <div className={styles.partnerInfoItem}>
                                <span className={styles.partnerInfoLabel}>이름</span>
                                <span className={styles.partnerInfoValue}>{selectedInquiry.user_name || '-'}</span>
                              </div>
                              <div className={styles.partnerInfoItem}>
                                <span className={styles.partnerInfoLabel}>이메일</span>
                                <span className={styles.partnerInfoValue}>{selectedInquiry.user_email || '-'}</span>
                              </div>
                              <div className={styles.partnerInfoItem}>
                                <span className={styles.partnerInfoLabel}>회사명</span>
                                <span className={styles.partnerInfoValue}>{selectedInquiry.company_name || '-'}</span>
                              </div>
                              <div className={styles.partnerInfoItem}>
                                <span className={styles.partnerInfoLabel}>연락처</span>
                                <span className={styles.partnerInfoValue}>{selectedInquiry.contact_phone || '-'}</span>
                              </div>
                            </div>
                          </div>

                          {/* 문의 내용 */}
                          <div className={styles.partnerInfoCard}>
                            <div className={styles.partnerInfoCardTitle}>문의 내용</div>
                            <p className={styles.partnerContentText}>{selectedInquiry.content}</p>
                          </div>

                          {/* 처리 영역 */}
                          <div className={styles.partnerInfoCard}>
                            <div className={styles.partnerInfoCardTitle}>처리</div>
                            <div className={styles.partnerProcessRow}>
                              <label className={styles.partnerProcessLabel}>상태 변경</label>
                              <div className={styles.partnerStatusSelect}>
                                {['pending', 'in_progress', 'completed', 'rejected'].map((st) => (
                                  <button
                                    key={st}
                                    className={`${styles.partnerStatusOption} ${selectedInquiry.status === st ? styles.partnerStatusOptionActive : ''}`}
                                    onClick={() => setSelectedInquiry({...selectedInquiry, status: st})}
                                  >
                                    {st === 'pending' ? '대기중' : st === 'in_progress' ? '처리중' : st === 'completed' ? '완료' : '거절'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className={styles.partnerProcessRow}>
                              <label className={styles.partnerProcessLabel}>관리자 답변</label>
                              <textarea
                                className={styles.partnerReplyTextarea}
                                rows={4}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="답변을 입력하세요..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* 하단 버튼 */}
                        <div className={styles.partnerDetailFooter}>
                          <button
                            className={styles.partnerBtnCancel}
                            onClick={() => setSelectedInquiry(null)}
                          >
                            취소
                          </button>
                          <button
                            className={styles.partnerBtnSave}
                            onClick={() => updateInquiryStatus(selectedInquiry.id, selectedInquiry.status, replyText)}
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 리뷰 관리 */}
              {adminMenu === 'review-mgmt' && (
                <div className={styles.adminSection}>
                  <h2 className={styles.adminSectionTitle}>리뷰 관리</h2>
                  <p className={styles.adminSectionDesc}>
                    등록된 리뷰 정보와 크롭된 계약서 이미지를 확인합니다.
                  </p>

                  {isReviewMgmtLoading ? (
                    <div className={styles.adminLoadingOverlay}>리뷰 데이터 로딩 중...</div>
                  ) : reviewMgmtList.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>등록된 리뷰가 없습니다.</p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {reviewMgmtList.map((review: any) => {
                          const avgRating = (() => {
                            const fields = [review.fee_satisfaction, review.expertise, review.kindness, review.property_reliability, review.response_speed].filter(Boolean)
                            return fields.length > 0 ? (fields.reduce((a: number, b: number) => a + b, 0) / fields.length).toFixed(1) : '-'
                          })()
                          const agentInfo = review.agent || {}
                          const hasImage = review.contract_image_encrypted && review.contract_image_iv
                          const decryptedUrl = reviewMgmtDecryptedImages[review.id]
                          const isImgLoading = reviewMgmtImageLoading[review.id]

                          return (
                            <div key={review.id} style={{
                              background: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '16px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}>
                              {/* 헤더: 작성자 + 날짜 + 상태 */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                    {review.reviewer_nickname}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                                  </span>
                                  {review.is_hidden && (
                                    <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px' }}>숨김</span>
                                  )}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
                                  ⭐ {avgRating}
                                </span>
                              </div>

                              {/* 중개사 정보 */}
                              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                  <span><strong>중개사:</strong> {agentInfo.agent_name || review.agent_name || '-'}</span>
                                  <span><strong>등록번호:</strong> {agentInfo.agent_number || '-'}</span>
                                  <span><strong>거래구분:</strong> {review.transaction_tag || '-'}</span>
                                  <span><strong>계약일:</strong> {review.contract_date || '-'}</span>
                                </div>
                                {agentInfo.road_address && (
                                  <div style={{ marginTop: '4px', color: '#64748b' }}>
                                    <strong>주소:</strong> {agentInfo.road_address}
                                  </div>
                                )}
                              </div>

                              {/* 리뷰 텍스트 */}
                              {review.review_text && (
                                <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 10px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                  {review.review_text}
                                </p>
                              )}

                              {/* 도장 검증 */}
                              {review.agent_stamp !== null && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                                  도장: {review.agent_stamp ? '✅ 확인됨' : '❌ 미확인'} 
                                  {review.agent_stamp_confidence != null && ` (신뢰도: ${review.agent_stamp_confidence})`}
                                </div>
                              )}

                              {/* 크롭 이미지 영역 */}
                              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                                {hasImage ? (
                                  <>
                                    {decryptedUrl ? (
                                      <div>
                                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>📎 크롭된 계약서 이미지</p>
                                        <img
                                          src={decryptedUrl}
                                          alt="크롭된 계약서"
                                          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}
                                        />
                                        {/* 관리자 이미지 관리 버튼 */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                          <label style={{
                                            padding: '6px 14px',
                                            background: '#f59e0b',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}>
                                            ✏️ 이미지 수정
                                            <input
                                              type="file"
                                              accept="image/*"
                                              style={{ display: 'none' }}
                                              onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) replaceReviewImage(review.id, file)
                                                e.target.value = ''
                                              }}
                                            />
                                          </label>
                                          <button
                                            onClick={() => downloadReviewImage(review.id, agentInfo.agent_name || review.agent_name)}
                                            style={{
                                              padding: '6px 14px',
                                              background: '#3b82f6',
                                              color: '#fff',
                                              border: 'none',
                                              borderRadius: '6px',
                                              fontSize: '12px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            💾 이미지 다운로드
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                          onClick={() => decryptReviewImage(review.id, review.contract_image_encrypted, review.contract_image_iv)}
                                          disabled={isImgLoading}
                                          style={{
                                            padding: '8px 16px',
                                            background: isImgLoading ? '#cbd5e1' : '#3b82f6',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            cursor: isImgLoading ? 'not-allowed' : 'pointer',
                                          }}
                                        >
                                          {isImgLoading ? '처리 중...' : '🔓 계약서 이미지 보기'}
                                        </button>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>계약서 이미지 없음</p>
                                    <label style={{
                                      padding: '6px 14px',
                                      background: '#10b981',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      cursor: isImgLoading ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      opacity: isImgLoading ? 0.6 : 1,
                                    }}>
                                      {isImgLoading ? '업로드 중...' : '📤 이미지 업로드'}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        disabled={isImgLoading}
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) replaceReviewImage(review.id, file)
                                          e.target.value = ''
                                        }}
                                      />
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* 페이지네이션 */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                        <button
                          onClick={() => loadReviewMgmt(reviewMgmtPage - 1)}
                          disabled={reviewMgmtPage === 0}
                          style={{
                            padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px',
                            background: reviewMgmtPage === 0 ? '#f1f5f9' : '#fff', cursor: reviewMgmtPage === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          ← 이전
                        </button>
                        <span style={{ padding: '8px 12px', fontSize: '13px', color: '#64748b' }}>
                          {reviewMgmtPage + 1} 페이지
                        </span>
                        <button
                          onClick={() => loadReviewMgmt(reviewMgmtPage + 1)}
                          disabled={reviewMgmtList.length < 20}
                          style={{
                            padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px',
                            background: reviewMgmtList.length < 20 ? '#f1f5f9' : '#fff', cursor: reviewMgmtList.length < 20 ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          다음 →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 데이터 분석 */}
              {adminMenu === 'analytics' && (
                <div className={styles.adminSectionWide}>
                  <h2 className={styles.adminSectionTitle}>데이터 분석</h2>
                  <p className={styles.adminSectionDesc}>
                    입력된 데이터를 분석하여 인사이트를 제공합니다.
                  </p>

                  {/* 요약 카드 */}
                  {isAnalyticsLoading ? (
                    <div className={styles.adminLoadingOverlay}>데이터 분석 중...</div>
                  ) : (
                    <div className={styles.analyticsCards}>
                      <div className={styles.analyticsCard}>
                        <div className={styles.analyticsCardIcon}>👥</div>
                        <div className={styles.analyticsCardContent}>
                          <span className={styles.analyticsCardValue}>{analyticsData.totalUsers.toLocaleString()}</span>
                          <span className={styles.analyticsCardLabel}>총 사용자</span>
                        </div>
                      </div>
                      <div className={styles.analyticsCard}>
                        <div className={styles.analyticsCardIcon}>📝</div>
                        <div className={styles.analyticsCardContent}>
                          <span className={styles.analyticsCardValue}>{analyticsData.totalReviews.toLocaleString()}</span>
                          <span className={styles.analyticsCardLabel}>총 리뷰</span>
                        </div>
                      </div>
                      <div className={styles.analyticsCard}>
                        <div className={styles.analyticsCardIcon}>🏢</div>
                        <div className={styles.analyticsCardContent}>
                          <span className={styles.analyticsCardValue}>{analyticsData.totalAgents.toLocaleString()}</span>
                          <span className={styles.analyticsCardLabel}>중개사무소</span>
                        </div>
                      </div>
                      <div className={styles.analyticsCard}>
                        <div className={styles.analyticsCardIcon}>⭐</div>
                        <div className={styles.analyticsCardContent}>
                          <span className={styles.analyticsCardValue}>{analyticsData.avgRating}</span>
                          <span className={styles.analyticsCardLabel}>평균 평점</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={styles.analyticsGrid}>
                    {/* 리뷰 태그 분석 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>📊 칭찬 태그 TOP 5</h3>
                      <div className={styles.analyticsBarChart}>
                        {analyticsData.praiseTags.length > 0 ? (
                          analyticsData.praiseTags.map((item: any, index: number) => {
                            const maxCount = analyticsData.praiseTags[0]?.count || 1
                            const width = (item.count / maxCount * 100).toFixed(0)
                            return (
                              <div key={index} className={styles.analyticsBarItem}>
                                <span className={styles.barLabel}>{item.tag}</span>
                                <div className={styles.barContainer}>
                                  <div className={styles.bar} style={{ width: `${width}%` }}></div>
                                </div>
                                <span className={styles.barValue}>{item.count.toLocaleString()}</span>
                              </div>
                            )
                          })
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            데이터가 없습니다
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 아쉬움 태그 분석 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>📉 아쉬움 태그 TOP 5</h3>
                      <div className={styles.analyticsBarChart}>
                        {analyticsData.regretTags.length > 0 ? (
                          analyticsData.regretTags.map((item: any, index: number) => {
                            const maxCount = analyticsData.regretTags[0]?.count || 1
                            const width = (item.count / maxCount * 100).toFixed(0)
                            return (
                              <div key={index} className={styles.analyticsBarItem}>
                                <span className={styles.barLabel}>{item.tag}</span>
                                <div className={styles.barContainer}>
                                  <div className={`${styles.bar} ${styles.barNegative}`} style={{ width: `${width}%` }}></div>
                                </div>
                                <span className={styles.barValue}>{item.count.toLocaleString()}</span>
                              </div>
                            )
                          })
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            데이터가 없습니다
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 거래 유형 분석 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>🏠 거래 유형 분포</h3>
                      <div className={styles.analyticsPieChart}>
                        {analyticsData.transactionTypes.length > 0 ? (
                          <div className={styles.pieChartLegend}>
                            {analyticsData.transactionTypes.map((item: any, index: number) => {
                              const total = analyticsData.transactionTypes.reduce((sum: number, t: any) => sum + t.count, 0)
                              const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0'
                              const colors = ['#7c3aed', '#f59e0b', '#10b981', '#ef4444']
                              return (
                                <div key={index} className={styles.legendItem}>
                                  <span className={styles.legendDot} style={{ backgroundColor: colors[index % 4] }}></span>
                                  <span className={styles.legendLabel}>{item.type}</span>
                                  <span className={styles.legendValue}>{percentage}% ({item.count.toLocaleString()}건)</span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            데이터가 없습니다
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 사용자 등급 분포 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>🎖️ 사용자 등급 분포</h3>
                      <div className={styles.analyticsBarChart}>
                        {analyticsData.userGrades.length > 0 ? (
                          analyticsData.userGrades.map((item: any, index: number) => {
                            const maxCount = Math.max(...analyticsData.userGrades.map((g: any) => g.count), 1)
                            const width = (item.count / maxCount * 100).toFixed(0)
                            const colors = ['#94a3b8', '#60a5fa', '#a78bfa', '#f59e0b']
                            return (
                              <div key={index} className={styles.analyticsBarItem}>
                                <span className={styles.barLabel}>{item.grade}</span>
                                <div className={styles.barContainer}>
                                  <div className={styles.bar} style={{ width: `${width}%`, backgroundColor: colors[index % 4] }}></div>
                                </div>
                                <span className={styles.barValue}>{item.count.toLocaleString()}명</span>
                              </div>
                            )
                          })
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            데이터가 없습니다
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 상세 평가 평균 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>⭐ 상세 평가 평균</h3>
                      <div className={styles.analyticsRatingList}>
                        {Object.keys(analyticsData.avgRatings).length > 0 ? (
                          <>
                            {analyticsData.avgRatings.fee_satisfaction && (
                              <div className={styles.ratingItem}>
                                <span className={styles.ratingLabel}>수수료 만족도</span>
                                <div className={styles.ratingStars}>
                                  {'★'.repeat(Math.round(analyticsData.avgRatings.fee_satisfaction))}{'☆'.repeat(5 - Math.round(analyticsData.avgRatings.fee_satisfaction))}
                                </div>
                                <span className={styles.ratingValue}>{analyticsData.avgRatings.fee_satisfaction}</span>
                              </div>
                            )}
                            {analyticsData.avgRatings.expertise && (
                              <div className={styles.ratingItem}>
                                <span className={styles.ratingLabel}>전문성/지식</span>
                                <div className={styles.ratingStars}>
                                  {'★'.repeat(Math.round(analyticsData.avgRatings.expertise))}{'☆'.repeat(5 - Math.round(analyticsData.avgRatings.expertise))}
                                </div>
                                <span className={styles.ratingValue}>{analyticsData.avgRatings.expertise}</span>
                              </div>
                            )}
                            {analyticsData.avgRatings.kindness && (
                              <div className={styles.ratingItem}>
                                <span className={styles.ratingLabel}>친절도</span>
                                <div className={styles.ratingStars}>
                                  {'★'.repeat(Math.round(analyticsData.avgRatings.kindness))}{'☆'.repeat(5 - Math.round(analyticsData.avgRatings.kindness))}
                                </div>
                                <span className={styles.ratingValue}>{analyticsData.avgRatings.kindness}</span>
                              </div>
                            )}
                            {analyticsData.avgRatings.property_reliability && (
                              <div className={styles.ratingItem}>
                                <span className={styles.ratingLabel}>매물 신뢰도</span>
                                <div className={styles.ratingStars}>
                                  {'★'.repeat(Math.round(analyticsData.avgRatings.property_reliability))}{'☆'.repeat(5 - Math.round(analyticsData.avgRatings.property_reliability))}
                                </div>
                                <span className={styles.ratingValue}>{analyticsData.avgRatings.property_reliability}</span>
                              </div>
                            )}
                            {analyticsData.avgRatings.response_speed && (
                              <div className={styles.ratingItem}>
                                <span className={styles.ratingLabel}>소통/응대</span>
                                <div className={styles.ratingStars}>
                                  {'★'.repeat(Math.round(analyticsData.avgRatings.response_speed))}{'☆'.repeat(5 - Math.round(analyticsData.avgRatings.response_speed))}
                                </div>
                                <span className={styles.ratingValue}>{analyticsData.avgRatings.response_speed}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            데이터가 없습니다
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 월별 가입자 현황 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>👤 월별 가입자 현황 (최근 6개월)</h3>
                      <div className={styles.monthlyTrend}>
                        {analyticsData.monthlySignups && analyticsData.monthlySignups.length > 0 ? (
                          (() => {
                            const maxCount = Math.max(...analyticsData.monthlySignups.map((t: any) => t.total), 1)
                            return (
                              <>
                                {/* 범례 */}
                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginBottom: '8px', fontSize: '11px', color: '#64748b' }}>
                                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#facc15', borderRadius: '2px', marginRight: '4px' }}></span>카카오</span>
                                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#4285f4', borderRadius: '2px', marginRight: '4px' }}></span>구글</span>
                                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#94a3b8', borderRadius: '2px', marginRight: '4px' }}></span>합계</span>
                                </div>
                                {analyticsData.monthlySignups.map((item: any) => (
                                  <div key={item.month} className={styles.trendRow}>
                                    <span className={styles.trendMonth}>{item.month}</span>
                                    <div className={styles.trendBarWrap} style={{ position: 'relative' }}>
                                      <div style={{
                                        position: 'absolute', top: 0, left: 0, height: '100%',
                                        width: `${(item.total / maxCount) * 100}%`,
                                        background: '#e2e8f0', borderRadius: '4px',
                                      }} />
                                      <div style={{
                                        position: 'absolute', top: 0, left: 0, height: '50%',
                                        width: `${(item.kakao / maxCount) * 100}%`,
                                        background: '#facc15', borderRadius: '4px 4px 0 0',
                                      }} />
                                      <div style={{
                                        position: 'absolute', bottom: 0, left: 0, height: '50%',
                                        width: `${(item.google / maxCount) * 100}%`,
                                        background: '#4285f4', borderRadius: '0 0 4px 4px',
                                      }} />
                                    </div>
                                    <span className={styles.trendValue} style={{ minWidth: '90px', fontSize: '11px' }}>
                                      {item.total}명 <span style={{ color: '#ca8a04' }}>K{item.kakao}</span> <span style={{ color: '#4285f4' }}>G{item.google}</span>
                                    </span>
                                  </div>
                                ))}
                              </>
                            )
                          })()
                        ) : (
                          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px 0' }}>최근 6개월간 가입 데이터가 없습니다.</p>
                        )}
                      </div>
                    </div>

                    {/* 월별 리뷰 추이 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>📈 월별 리뷰 추이 (최근 6개월)</h3>
                      <div className={styles.monthlyTrend}>
                        {analyticsData.monthlyTrend && analyticsData.monthlyTrend.length > 0 ? (
                          (() => {
                            const maxCount = Math.max(...analyticsData.monthlyTrend.map((t: any) => t.count), 1)
                            // 시간순 정렬 (오래된 → 최신)
                            const sorted = [...analyticsData.monthlyTrend].sort((a: any, b: any) => a.month.localeCompare(b.month))
                            return sorted.map((trend: any) => (
                              <div key={trend.month} className={styles.trendRow}>
                                <span className={styles.trendMonth}>{trend.month}</span>
                                <div className={styles.trendBarWrap}>
                                  <div className={styles.trendBar} style={{ width: `${(trend.count / maxCount) * 100}%` }}></div>
                                </div>
                                <span className={styles.trendValue}>{trend.count}건</span>
                              </div>
                            ))
                          })()
                        ) : (
                          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px 0' }}>최근 6개월간 리뷰 데이터가 없습니다.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 신고 관리 */}
              {adminMenu === 'reports' && (
                <div className={styles.adminSection}>
                  <h2 className={styles.adminSectionTitle}>신고 관리</h2>
                  <p className={styles.adminSectionDesc}>
                    사용자가 신고한 리뷰를 확인하고 처리 상태를 관리합니다.
                  </p>

                  {/* 상태 필터 - pill 버튼 */}
                  <div className={styles.partnerFilterBar}>
                    {['ALL', 'RECEIVED', 'PROCESSING', 'COMPLETED', 'DISMISSED'].map((st) => (
                      <button
                        key={st}
                        className={`${styles.partnerFilterBtn} ${reportStatusFilter === st ? styles.partnerFilterBtnActive : ''}`}
                        onClick={() => setReportStatusFilter(st)}
                      >
                        {st === 'ALL' ? '전체' : getReportStatusLabel(st)}
                        <span className={styles.partnerFilterCount}>
                          {st === 'ALL'
                            ? reports.length
                            : reports.filter(r => r.status === st).length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {isReportsLoading ? (
                    <div className={styles.partnerLoading}>
                      <div className={styles.partnerSpinner} />
                      <span>신고 목록을 불러오는 중...</span>
                    </div>
                  ) : (
                    <div className={styles.reportCardList}>
                      {reports
                        .filter((r) => reportStatusFilter === 'ALL' || r.status === reportStatusFilter)
                        .map((report) => {
                          const review = report.review
                          const agent = review?.agent
                          const ratings = [review?.fee_satisfaction, review?.expertise, review?.kindness, review?.property_reliability, review?.response_speed].filter((r): r is number => r != null)
                          const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length) : null

                          return (
                            <div key={report.id} className={styles.reportCard}>
                              {/* 카드 헤더: 상태 + 날짜 */}
                              <div className={styles.reportCardHeader}>
                                <span
                                  className={styles.statusBadge}
                                  style={getReportStatusStyle(report.status)}
                                >
                                  {getReportStatusLabel(report.status)}
                                </span>
                                <span className={styles.reportCardDate}>
                                  {new Date(report.created_at).toLocaleDateString('ko-KR')} {new Date(report.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              {/* 숨김 상태 배지 */}
                              {review?.is_hidden && (
                                <div className={styles.reportHiddenBadge}>
                                  <span>🚫</span> 이 리뷰는 숨김 처리되었습니다
                                </div>
                              )}

                              {/* 부동산 정보 섹션 */}
                              {agent && (
                                <div className={styles.reportAgentCard}>
                                  <div className={styles.reportAgentIcon}>🏢</div>
                                  <div className={styles.reportAgentInfo}>
                                    <span className={styles.reportAgentName}>{agent.agent_name || '알 수 없음'}</span>
                                    <span className={styles.reportAgentAddr}>{agent.road_address || '-'}</span>
                                    {agent.agent_number && (
                                      <span className={styles.reportAgentNum}>등록번호: {agent.agent_number}</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 리뷰 정보 섹션 */}
                              {review && (
                                <div className={styles.reportReviewCard}>
                                  <div className={styles.reportReviewHeader}>
                                    <span className={styles.reportReviewLabel}>📝 신고된 리뷰</span>
                                    {avgRating !== null && (
                                      <span className={styles.reportReviewRating}>
                                        {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                                        <span className={styles.reportReviewRatingNum}>{avgRating.toFixed(1)}</span>
                                      </span>
                                    )}
                                  </div>
                                  {review.transaction_tag && (
                                    <div className={styles.reportReviewTags}>
                                      <span className={styles.reportTransactionTag}>{review.transaction_tag}</span>
                                      {review.contract_date && (
                                        <span className={styles.reportContractDate}>계약일: {review.contract_date}</span>
                                      )}
                                    </div>
                                  )}
                                  {review.review_text && (
                                    <p className={styles.reportReviewText}>
                                      {review.review_text.length > 150 ? review.review_text.slice(0, 150) + '...' : review.review_text}
                                    </p>
                                  )}
                                  {/* 상세 평가 바 */}
                                  {ratings.length > 0 && (
                                    <div className={styles.reportRatingBars}>
                                      {[
                                        { label: '수수료', val: review.fee_satisfaction },
                                        { label: '전문성', val: review.expertise },
                                        { label: '친절도', val: review.kindness },
                                        { label: '매물신뢰', val: review.property_reliability },
                                        { label: '응답속도', val: review.response_speed },
                                      ].filter(r => r.val != null).map((item) => (
                                        <div key={item.label} className={styles.reportRatingBarRow}>
                                          <span className={styles.reportRatingBarLabel}>{item.label}</span>
                                          <div className={styles.reportRatingBarTrack}>
                                            <div className={styles.reportRatingBarFill} style={{ width: `${((item.val || 0) / 5) * 100}%` }} />
                                          </div>
                                          <span className={styles.reportRatingBarValue}>{item.val}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* 태그 표시 */}
                                  {(review.praise_tags?.length || review.regret_tags?.length) ? (
                                    <div className={styles.reportTagsRow}>
                                      {review.praise_tags?.map((tag, i) => (
                                        <span key={`p-${i}`} className={styles.reportPraiseTag}>👍 {tag}</span>
                                      ))}
                                      {review.regret_tags?.map((tag, i) => (
                                        <span key={`r-${i}`} className={styles.reportRegretTag}>👎 {tag}</span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              )}

                              {/* 신고 사유 섹션 */}
                              <div className={styles.reportReasonCard}>
                                <div className={styles.reportReasonRow}>
                                  <span className={styles.reportReasonLabel}>🚨 신고 사유</span>
                                  <span className={styles.reportReasonValue}>{getReportReasonLabel(report.reason)}</span>
                                </div>
                                {report.detail && (
                                  <p className={styles.reportReasonDetail}>{report.detail}</p>
                                )}
                                <div className={styles.reportReasonRow}>
                                  <span className={styles.reportReasonLabel}>👤 신고자</span>
                                  <span className={styles.reportReasonValue}>
                                    {report.reporter?.nickname || report.reporter?.email || report.reporter_user_id.slice(0, 8)}
                                  </span>
                                </div>
                              </div>

                              {/* 관리자 메모 */}
                              {report.admin_note && (
                                <div className={styles.reportAdminNote}>
                                  <span className={styles.reportAdminNoteLabel}>💬 관리자 메모</span>
                                  <p className={styles.reportAdminNoteText}>{report.admin_note}</p>
                                </div>
                              )}

                              {/* 상태 변경 영역 */}
                              {editingReport?.id === report.id ? (
                                <div className={styles.reportEditArea}>
                                  <div className={styles.partnerStatusSelect}>
                                    {['RECEIVED', 'PROCESSING', 'COMPLETED', 'DISMISSED'].map((st) => (
                                      <button
                                        key={st}
                                        className={`${styles.partnerStatusOption} ${editReportStatus === st ? styles.partnerStatusOptionActive : ''}`}
                                        onClick={() => setEditReportStatus(st)}
                                      >
                                        {getReportStatusLabel(st)}
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    className={styles.partnerReplyTextarea}
                                    value={editReportNote}
                                    onChange={(e) => setEditReportNote(e.target.value)}
                                    placeholder="관리자 메모 (선택)"
                                    rows={3}
                                  />
                                  <div className={styles.reportEditBtnRow}>
                                    <button className={styles.partnerBtnCancel} onClick={() => setEditingReport(null)}>
                                      취소
                                    </button>
                                    <button className={styles.partnerBtnSave} onClick={() => updateReportStatus(report.id, editReportStatus, editReportNote)}>
                                      저장
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className={styles.reportBtnGroup}>
                                  <button
                                    className={styles.reportActionBtn}
                                    onClick={() => {
                                      setEditingReport(report)
                                      setEditReportStatus(report.status)
                                      setEditReportNote(report.admin_note || '')
                                    }}
                                  >
                                    상태 변경
                                  </button>
                                  {review?.id && (
                                    <button
                                      className={`${styles.reportHideBtn} ${review.is_hidden ? styles.reportHideBtnActive : ''}`}
                                      onClick={() => toggleReviewHidden(review.id, !!review.is_hidden)}
                                    >
                                      {review.is_hidden ? '🔓 숨김 해제' : '🚫 리뷰 숨김'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      {reports.filter((r) => reportStatusFilter === 'ALL' || r.status === reportStatusFilter).length === 0 && (
                        <div className={styles.partnerEmpty}>
                          <div className={styles.partnerEmptyIcon}>🔍</div>
                          <p>신고 내역이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 콘텐츠 노출 관리 */}
              {adminMenu === 'content-visibility' && (
                <div className={styles.adminSection}>
                  <h2 className={styles.adminSectionTitle}>콘텐츠 노출 관리</h2>
                  <p className={styles.adminSectionDesc}>
                    사용자에게 표시되는 메뉴와 기능의 노출 여부를 관리합니다.
                  </p>

                  {/* 노출 설정 카드 */}
                  <div className={styles.visibilityCards}>
                    {/* 광고/제휴 메뉴 노출 */}
                    <div className={styles.visibilityCard}>
                      <div className={styles.visibilityCardHeader}>
                        <div className={styles.visibilityCardIcon}>📺</div>
                        <div className={styles.visibilityCardInfo}>
                          <h3 className={styles.visibilityCardTitle}>광고 노출</h3>
                          <p className={styles.visibilityCardDesc}>
                            사이드바에 "광고보기" 버튼 표시 여부 (광고 시청 시 10P 적립)
                          </p>
                        </div>
                      </div>
                      <div className={styles.visibilityCardBody}>
                        <div className={styles.visibilityToggleGroup}>
                          <label className={styles.visibilityToggleLabel}>
                            <input
                              type="radio"
                              name="advertisement"
                              value="Y"
                              checked={adVisibility === 'Y'}
                              onChange={(e) => setAdVisibility(e.target.value)}
                              className={styles.visibilityRadio}
                            />
                            <span className={styles.visibilityToggleText}>노출</span>
                          </label>
                          <label className={styles.visibilityToggleLabel}>
                            <input
                              type="radio"
                              name="advertisement"
                              value="N"
                              checked={adVisibility === 'N'}
                              onChange={(e) => setAdVisibility(e.target.value)}
                              className={styles.visibilityRadio}
                            />
                            <span className={styles.visibilityToggleText}>숨김</span>
                          </label>
                        </div>
                        {adVisibility === 'Y' && (
                          <div style={{ marginTop: '12px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>일일 시청 횟수 제한</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={adViewDailyLimit}
                                onChange={(e) => setAdViewDailyLimit(e.target.value)}
                                style={{ width: '60px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '13px', color: '#64748b' }}>회 / 일</span>
                            </div>
                          </div>
                        )}
                        <div className={styles.visibilityCardMeta}>
                          <span className={styles.visibilityMetaItem}>
                            📍 위치: 사이드바 &gt; 광고보기
                          </span>
                          <span className={styles.visibilityMetaItem}>
                            💰 보상: 광고 시청 완료 시 10P 적립
                          </span>
                          <span className={styles.visibilityMetaItem}>
                            🔁 일일 제한: {adViewDailyLimit}회
                          </span>
                          <span className={styles.visibilityMetaItem}>
                            🔑 설정 키: ADVERTISEMENT_VISIBLE, AD_VIEW_DAILY_LIMIT
                          </span>
                        </div>
                      </div>
                      <div className={styles.visibilityCardFooter}>
                        <button 
                          className={styles.visibilitySaveBtn}
                          onClick={async () => {
                            try {
                              const [adResult, limitResult] = await Promise.all([
                                supabase
                                  .from('common_code_detail')
                                  .update({
                                    description: adVisibility === 'Y' ? 'Y:노출,N:숨김' : 'N:노출,Y:숨김',
                                    updated_at: new Date().toISOString()
                                  })
                                  .eq('code_group', 'SYSTEM_CONFIG')
                                  .eq('code_value', 'ADVERTISEMENT_VISIBLE'),
                                supabase
                                  .from('common_code_detail')
                                  .upsert({
                                    code_group: 'SYSTEM_CONFIG',
                                    code_value: 'AD_VIEW_DAILY_LIMIT',
                                    code_name: adViewDailyLimit || '3',
                                    description: `광고 시청 일일 최대 횟수 (현재: ${adViewDailyLimit}회)`,
                                    sort_order: 4,
                                    use_yn: 'Y',
                                    sta_ymd: '20240101',
                                    end_ymd: '99991231',
                                    updated_at: new Date().toISOString()
                                  }, { onConflict: 'code_group,code_value' })
                              ])

                              if (adResult.error || limitResult.error) {
                                showError('설정 저장에 실패했습니다: ' + (adResult.error?.message || limitResult.error?.message))
                              } else {
                                setSaveSuccessMessage('광고 노출 설정이 저장되었습니다.')
                                setShowSaveSuccessToast(true)
                                setTimeout(() => setShowSaveSuccessToast(false), 2000)
                                window.dispatchEvent(new Event('visibility:changed'))
                              }
                            } catch (error) {
                              showError('설정 저장 중 오류가 발생했습니다.')
                            }
                          }}
                        >
                          저장
                        </button>
                      </div>
                    </div>

                    {/* 서베이 메뉴 노출 */}
                    <div className={styles.visibilityCard}>
                      <div className={styles.visibilityCardHeader}>
                        <div className={styles.visibilityCardIcon}>📋</div>
                        <div className={styles.visibilityCardInfo}>
                          <h3 className={styles.visibilityCardTitle}>서베이 메뉴</h3>
                          <p className={styles.visibilityCardDesc}>
                            사이드바에 "서베이" 메뉴 표시 여부
                          </p>
                        </div>
                      </div>
                      <div className={styles.visibilityCardBody}>
                        <div className={styles.visibilityToggleGroup}>
                          <label className={styles.visibilityToggleLabel}>
                            <input
                              type="radio"
                              name="survey"
                              value="Y"
                              checked={surveyVisibility === 'Y'}
                              onChange={(e) => setSurveyVisibility(e.target.value)}
                              className={styles.visibilityRadio}
                            />
                            <span className={styles.visibilityToggleText}>노출</span>
                          </label>
                          <label className={styles.visibilityToggleLabel}>
                            <input
                              type="radio"
                              name="survey"
                              value="N"
                              checked={surveyVisibility === 'N'}
                              onChange={(e) => setSurveyVisibility(e.target.value)}
                              className={styles.visibilityRadio}
                            />
                            <span className={styles.visibilityToggleText}>숨김</span>
                          </label>
                        </div>
                        <div className={styles.visibilityCardMeta}>
                          <span className={styles.visibilityMetaItem}>
                            📍 위치: 사이드바 &gt; 서베이
                          </span>
                          <span className={styles.visibilityMetaItem}>
                            🔑 설정 키: SURVEY_VISIBLE
                          </span>
                        </div>
                      </div>
                      <div className={styles.visibilityCardFooter}>
                        <button 
                          className={styles.visibilitySaveBtn}
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('common_code_detail')
                                .update({
                                  description: surveyVisibility === 'Y' ? 'Y:노출,N:숨김' : 'N:노출,Y:숨김',
                                  updated_at: new Date().toISOString()
                                })
                                .eq('code_group', 'SYSTEM_CONFIG')
                                .eq('code_value', 'SURVEY_VISIBLE')

                              if (error) {
                                showError('설정 저장에 실패했습니다: ' + error.message)
                              } else {
                                setSaveSuccessMessage('서베이 노출 설정이 저장되었습니다.')
                                setShowSaveSuccessToast(true)
                                setTimeout(() => setShowSaveSuccessToast(false), 2000)
                                
                                // 실시간 반영을 위한 이벤트 발생
                                window.dispatchEvent(new Event('visibility:changed'))
                              }
                            } catch (error) {
                              showError('설정 저장 중 오류가 발생했습니다.')
                            }
                          }}
                        >
                          저장
                        </button>
                      </div>
                    </div>

                    {/* 메인 광고(쿠팡) 노출 */}
                    <div className={styles.visibilityCard}>
                      <div className={styles.visibilityCardHeader}>
                        <div className={styles.visibilityCardIcon}>🛒</div>
                        <div className={styles.visibilityCardInfo}>
                          <h3 className={styles.visibilityCardTitle}>메인 광고 (쿠팡 파트너스)</h3>
                          <p className={styles.visibilityCardDesc}>
                            메인 화면에 쿠팡 파트너스 배너(320x50) 표시 여부 및 위치
                          </p>
                        </div>
                      </div>
                      <div className={styles.visibilityCardBody}>
                        <div className={styles.visibilityToggleGroup}>
                          <label className={styles.visibilityToggleLabel}>
                            <input
                              type="radio"
                              name="mainAd"
                              value="Y"
                              checked={mainAdVisibility === 'Y'}
                              onChange={(e) => setMainAdVisibility(e.target.value)}
                              className={styles.visibilityRadio}
                            />
                            <span className={styles.visibilityToggleText}>노출</span>
                          </label>
                          <label className={styles.visibilityToggleLabel}>
                            <input
                              type="radio"
                              name="mainAd"
                              value="N"
                              checked={mainAdVisibility === 'N'}
                              onChange={(e) => setMainAdVisibility(e.target.value)}
                              className={styles.visibilityRadio}
                            />
                            <span className={styles.visibilityToggleText}>숨김</span>
                          </label>
                        </div>
                        {mainAdVisibility === 'Y' && (
                          <>
                            <div style={{ marginTop: '12px' }}>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>배너 위치</p>
                              <div className={styles.visibilityToggleGroup}>
                                <label className={styles.visibilityToggleLabel}>
                                  <input
                                    type="radio"
                                    name="mainAdPosition"
                                    value="TOP"
                                    checked={mainAdPosition === 'TOP'}
                                    onChange={() => setMainAdPosition('TOP')}
                                    className={styles.visibilityRadio}
                                  />
                                  <span className={styles.visibilityToggleText}>상단 (검색바 위)</span>
                                </label>
                                <label className={styles.visibilityToggleLabel}>
                                  <input
                                    type="radio"
                                    name="mainAdPosition"
                                    value="BOTTOM"
                                    checked={mainAdPosition === 'BOTTOM'}
                                    onChange={() => setMainAdPosition('BOTTOM')}
                                    className={styles.visibilityRadio}
                                  />
                                  <span className={styles.visibilityToggleText}>하단 (풋터 위)</span>
                                </label>
                              </div>
                            </div>
                            <div style={{ marginTop: '12px' }}>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>노출 디바이스</p>
                              <div className={styles.visibilityToggleGroup}>
                                <label className={styles.visibilityToggleLabel}>
                                  <input
                                    type="radio"
                                    name="mainAdDevice"
                                    value="MOBILE"
                                    checked={mainAdDevice === 'MOBILE'}
                                    onChange={() => setMainAdDevice('MOBILE')}
                                    className={styles.visibilityRadio}
                                  />
                                  <span className={styles.visibilityToggleText}>웹 (모바일)</span>
                                </label>
                                <label className={styles.visibilityToggleLabel}>
                                  <input
                                    type="radio"
                                    name="mainAdDevice"
                                    value="PC"
                                    checked={mainAdDevice === 'PC'}
                                    onChange={() => setMainAdDevice('PC')}
                                    className={styles.visibilityRadio}
                                  />
                                  <span className={styles.visibilityToggleText}>PC</span>
                                </label>
                                <label className={styles.visibilityToggleLabel}>
                                  <input
                                    type="radio"
                                    name="mainAdDevice"
                                    value="ALL"
                                    checked={mainAdDevice === 'ALL'}
                                    onChange={() => setMainAdDevice('ALL')}
                                    className={styles.visibilityRadio}
                                  />
                                  <span className={styles.visibilityToggleText}>웹 + PC</span>
                                </label>
                              </div>
                            </div>
                          </>
                        )}
                        <div className={styles.visibilityCardMeta}>
                          <span className={styles.visibilityMetaItem}>
                            📍 위치: 메인 화면 {mainAdPosition === 'TOP' ? '상단 (검색바 위)' : '하단 (풋터 위)'}
                          </span>
                          <span className={styles.visibilityMetaItem}>
                            📱 디바이스: {mainAdDevice === 'MOBILE' ? '웹 (모바일)' : mainAdDevice === 'PC' ? 'PC' : '웹 + PC'}
                          </span>
                          <span className={styles.visibilityMetaItem}>
                            📐 배너 사이즈: 320 x 50
                          </span>
                          <span className={styles.visibilityMetaItem}>
                            🔑 설정 키: MAIN_AD_VISIBLE
                          </span>
                        </div>
                      </div>
                      <div className={styles.visibilityCardFooter}>
                        <button 
                          className={styles.visibilitySaveBtn}
                          onClick={async () => {
                            try {
                              const desc = mainAdVisibility === 'Y' ? `Y:노출,${mainAdPosition},${mainAdDevice}` : 'N:숨김'
                              const { error } = await supabase
                                .from('common_code_detail')
                                .update({
                                  description: desc,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('code_group', 'SYSTEM_CONFIG')
                                .eq('code_value', 'MAIN_AD_VISIBLE')

                              if (error) {
                                showError('설정 저장에 실패했습니다: ' + error.message)
                              } else {
                                setSaveSuccessMessage('메인 광고 설정이 저장되었습니다.')
                                setShowSaveSuccessToast(true)
                                setTimeout(() => setShowSaveSuccessToast(false), 2000)
                                window.dispatchEvent(new Event('visibility:changed'))
                              }
                            } catch (error) {
                              showError('설정 저장 중 오류가 발생했습니다.')
                            }
                          }}
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 안내 메시지 */}
                  <div className={styles.visibilityNotice}>
                    <div className={styles.visibilityNoticeIcon}>💡</div>
                    <div className={styles.visibilityNoticeContent}>
                      <h4 className={styles.visibilityNoticeTitle}>노출 관리 안내</h4>
                      <ul className={styles.visibilityNoticeList}>
                        <li>설정 변경 시 즉시 모든 사용자에게 적용됩니다.</li>
                        <li>&ldquo;숨김&rdquo;으로 설정하면 해당 기능이 비활성화됩니다.</li>
                        <li>관리자는 숨김 설정과 관계없이 모든 메뉴에 접근할 수 있습니다.</li>
                        <li>설정은 common_code_detail 테이블의 SYSTEM_CONFIG 그룹에 저장됩니다.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 마스터 코드 편집 모달 */}
              {editingMaster && (
                <div className={styles.modalOverlay} onClick={() => {
                  setEditingMaster(null)
                  setIsNewMaster(false)
                }}>
                  <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                      <h3>{isNewMaster ? '마스터 코드 추가' : '마스터 코드 수정'}</h3>
                      <button 
                        className={styles.modalCloseButton}
                        onClick={() => {
                          setEditingMaster(null)
                          setIsNewMaster(false)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className={styles.modalBody}>
                      <div className={styles.codeEditorGrid}>
                        <label className={styles.codeEditorLabel}>
                          코드 그룹
                          <input
                            className={styles.codeEditorInput}
                            value={editingMaster.code_group}
                            onChange={(e) => setEditingMaster((prev) => prev ? { ...prev, code_group: e.target.value } : prev)}
                            disabled={!isNewMaster}
                          />
                        </label>
                        <label className={styles.codeEditorLabel}>
                          코드 그룹명
                          <input
                            className={styles.codeEditorInput}
                            value={editingMaster.code_group_name}
                            onChange={(e) => setEditingMaster((prev) => prev ? { ...prev, code_group_name: e.target.value } : prev)}
                          />
                        </label>
                        <label className={styles.codeEditorLabel}>
                          시작일자
                          <input
                            type="date"
                            className={styles.codeEditorInput}
                            value={editingMaster.sta_ymd}
                            onChange={(e) => setEditingMaster((prev) => prev ? { ...prev, sta_ymd: e.target.value } : prev)}
                          />
                        </label>
                        <label className={styles.codeEditorLabel}>
                          종료일자
                          <input
                            type="date"
                            className={styles.codeEditorInput}
                            value={editingMaster.end_ymd}
                            onChange={(e) => setEditingMaster((prev) => prev ? { ...prev, end_ymd: e.target.value } : prev)}
                          />
                        </label>
                        <label className={styles.codeEditorLabel}>
                          사용 여부
                          <select
                            className={styles.codeEditorSelect}
                            value={editingMaster.use_yn}
                            onChange={(e) => setEditingMaster((prev) => prev ? { ...prev, use_yn: e.target.value } : prev)}
                          >
                            <option value="Y">Y</option>
                            <option value="N">N</option>
                          </select>
                        </label>
                        <label className={styles.codeEditorLabel}>
                          설명
                          <textarea
                            className={styles.codeEditorTextarea}
                            value={editingMaster.description}
                            onChange={(e) => setEditingMaster((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                          />
                        </label>
                      </div>
                    </div>
                    <div className={styles.modalFooter}>
                      <button className={styles.modalCancelButton} type="button" onClick={() => {
                        setEditingMaster(null)
                        setIsNewMaster(false)
                      }}>취소</button>
                      <button className={styles.modalSaveButton} type="button" onClick={saveMaster}>저장</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 저장 성공 토스트 */}
              {showSaveSuccessToast && (
                <div className={styles.saveSuccessToast}>
                  <div className={styles.toastIcon}>✓</div>
                  <div className={styles.toastMessage}>{saveSuccessMessage}</div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* 내 계약서 보기 모달 */}
      {isMyContractsModalOpen && (
        <div className={styles.overlay} onClick={() => setIsMyContractsModalOpen(false)}>
          <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoModalContent}>
              <div className={styles.infoModalHeader}>
                <h3 className={styles.infoModalTitle}>내 계약서</h3>
                <button className={styles.closeButton} onClick={() => setIsMyContractsModalOpen(false)} aria-label="닫기">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div className={styles.infoModalBody}>
                {myContracts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    등록된 계약서가 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {myContracts.map((contract) => (
                      <button
                        key={contract.id}
                        onClick={async () => {
                          setSelectedContract(contract)
                          setIsContractDetailModalOpen(true)
                          setDecryptedImageUrl(null)
                          setIsImageLoading(true)

                          // 계약서 이미지가 있으면 로드
                          if (contract.contract_image_url) {
                            try {
                              console.log('[계약서 조회] 파일 다운로드 시작:', contract.contract_image_url)
                              
                              // Storage에서 파일 다운로드
                              const { data: fileData, error: downloadError } = await supabase.storage
                                .from('contracts')
                                .download(contract.contract_image_url)

                              if (downloadError) {
                                console.error('[계약서 조회] 다운로드 실패:', downloadError)
                                setIsImageLoading(false)
                                return
                              }

                              // Blob을 base64로 변환
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setDecryptedImageUrl(reader.result as string)
                                console.log('[계약서 조회] 이미지 로드 완료')
                              }
                              reader.readAsDataURL(fileData)
                            } catch (error) {
                              console.error('[계약서 조회] 이미지 로드 실패:', error)
                              setIsImageLoading(false)
                            } finally {
                              setIsImageLoading(false)
                            }
                          } else {
                            setIsImageLoading(false)
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#063561'
                          e.currentTarget.style.backgroundColor = '#f8fafc'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0'
                          e.currentTarget.style.backgroundColor = '#ffffff'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                          {contract.agent?.agent_name || '알 수 없음'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                          계약일: {contract.contract_date || '-'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          등록일: {new Date(contract.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계약서 상세 모달 */}
      {isContractDetailModalOpen && selectedContract && (
        <div className={styles.overlay} onClick={() => {
          setIsContractDetailModalOpen(false)
          setSelectedContract(null)
          setDecryptedImageUrl(null)
          setIsImageLoading(false)
        }}>
          <div 
            className={styles.infoModal} 
            style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.infoModalContent}>
              <div className={styles.infoModalHeader}>
                <h3 className={styles.infoModalTitle}>계약서 상세</h3>
                <button 
                  className={styles.closeButton} 
                  onClick={() => {
                    setIsContractDetailModalOpen(false)
                    setSelectedContract(null)
                  }} 
                  aria-label="닫기"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div className={styles.infoModalBody} style={{ padding: '20px' }}>
                {/* 계약서 이미지 */}
                {selectedContract.contract_image_url && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
                      계약서 이미지
                    </h4>
                    {isImageLoading ? (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        minHeight: '200px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            border: '4px solid #e1e8f0',
                            borderTopColor: '#063561',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 12px'
                          }} />
                          <p style={{ color: '#64748b', fontSize: '14px' }}>이미지 로딩 중...</p>
                          <style dangerouslySetInnerHTML={{__html: `
                            @keyframes spin {
                              to { transform: rotate(360deg); }
                            }
                          `}} />
                        </div>
                      </div>
                    ) : decryptedImageUrl ? (
                      <>
                        <img 
                          src={decryptedImageUrl} 
                          alt="계약서"
                          style={{
                            width: '100%',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const newWindow = window.open('', '_blank')
                            if (newWindow) {
                              newWindow.document.write(`
                                <html>
                                  <head><title>계약서</title></head>
                                  <body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                                    <img src="${decryptedImageUrl}" style="max-width:100%;max-height:100vh;" />
                                  </body>
                                </html>
                              `)
                            }
                          }}
                        />
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                          * 이미지를 클릭하면 새 창에서 볼 수 있습니다
                        </p>
                      </>
                    ) : (
                      <div style={{ 
                        padding: '40px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        color: '#64748b'
                      }}>
                        계약서 이미지를 불러올 수 없습니다.
                      </div>
                    )}
                  </div>
                )}

                {/* 중개사 정보 */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
                    중개사 정보
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '100px', color: '#64748b', fontSize: '14px' }}>사무소명:</span>
                      <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: 500 }}>
                        {selectedContract.agent?.agent_name || '알 수 없음'}
                      </span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '100px', color: '#64748b', fontSize: '14px' }}>주소:</span>
                      <span style={{ color: '#1e293b', fontSize: '14px' }}>
                        {selectedContract.agent?.road_address || selectedContract.agent?.lot_address || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '100px', color: '#64748b', fontSize: '14px' }}>계약일:</span>
                      <span style={{ color: '#1e293b', fontSize: '14px' }}>
                        {selectedContract.contract_date || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 리뷰 정보 */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
                    리뷰
                  </h4>
                  
                  {/* 거래 태그 */}
                  {selectedContract.transaction_tag && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: 500
                      }}>
                        {selectedContract.transaction_tag}
                      </span>
                    </div>
                  )}

                  {/* 칭찬/아쉬움 태그 */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {selectedContract.praise_tags?.map((tag: string, idx: number) => (
                      <span 
                        key={`praise-${idx}`}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          borderRadius: '16px',
                          fontSize: '13px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {selectedContract.regret_tags?.map((tag: string, idx: number) => (
                      <span 
                        key={`regret-${idx}`}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: '16px',
                          fontSize: '13px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 평가 점수 */}
                  <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: '수수료 만족도', value: selectedContract.fee_satisfaction },
                      { label: '전문성/지식', value: selectedContract.expertise },
                      { label: '친절/태도', value: selectedContract.kindness },
                      { label: '매물 신뢰도', value: selectedContract.property_reliability },
                      { label: '응답 속도', value: selectedContract.response_speed },
                    ].map((item, idx) => item.value && (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>{item.label}:</span>
                        <span style={{ fontSize: '14px', color: '#f59e0b' }}>
                          {'★'.repeat(item.value)}{'☆'.repeat(5 - item.value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 상세 리뷰 */}
                  {selectedContract.review_text && (
                    <div>
                      <div style={{ 
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#334155',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {selectedContract.review_text}
                      </div>
                    </div>
                  )}
                </div>

                {/* 뒤로 가기 버튼 */}
                <button
                  onClick={() => {
                    setIsContractDetailModalOpen(false)
                    setSelectedContract(null)
                    setDecryptedImageUrl(null)
                    setIsImageLoading(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#063561',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  목록으로
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 배치 실행 중 풀스크린 오버레이 */}
      {runningBatchJobId !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px 48px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '360px',
            width: '90%',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
              배치 실행 중
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>
              API를 호출하고 있습니다. 잠시만 기다려주세요.
            </p>
            <div style={{
              display: 'inline-block',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '20px',
              fontWeight: 700,
              color: '#2563eb',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.floor(batchRunElapsed / 60) > 0 && `${Math.floor(batchRunElapsed / 60)}분 `}{batchRunElapsed % 60}초
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              화면을 닫지 마세요
            </p>
          </div>
        </div>
      )}
    </>
  )
}

