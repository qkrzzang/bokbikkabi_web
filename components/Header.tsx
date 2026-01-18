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
  const [user, setUser] = useState<any>(null)
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

  useEffect(() => {
    // 세션이 있을 때만 사용자 정보 확인
    const checkUser = async () => {
      try {
        // 먼저 세션 확인
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // 세션이 있으면 사용자 정보 설정
          setUser(session.user)
        } else {
          // 세션이 없으면 사용자 정보 초기화
          setUser(null)
        }
      } catch (error) {
        console.error('사용자 확인 오류:', error)
        setUser(null)
      }
    }
    
    // 초기 사용자 확인 (세션이 있을 때만)
    checkUser()
    
    // 인증 상태 변경 감지 (로그인/로그아웃 시 자동 업데이트)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // 로그인 시 사용자 정보 설정
        setUser(session.user)
        
        // users 테이블에 Upsert (로그인 시 자동 동기화)
        try {
          const { upsertUserToUsersTable } = await import('@/lib/auth-check')
          await upsertUserToUsersTable(session.user)
        } catch (error) {
          console.error('Header: 사용자 Upsert 오류 (무시됨):', error)
        }
      } else {
        // 로그아웃 시 사용자 정보 초기화
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
    </>
  )
}

