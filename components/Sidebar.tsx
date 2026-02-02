'use client'

import { useState } from 'react'
import styles from './Sidebar.module.css'
import { supabase } from '@/lib/supabase/client'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  user: any
  isAdmin: boolean
  onMyContractsClick: () => void
  onFavoritesClick: () => void
  onPartnershipClick: () => void
  onPolicyClick: () => void
  onGradeInfoClick: () => void
  onSettingsClick: () => void
  onAdminClick: () => void
  onLogout: () => void
}

export default function Sidebar({
  isOpen,
  onClose,
  user,
  isAdmin,
  onMyContractsClick,
  onFavoritesClick,
  onPartnershipClick,
  onPolicyClick,
  onGradeInfoClick,
  onSettingsClick,
  onAdminClick,
  onLogout,
}: SidebarProps) {
  if (!isOpen || !user) return null

  return (
    <>
      {/* 오버레이 */}
      <div className={styles.overlay} onClick={onClose} />
      
      {/* 사이드바 */}
      <div className={styles.sidebar}>
        {/* 프로필 정보 - 최상단 */}
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
            <div className={styles.gradeBadge}>
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
        </div>

        {/* 메뉴 리스트 */}
        <nav className={styles.navList}>
          <button 
            className={styles.navItem} 
            onClick={(e) => {
              e.stopPropagation()
              onMyContractsClick()
            }}
          >
            <span className={styles.navIcon}>📄</span>
            <span className={styles.navLabel}>내 계약서 보기</span>
            <span className={styles.chevron}>›</span>
          </button>

          <button 
            className={styles.navItem} 
            onClick={(e) => {
              e.stopPropagation()
              onFavoritesClick()
            }}
          >
            <span className={styles.navIcon}>❤️</span>
            <span className={styles.navLabel}>내 관심 부동산</span>
            <span className={styles.chevron}>›</span>
          </button>

          <button 
            className={styles.navItem} 
            onClick={(e) => {
              e.stopPropagation()
              onSettingsClick()
            }}
          >
            <span className={styles.navIcon}>⚙️</span>
            <span className={styles.navLabel}>설정</span>
            <span className={styles.chevron}>›</span>
          </button>

          <button 
            className={styles.navItem} 
            onClick={(e) => {
              e.stopPropagation()
              onPartnershipClick()
            }}
          >
            <span className={styles.navIcon}>🤝</span>
            <span className={styles.navLabel}>광고/제휴 문의</span>
            <span className={styles.chevron}>›</span>
          </button>

          <button 
            className={styles.navItem} 
            onClick={(e) => {
              e.stopPropagation()
              onPolicyClick()
            }}
          >
            <span className={styles.navIcon}>📋</span>
            <span className={styles.navLabel}>약관/정책</span>
            <span className={styles.chevron}>›</span>
          </button>

          {/* 관리자 메뉴 - 관리자만 표시 */}
          {isAdmin && (
            <button 
              className={`${styles.navItem} ${styles.adminNavItem}`} 
              onClick={(e) => {
                e.stopPropagation()
                onAdminClick()
              }}
            >
              <span className={styles.navIcon}>⚙️</span>
              <span className={styles.navLabel}>관리자 메뉴</span>
              <span className={styles.chevron}>›</span>
            </button>
          )}
        </nav>

        {/* 로그아웃 */}
        <div className={styles.sidebarFooter}>
          <button 
            className={styles.logoutButton} 
            onClick={(e) => {
              e.stopPropagation()
              onLogout()
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </>
  )
}

