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
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])

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
                  <h4 className={styles.profileName}>
                    {user.user_metadata?.name || 
                     user.user_metadata?.kakao_account?.profile?.nickname || 
                     user.user_metadata?.properties?.nickname ||
                     user.user_metadata?.nickname || 
                     '사용자'}
                  </h4>
                  <p className={styles.profileEmail}>
                    {user.email || user.user_metadata?.kakao_account?.email || ''}
                  </p>
                </div>
              </div>
              <div className={styles.profileActions}>
                <button className={styles.profileActionButton}>
                  내 리뷰 보기
                </button>
                <button className={styles.profileActionButton}>
                  내 관심 부동산
                </button>
                <button
                  className={styles.logoutButton}
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

