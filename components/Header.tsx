'use client'

import { useState, useEffect } from 'react'
import styles from './Header.module.css'
import { signInWithKakao, signInWithGoogle, getCurrentUser, signOut } from '@/lib/auth'
import { logAccess } from '@/lib/accessLog'
import { supabase } from '@/lib/supabase/client'

export default function Header() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isGradeInfoModalOpen, setIsGradeInfoModalOpen] = useState(false)
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false)
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [isAdminScreenOpen, setIsAdminScreenOpen] = useState(false)
  const [adminMenu, setAdminMenu] = useState<'common-code' | 'account' | 'batch' | 'analytics'>('common-code')
  const [selectedCodeGroup, setSelectedCodeGroup] = useState<string | null>(null)
  const [showSaveSuccessToast, setShowSaveSuccessToast] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
  const [masterSearchTerm, setMasterSearchTerm] = useState('')
  const [masterDateFrom, setMasterDateFrom] = useState('')
  const [masterDateTo, setMasterDateTo] = useState('')
  const [detailSearchTerm, setDetailSearchTerm] = useState('')
  const [detailDateFrom, setDetailDateFrom] = useState('')
  const [detailDateTo, setDetailDateTo] = useState('')
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
  
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])

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

  // users 테이블에서 user_type 조회
  const fetchUserType = async (supabaseUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('supabase_user_id', supabaseUserId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // 조용히 처리
      }

      if (data) {
        setUserType(data.user_type || null)
      } else {
        setUserType(null)
      }
    } catch (error) {
      // 모든 오류 조용히 처리
      setUserType(null)
    }
  }

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
        detailCountData.forEach((item) => {
          countMap[item.code_group] = (countMap[item.code_group] || 0) + 1
        })
      }

      // 마스터 데이터에 상세 개수 추가
      const masterWithCount = (masterData || []).map((m) => ({
        ...m,
        detail_count: countMap[m.code_group] || 0,
      }))

      setCodeMasterList(masterWithCount)
    } catch (error) {
      // 모든 오류 조용히 처리
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
        return
      }

      setCodeDetailList(data || [])
    } catch (error) {
      // 모든 오류 조용히 처리
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
          alert('마스터 코드 추가 실패: ' + error.message)
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
          alert('마스터 코드 수정 실패: ' + error.message)
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
      alert('저장 중 오류가 발생했습니다.')
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
          alert('상세 코드 추가 실패: ' + error.message)
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
          alert('상세 코드 수정 실패: ' + error.message)
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
      alert('저장 중 오류가 발생했습니다.')
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

      setUserList(data || [])
    } catch (error) {
      // 모든 오류 조용히 처리
    } finally {
      setIsUserLoading(false)
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
        alert('사용자 정보 수정 실패: ' + error.message)
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
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    let isMounted = true
    
    // 세션이 있을 때만 사용자 정보 확인
    const checkUser = async () => {
      try {
        // 먼저 세션 확인
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        
        if (session) {
          // 세션이 있으면 사용자 정보 설정
          setUser(session.user)
          // user_type 조회
          await fetchUserType(session.user.id)
        } else {
          // 세션이 없으면 사용자 정보 초기화
          setUser(null)
          setUserType(null)
        }
      } catch (error) {
        if (!isMounted) return
        // 모든 오류 조용히 처리
        setUser(null)
        setUserType(null)
      }
    }
    
    // 초기 사용자 확인 (세션이 있을 때만)
    checkUser()
    
    // 인증 상태 변경 감지 (로그인/로그아웃 시 자동 업데이트)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      
      if (session) {
        // 로그인 시 사용자 정보 설정
        setUser(session.user)
        
        // users 테이블에 Upsert (로그인 시 자동 동기화)
        try {
          const { upsertUserToUsersTable } = await import('@/lib/auth-check')
          await upsertUserToUsersTable(session.user)
        } catch (error) {
          // 모든 오류 조용히 처리
        }

        // user_type 조회
        if (isMounted) {
          await fetchUserType(session.user.id)
        }
      } else {
        // 로그아웃 시 사용자 정보 초기화
        setUser(null)
        setUserType(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // 관리자 화면 열릴 때 공통코드 데이터 로드
  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      if (isAdminScreenOpen && adminMenu === 'common-code' && isMounted) {
        await Promise.all([fetchCodeMaster(), fetchCodeDetail()])
      }
    }
    
    loadData()
    
    return () => {
      isMounted = false
    }
  }, [isAdminScreenOpen, adminMenu])

  // 관리자 화면 열릴 때 계정 데이터 로드
  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      if (isAdminScreenOpen && adminMenu === 'account' && isMounted) {
        await fetchUsers()
      }
    }
    
    loadData()
    
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
      setIsLoading(true)
      await signInWithKakao()
      logAccess({ action: 'kakao_login_initiated' })
      // OAuth 리다이렉트가 발생하므로 모달은 자동으로 닫힘
    } catch (error) {
      console.error('카카오 로그인 오류:', error)
      alert('카카오 로그인 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle()
      logAccess({ action: 'google_login_initiated' })
      // OAuth 리다이렉트가 발생하므로 모달은 자동으로 닫힘
    } catch (error) {
      console.error('구글 로그인 오류:', error)
      alert('구글 로그인 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setUser(null)
      setIsProfileModalOpen(false)
      logAccess({ action: 'logout' })
      // 팝업 없이 바로 로그아웃
    } catch (error) {
      console.error('로그아웃 오류:', error)
      // 오류 발생 시에만 알림
      alert('로그아웃 중 오류가 발생했습니다.')
    }
  }

  const handleNotificationClick = () => {
    setIsNotificationModalOpen(true)
    // 예시 알림 데이터
    setNotifications([
      '미금부동산에 최근 리뷰 3건이 등록되었습니다.',
      '강남중개사무소에 새 리뷰 1건이 등록되었습니다.',
      '서초부동산에 최근 리뷰 5건이 등록되었습니다.',
    ])
  }

  const handleProfileClick = () => {
    setIsProfileModalOpen(true)
  }

  const closeNotificationModal = () => {
    setIsNotificationModalOpen(false)
  }

  const closeProfileModal = () => {
    setIsProfileModalOpen(false)
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
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            복비까비
          </div>
          <div className={styles.rightSection}>
            {user ? (
              <div className={styles.userMenu}>
                <button
                  className={styles.iconButton}
                  onClick={handleNotificationClick}
                  aria-label="알림"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13.73 21a2 2 0 0 1-3.46 0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  className={styles.iconButton}
                  onClick={handleProfileClick}
                  aria-label="프로필"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {isAdmin && (
                  <button
                    className={`${styles.iconButton} ${styles.adminIconButton}`}
                    onClick={openAdminScreen}
                    aria-label="관리자"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
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
                  내 복비가 아깝지 않도록, 검증된 중개사 찾기<br />
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

      {/* 알림 모달 */}
      {isNotificationModalOpen && (
        <div className={styles.overlay} onClick={closeNotificationModal}>
          <div className={styles.notificationModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.notificationModalContent}>
              <div className={styles.notificationModalHeader}>
                <h3 className={styles.notificationModalTitle}>알림</h3>
                <button
                  className={styles.closeButton}
                  onClick={closeNotificationModal}
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
              <div className={styles.notificationList}>
                {notifications.length > 0 ? (
                  notifications.map((notification, index) => (
                    <div key={index} className={styles.notificationItem}>
                      <div className={styles.notificationIcon}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                            stroke="#063561"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M13.73 21a2 2 0 0 1-3.46 0"
                            stroke="#063561"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className={styles.notificationText}>
                        {notification}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyNotification}>
                    알림이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 모달 */}
      {isProfileModalOpen && user && (
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
                        {user.user_metadata?.name ||
                          user.user_metadata?.kakao_account?.profile?.nickname ||
                          user.user_metadata?.properties?.nickname ||
                          user.user_metadata?.nickname ||
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

                  <p className={styles.profileEmail}>{user.email || user.user_metadata?.kakao_account?.email || ''}</p>

                  <div className={styles.profileStats}>작성 리뷰 12 · 도움 58</div>
                </div>
              </div>
              <div className={styles.profileActions}>
                <div className={styles.navList}>
                  <button className={styles.navItem} type="button">
                    <span className={styles.navLeft}>
                      <span className={styles.navIcon} aria-hidden="true">
                        📝
                      </span>
                      <span className={styles.navLabel}>내 리뷰 보기</span>
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
                      <span className={styles.navLabel}>광고/제휴 문의</span>
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

      {/* 광고/제휴 문의 */}
      {isPartnershipModalOpen && user && (
        <div className={styles.overlay} onClick={closePartnershipModal}>
          <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoModalContent}>
              <div className={styles.infoModalHeader}>
                <h3 className={styles.infoModalTitle}>광고/제휴 문의</h3>
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
                <p className={styles.infoText}>
                  광고/제휴는 아래 이메일로 문의해 주세요.
                </p>
                <a className={styles.infoLink} href="mailto:partnership@bokbikkabi.com">
                  partnership@bokbikkabi.com
                </a>
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
                    alert('알림설정 (목)')
                  }}
                >
                  알림설정
                </button>
                <button
                  className={styles.settingsItem}
                  type="button"
                  onClick={() => {
                    // TODO: 서비스 설정 화면/모달 연결
                    alert('서비스 설정 (목)')
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
                  onClick={() => alert('사용자 관리 (목)')}
                >
                  <span className={styles.adminMenuIcon}>👥</span>
                  <span className={styles.adminMenuLabel}>사용자 관리</span>
                </button>
                <button
                  className={styles.adminMenuItem}
                  type="button"
                  onClick={() => alert('리뷰 관리 (목)')}
                >
                  <span className={styles.adminMenuIcon}>📝</span>
                  <span className={styles.adminMenuLabel}>리뷰 관리</span>
                </button>
                <button
                  className={styles.adminMenuItem}
                  type="button"
                  onClick={() => alert('신고 관리 (목)')}
                >
                  <span className={styles.adminMenuIcon}>🚨</span>
                  <span className={styles.adminMenuLabel}>신고 관리</span>
                </button>
                <button
                  className={styles.adminMenuItem}
                  type="button"
                  onClick={() => alert('통계 (목)')}
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
          </div>

          <div className={styles.adminScreenBody}>
            {/* 좌측 사이드바 */}
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
                          <th>가입일</th>
                          <th>최근 로그인</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isUserLoading ? (
                          <tr>
                            <td colSpan={7} className={styles.loadingCell}>계정 정보를 불러오는 중...</td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className={styles.emptyCell}>조회된 계정이 없습니다.</td>
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
                </div>
              )}

              {/* 배치 관리 */}
              {adminMenu === 'batch' && (
                <div className={styles.adminSection}>
                  <h2 className={styles.adminSectionTitle}>배치 관리</h2>
                  <p className={styles.adminSectionDesc}>
                    시스템 배치 작업을 관리하고 실행합니다.
                  </p>

                  {/* 배치 작업 목록 */}
                  <div className={styles.adminBatchList}>
                    <div className={styles.adminBatchItem}>
                      <div className={styles.adminBatchInfo}>
                        <h3 className={styles.adminBatchName}>중개사 데이터 동기화</h3>
                        <p className={styles.adminBatchDesc}>공공데이터 API에서 중개사 정보를 가져와 동기화합니다.</p>
                        <div className={styles.adminBatchMeta}>
                          <span className={styles.adminBatchSchedule}>⏰ 매일 02:00</span>
                          <span className={styles.adminBatchLastRun}>마지막 실행: 2025-01-23 02:00:15</span>
                          <span className={`${styles.adminBatchStatus} ${styles.batchStatusSuccess}`}>성공</span>
                        </div>
                      </div>
                      <div className={styles.adminBatchActions}>
                        <button className={styles.adminBatchRunBtn} type="button">
                          수동 실행
                        </button>
                        <button className={styles.adminBatchLogBtn} type="button">
                          로그 보기
                        </button>
                      </div>
                    </div>

                    <div className={styles.adminBatchItem}>
                      <div className={styles.adminBatchInfo}>
                        <h3 className={styles.adminBatchName}>접속 로그 정리</h3>
                        <p className={styles.adminBatchDesc}>30일 이상 된 접속 로그를 아카이빙합니다.</p>
                        <div className={styles.adminBatchMeta}>
                          <span className={styles.adminBatchSchedule}>⏰ 매주 일요일 04:00</span>
                          <span className={styles.adminBatchLastRun}>마지막 실행: 2025-01-19 04:00:22</span>
                          <span className={`${styles.adminBatchStatus} ${styles.batchStatusSuccess}`}>성공</span>
                        </div>
                      </div>
                      <div className={styles.adminBatchActions}>
                        <button className={styles.adminBatchRunBtn} type="button">
                          수동 실행
                        </button>
                        <button className={styles.adminBatchLogBtn} type="button">
                          로그 보기
                        </button>
                      </div>
                    </div>

                    <div className={styles.adminBatchItem}>
                      <div className={styles.adminBatchInfo}>
                        <h3 className={styles.adminBatchName}>부동산 계약서 정리</h3>
                        <p className={styles.adminBatchDesc}>검증이 완료되거나 만료된 계약서 파일을 정리합니다.</p>
                        <div className={styles.adminBatchMeta}>
                          <span className={styles.adminBatchSchedule}>⏰ 매일 05:00</span>
                          <span className={styles.adminBatchLastRun}>마지막 실행: 2025-01-23 05:00:12</span>
                          <span className={`${styles.adminBatchStatus} ${styles.batchStatusSuccess}`}>성공</span>
                        </div>
                      </div>
                      <div className={styles.adminBatchActions}>
                        <button className={styles.adminBatchRunBtn} type="button">
                          수동 실행
                        </button>
                        <button className={styles.adminBatchLogBtn} type="button">
                          로그 보기
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.adminActionButtons}>
                    <button
                      className={styles.adminAddButton}
                      type="button"
                      onClick={() => alert('배치 작업 추가 (목)')}
                    >
                      + 배치 작업 추가
                    </button>
                  </div>
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
                  <div className={styles.analyticsCards}>
                    <div className={styles.analyticsCard}>
                      <div className={styles.analyticsCardIcon}>👥</div>
                      <div className={styles.analyticsCardContent}>
                        <span className={styles.analyticsCardValue}>1,234</span>
                        <span className={styles.analyticsCardLabel}>총 사용자</span>
                      </div>
                      <span className={styles.analyticsCardTrend}>+12.5%</span>
                    </div>
                    <div className={styles.analyticsCard}>
                      <div className={styles.analyticsCardIcon}>📝</div>
                      <div className={styles.analyticsCardContent}>
                        <span className={styles.analyticsCardValue}>5,678</span>
                        <span className={styles.analyticsCardLabel}>총 리뷰</span>
                      </div>
                      <span className={styles.analyticsCardTrend}>+8.3%</span>
                    </div>
                    <div className={styles.analyticsCard}>
                      <div className={styles.analyticsCardIcon}>🏢</div>
                      <div className={styles.analyticsCardContent}>
                        <span className={styles.analyticsCardValue}>3,456</span>
                        <span className={styles.analyticsCardLabel}>중개사무소</span>
                      </div>
                      <span className={styles.analyticsCardTrend}>+2.1%</span>
                    </div>
                    <div className={styles.analyticsCard}>
                      <div className={styles.analyticsCardIcon}>⭐</div>
                      <div className={styles.analyticsCardContent}>
                        <span className={styles.analyticsCardValue}>4.2</span>
                        <span className={styles.analyticsCardLabel}>평균 평점</span>
                      </div>
                      <span className={styles.analyticsCardTrend}>+0.3</span>
                    </div>
                  </div>

                  <div className={styles.analyticsGrid}>
                    {/* 리뷰 태그 분석 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>📊 칭찬 태그 TOP 5</h3>
                      <div className={styles.analyticsBarChart}>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>친절하고 상세한 설명</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '85%' }}></div>
                          </div>
                          <span className={styles.barValue}>1,245</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>빠른 응답</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '72%' }}></div>
                          </div>
                          <span className={styles.barValue}>1,056</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>전문적인 조언</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '65%' }}></div>
                          </div>
                          <span className={styles.barValue}>952</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>정확한 정보 제공</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '58%' }}></div>
                          </div>
                          <span className={styles.barValue}>847</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>협상 도움</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '45%' }}></div>
                          </div>
                          <span className={styles.barValue}>658</span>
                        </div>
                      </div>
                    </div>

                    {/* 아쉬움 태그 분석 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>📉 아쉬움 태그 TOP 5</h3>
                      <div className={styles.analyticsBarChart}>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>응답이 느림</span>
                          <div className={styles.barContainer}>
                            <div className={`${styles.bar} ${styles.barNegative}`} style={{ width: '78%' }}></div>
                          </div>
                          <span className={styles.barValue}>423</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>정보 부족</span>
                          <div className={styles.barContainer}>
                            <div className={`${styles.bar} ${styles.barNegative}`} style={{ width: '62%' }}></div>
                          </div>
                          <span className={styles.barValue}>336</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>친절하지 않음</span>
                          <div className={styles.barContainer}>
                            <div className={`${styles.bar} ${styles.barNegative}`} style={{ width: '45%' }}></div>
                          </div>
                          <span className={styles.barValue}>244</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>예약 후 태도 변화</span>
                          <div className={styles.barContainer}>
                            <div className={`${styles.bar} ${styles.barNegative}`} style={{ width: '38%' }}></div>
                          </div>
                          <span className={styles.barValue}>206</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>매물 설명 부족</span>
                          <div className={styles.barContainer}>
                            <div className={`${styles.bar} ${styles.barNegative}`} style={{ width: '32%' }}></div>
                          </div>
                          <span className={styles.barValue}>173</span>
                        </div>
                      </div>
                    </div>

                    {/* 거래 유형 분석 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>🏠 거래 유형 분포</h3>
                      <div className={styles.analyticsPieChart}>
                        <div className={styles.pieChartVisual}>
                          <div className={styles.pieSlice} style={{ background: 'conic-gradient(#7c3aed 0% 65%, #f59e0b 65% 100%)' }}></div>
                        </div>
                        <div className={styles.pieChartLegend}>
                          <div className={styles.legendItem}>
                            <span className={styles.legendDot} style={{ backgroundColor: '#7c3aed' }}></span>
                            <span className={styles.legendLabel}>전월세</span>
                            <span className={styles.legendValue}>65% (3,690건)</span>
                          </div>
                          <div className={styles.legendItem}>
                            <span className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }}></span>
                            <span className={styles.legendLabel}>매매</span>
                            <span className={styles.legendValue}>35% (1,988건)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 사용자 등급 분포 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>🎖️ 사용자 등급 분포</h3>
                      <div className={styles.analyticsBarChart}>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>임장까비 (신규)</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '55%', backgroundColor: '#94a3b8' }}></div>
                          </div>
                          <span className={styles.barValue}>679명</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>인주까비 (1~3건)</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '28%', backgroundColor: '#60a5fa' }}></div>
                          </div>
                          <span className={styles.barValue}>345명</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>명당까비 (4~9건)</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '12%', backgroundColor: '#a78bfa' }}></div>
                          </div>
                          <span className={styles.barValue}>148명</span>
                        </div>
                        <div className={styles.analyticsBarItem}>
                          <span className={styles.barLabel}>갓까비 (10건+)</span>
                          <div className={styles.barContainer}>
                            <div className={styles.bar} style={{ width: '5%', backgroundColor: '#f59e0b' }}></div>
                          </div>
                          <span className={styles.barValue}>62명</span>
                        </div>
                      </div>
                    </div>

                    {/* 상세 평가 평균 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>⭐ 상세 평가 평균</h3>
                      <div className={styles.analyticsRatingList}>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>수수료 만족도</span>
                          <div className={styles.ratingStars}>★★★★☆</div>
                          <span className={styles.ratingValue}>4.1</span>
                        </div>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>전문성/지식</span>
                          <div className={styles.ratingStars}>★★★★☆</div>
                          <span className={styles.ratingValue}>4.3</span>
                        </div>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>친절도</span>
                          <div className={styles.ratingStars}>★★★★☆</div>
                          <span className={styles.ratingValue}>4.2</span>
                        </div>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>소통/응대</span>
                          <div className={styles.ratingStars}>★★★★☆</div>
                          <span className={styles.ratingValue}>4.0</span>
                        </div>
                      </div>
                    </div>

                    {/* 월별 리뷰 추이 */}
                    <div className={styles.analyticsPanel}>
                      <h3 className={styles.analyticsPanelTitle}>📈 월별 리뷰 추이</h3>
                      <div className={styles.monthlyTrend}>
                        <div className={styles.trendRow}>
                          <span className={styles.trendMonth}>2025.01</span>
                          <div className={styles.trendBarWrap}>
                            <div className={styles.trendBar} style={{ width: '100%' }}></div>
                          </div>
                          <span className={styles.trendValue}>542</span>
                        </div>
                        <div className={styles.trendRow}>
                          <span className={styles.trendMonth}>2024.12</span>
                          <div className={styles.trendBarWrap}>
                            <div className={styles.trendBar} style={{ width: '89%' }}></div>
                          </div>
                          <span className={styles.trendValue}>482</span>
                        </div>
                        <div className={styles.trendRow}>
                          <span className={styles.trendMonth}>2024.11</span>
                          <div className={styles.trendBarWrap}>
                            <div className={styles.trendBar} style={{ width: '76%' }}></div>
                          </div>
                          <span className={styles.trendValue}>412</span>
                        </div>
                        <div className={styles.trendRow}>
                          <span className={styles.trendMonth}>2024.10</span>
                          <div className={styles.trendBarWrap}>
                            <div className={styles.trendBar} style={{ width: '82%' }}></div>
                          </div>
                          <span className={styles.trendValue}>445</span>
                        </div>
                        <div className={styles.trendRow}>
                          <span className={styles.trendMonth}>2024.09</span>
                          <div className={styles.trendBarWrap}>
                            <div className={styles.trendBar} style={{ width: '68%' }}></div>
                          </div>
                          <span className={styles.trendValue}>369</span>
                        </div>
                      </div>
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
    </>
  )
}

