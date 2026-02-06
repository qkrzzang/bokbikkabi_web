/**
 * Header.tsx 개선 예시
 * 
 * 주요 변경사항:
 * 1. useAuth() Hook으로 중앙화된 인증 상태 사용
 * 2. 중복된 getSession() 호출 제거
 * 3. onAuthStateChange 구독 제거 (AuthContext에서 처리)
 * 4. apiRequest()로 일관된 에러 처리
 */

'use client'

import { useState, useEffect } from 'react'
import styles from './Header.module.css'
import { signInWithKakao, signInWithGoogle, signOut as authSignOut } from '@/lib/auth'
import { logAccess } from '@/lib/accessLog'
import { useAuth } from '@/contexts/AuthContext'  // ✅ 추가
import { apiRequest } from '@/lib/api/interceptor'  // ✅ 추가
import { supabase } from '@/lib/supabase/client'
import Sidebar from './Sidebar'

export default function Header() {
  // ===== 인증 관련 상태 (개선 후) =====
  const { user, userType, isLoading, signOut } = useAuth()  // ✅ 중앙화된 상태 사용
  
  // ❌ 제거: const [user, setUser] = useState<User | null>(null)
  // ❌ 제거: const [userType, setUserType] = useState<string | null>(null)
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // ... 기타 상태들 ...

  // ❌ 제거: useEffect에서 getSession() 및 onAuthStateChange 구독
  // AuthContext에서 처리하므로 불필요
  
  // ===== 로그아웃 (개선 후) =====
  const handleSignOut = async () => {
    try {
      await signOut()  // ✅ AuthContext의 signOut 사용
      alert('로그아웃되었습니다.')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃에 실패했습니다.')
    }
  }

  // ===== 내 계약서 불러오기 (개선 후) =====
  const loadMyContracts = async () => {
    // ✅ apiRequest로 인증 체크 및 에러 처리 자동화
    const { data, error } = await apiRequest(
      () => supabase
        .from('agent_reviews')
        .select(`
          *,
          agent:agent_master(agent_name, road_address, lot_address)
        `)
        .eq('supabase_user_id', user!.id)  // user는 AuthContext에서 확인됨
        .order('created_at', { ascending: false }),
      {
        requireAuth: true,
        showErrorAlert: true,
      }
    )

    if (data) {
      setMyContracts(data)
      setIsMyContractsModalOpen(true)
    }
  }

  // ===== 사용자 타입 확인 (개선 후) =====
  const isAdmin = userType === 'ADMIN'  // ✅ 간단하게 체크

  // ===== 접속 로그 (개선 후) =====
  useEffect(() => {
    if (user) {
      logAccess(user.id, 'PAGE_VIEW', window.location.pathname)
    }
  }, [user])  // ✅ user 변경 시에만 실행

  // ===== 로딩 중일 때 =====
  if (isLoading) {
    return (
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.logo}>복비까비</div>
          <div className={styles.authButtons}>
            <span>로딩 중...</span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* 로고 */}
        <div className={styles.logo}>복비까비</div>

        {/* 우측 버튼 그룹 */}
        <div className={styles.rightButtons}>
          {/* 리뷰 작성 버튼 (로그인 시만 표시) */}
          {user && (
            <button 
              className={styles.reviewButton}
              onClick={() => {
                // CameraButton 이벤트 발생
                window.dispatchEvent(new Event('start-review'))
              }}
            >
              ✏️ 리뷰 작성
            </button>
          )}

          {/* 햄버거 메뉴 */}
          <button 
            className={styles.menuButton}
            onClick={() => setIsSidebarOpen(true)}
          >
            ☰
          </button>
        </div>
      </div>

      {/* 사이드바 */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}  // ✅ AuthContext의 user 전달
      />

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsLoginModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeButton}
              onClick={() => setIsLoginModalOpen(false)}
            >
              ✕
            </button>
            
            <h2>로그인</h2>
            
            <button onClick={signInWithKakao}>
              카카오 로그인
            </button>
            
            <button onClick={signInWithGoogle}>
              구글 로그인
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

/**
 * 개선 효과:
 * 
 * 1. 코드 줄 수 감소
 *    - 인증 관련 useEffect 제거 (~50줄)
 *    - fetchUserType 함수 제거 (~30줄)
 *    - onAuthStateChange 구독 제거 (~30줄)
 *    총 ~110줄 감소
 * 
 * 2. 성능 개선
 *    - 중복 getSession() 호출 제거
 *    - 불필요한 리렌더링 방지
 * 
 * 3. 유지보수성 향상
 *    - 인증 로직이 AuthContext로 중앙화
 *    - 에러 처리가 일관됨
 * 
 * 4. 보안 강화
 *    - apiRequest로 자동 인증 체크
 *    - 일관된 에러 메시지
 */
