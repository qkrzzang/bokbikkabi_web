'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Sidebar.module.css'
import { supabase } from '@/lib/supabase/client'

type ScreenType = 'menu' | 'contracts' | 'favorites' | 'settings' | 'partnership' | 'policy' | 'admin'

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
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('menu')
  const [myContracts, setMyContracts] = useState<any[]>([])
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  
  // 사이드바가 닫힐 때 메뉴로 리셋
  useEffect(() => {
    if (!isOpen) {
      setCurrentScreen('menu')
      setSelectedContract(null)
      setDecryptedImageUrl(null)
    }
  }, [isOpen])
  
  if (!isOpen || !user) return null

  // 내 리뷰 불러오기
  const loadMyContracts = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('agent_reviews')
      .select(`
        *,
        agent:agent_master(agent_name, road_address, lot_address)
      `)
      .eq('supabase_user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setMyContracts(data)
    }
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
             currentScreen === 'settings' ? '설정' :
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
              <div className={styles.gradeBadge} style={{ margin: 0 }}>
                <span>갓까비</span>
                <button
                  className={styles.gradeInfoButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    onGradeInfoClick()
                  }}
                  aria-label="등급 안내"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 10V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <p className={styles.profileEmail}>
              {user.email || user.user_metadata?.kakao_account?.email || ''}
            </p>
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
                onClick={() => setCurrentScreen('favorites')}
              >
                <span className={styles.navIcon}>❤️</span>
                <span className={styles.navLabel}>내 관심 부동산</span>
                <span className={styles.chevron}>›</span>
              </button>

              <button 
                className={styles.navItem} 
                onClick={() => setCurrentScreen('settings')}
              >
                <span className={styles.navIcon}>⚙️</span>
                <span className={styles.navLabel}>설정</span>
                <span className={styles.chevron}>›</span>
              </button>

              <button 
                className={styles.navItem} 
                onClick={() => setCurrentScreen('partnership')}
              >
                <span className={styles.navIcon}>🤝</span>
                <span className={styles.navLabel}>광고/제휴 문의</span>
                <span className={styles.chevron}>›</span>
              </button>

              <button 
                className={styles.navItem} 
                onClick={() => {
                  router.push('/terms')
                  onClose()
                }}
              >
                <span className={styles.navIcon}>📋</span>
                <span className={styles.navLabel}>약관/정책</span>
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
                <h4>리뷰</h4>
                <p>{selectedContract.review_text || '리뷰 내용 없음'}</p>
              </div>
            </div>
          )}

          {/* 내 관심 부동산 화면 */}
          {currentScreen === 'favorites' && (
            <div className={styles.screenContent}>
              <div className={styles.emptyState}>준비 중입니다.</div>
            </div>
          )}

          {/* 설정 화면 */}
          {currentScreen === 'settings' && (
            <div className={styles.screenContent}>
              <div className={styles.settingsList}>
                <button className={styles.settingItem}>알림 설정</button>
                <button className={styles.settingItem}>서비스 설정</button>
              </div>
            </div>
          )}

          {/* 광고/제휴 문의 화면 */}
          {currentScreen === 'partnership' && (
            <div className={styles.screenContent}>
              <form className={styles.partnershipForm} onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) {
                    alert('로그인이 필요합니다.')
                    return
                  }

                  const { error } = await supabase
                    .from('partnership_inquiries')
                    .insert({
                      supabase_user_id: session.user.id,
                      user_email: formData.get('email'),
                      user_name: formData.get('name'),
                      company_name: formData.get('company'),
                      contact_phone: formData.get('phone'),
                      inquiry_type: formData.get('type'),
                      title: formData.get('title'),
                      content: formData.get('content'),
                    })

                  if (error) throw error

                  alert('문의가 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.')
                  e.currentTarget.reset()
                  setCurrentScreen('menu')
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
    </>
  )
}

