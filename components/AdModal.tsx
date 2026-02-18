'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './AdModal.module.css'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useAlert } from '@/contexts/AlertContext'
import { apiRequest } from '@/lib/api/interceptor'

interface AdModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

function getKoreaToday() {
  const now = new Date()
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const todayKorea = koreaTime.toISOString().split('T')[0]
  return {
    todayKorea,
    todayYmd: todayKorea.replace(/-/g, ''),
    startOfDay: new Date(`${todayKorea}T00:00:00+09:00`).toISOString(),
    endOfDay: new Date(`${todayKorea}T23:59:59+09:00`).toISOString(),
  }
}

export default function AdModal({ isOpen, onClose, onComplete }: AdModalProps) {
  const { user: authUser } = useAuth()
  const { showAlert, showSuccess, showError, showWarning } = useAlert()
  const [countdown, setCountdown] = useState(30)
  const [canClose, setCanClose] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [dailyLimit, setDailyLimit] = useState(3)
  const [todayCount, setTodayCount] = useState(0)
  const [pointsPerView, setPointsPerView] = useState(10)
  const [isLoading, setIsLoading] = useState(true)
  const [isLimitReached, setIsLimitReached] = useState(false)

  const loadAdConfig = useCallback(async () => {
    if (!authUser) return
    setIsLoading(true)

    try {
      const { todayYmd, startOfDay, endOfDay } = getKoreaToday()

      const [limitResult, policyResult, countResult] = await Promise.all([
        apiRequest<{ code_name: string }>(
          () => supabase
            .from('common_code_detail')
            .select('code_name')
            .eq('code_group', 'SYSTEM_CONFIG')
            .eq('code_value', 'AD_VIEW_DAILY_LIMIT')
            .eq('use_yn', 'Y')
            .lte('sta_ymd', todayYmd)
            .gte('end_ymd', todayYmd)
            .maybeSingle(),
          { requireAuth: false }
        ),
        apiRequest<{ code_name: string }>(
          () => supabase
            .from('common_code_detail')
            .select('code_name')
            .eq('code_group', 'POINT_POLICY')
            .eq('code_value', 'AD_VIEW')
            .eq('use_yn', 'Y')
            .lte('sta_ymd', todayYmd)
            .gte('end_ymd', todayYmd)
            .maybeSingle(),
          { requireAuth: false }
        ),
        apiRequest<any[]>(
          () => supabase
            .from('point_transactions')
            .select('id')
            .eq('supabase_user_id', authUser.id)
            .eq('transaction_type', 'AD_VIEW')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay),
          { requireAuth: true }
        ),
      ])

      const limit = limitResult.data ? parseInt(limitResult.data.code_name) || 3 : 3
      const points = policyResult.data ? parseInt(policyResult.data.code_name) || 10 : 10
      const count = countResult.data?.length ?? 0

      setDailyLimit(limit)
      setPointsPerView(points)
      setTodayCount(count)
      setIsLimitReached(count >= limit)
    } catch {
      setDailyLimit(3)
      setPointsPerView(10)
    } finally {
      setIsLoading(false)
    }
  }, [authUser])

  useEffect(() => {
    if (!isOpen) {
      setCountdown(30)
      setCanClose(false)
      setIsWatched(false)
      return
    }
    loadAdConfig()
  }, [isOpen, loadAdConfig])

  useEffect(() => {
    if (!isOpen || isLimitReached || isLoading) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setCanClose(true)
          setIsWatched(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, isLimitReached, isLoading])

  const handleClose = async () => {
    if (isLimitReached) {
      onClose()
      return
    }
    if (!canClose) {
      showWarning('광고를 끝까지 시청해주세요!')
      return
    }
    if (isWatched) {
      await awardAdPoints()
      onComplete()
    }
    onClose()
  }

  const awardAdPoints = async () => {
    if (!authUser) return

    try {
      const { startOfDay, endOfDay } = getKoreaToday()

      const { data: existingTransactions } = await apiRequest<any[]>(
        () => supabase
          .from('point_transactions')
          .select('id')
          .eq('supabase_user_id', authUser.id)
          .eq('transaction_type', 'AD_VIEW')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        { requireAuth: true }
      )

      if (existingTransactions && existingTransactions.length >= dailyLimit) {
        showAlert(`오늘의 광고 시청 횟수(${dailyLimit}회)를 모두 사용했습니다!`)
        return
      }

      const { error } = await apiRequest<any>(
        () => supabase.rpc('award_points', {
          p_user_id: authUser.id,
          p_transaction_type: 'AD_VIEW',
          p_description: '광고 시청 완료'
        }),
        { requireAuth: true }
      )

      if (error) {
        showError('포인트 적립에 실패했습니다.')
      } else {
        const remaining = dailyLimit - (todayCount + 1)
        showSuccess(`광고 시청 완료! ${pointsPerView}P 적립! (오늘 남은 횟수: ${Math.max(remaining, 0)}회)`)
      }
    } catch {
      showError('포인트 적립 중 오류가 발생했습니다.')
    }
  }

  if (!isOpen) return null

  const remaining = dailyLimit - todayCount

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>광고 시청하기</h2>
          {(canClose || isLimitReached) && (
            <button className={styles.closeButton} onClick={handleClose}>
              ✕
            </button>
          )}
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>광고 준비 중...</p>
            </div>
          ) : isLimitReached ? (
            <div className={styles.limitReachedContainer}>
              <div className={styles.limitIcon}>🚫</div>
              <h3 className={styles.limitTitle}>오늘의 광고 시청 완료</h3>
              <p className={styles.limitDescription}>
                오늘 {dailyLimit}회 광고를 모두 시청했습니다.
                <br />
                내일 다시 시청하고 포인트를 받아보세요!
              </p>
              <div className={styles.limitInfo}>
                <span>오늘 적립: <strong>{todayCount * pointsPerView}P</strong></span>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.statusBar}>
                <span className={styles.statusLabel}>오늘 시청</span>
                <div className={styles.statusDots}>
                  {Array.from({ length: dailyLimit }).map((_, i) => (
                    <span
                      key={i}
                      className={`${styles.statusDot} ${i < todayCount ? styles.statusDotUsed : styles.statusDotAvailable}`}
                    />
                  ))}
                </div>
                <span className={styles.statusCount}>{remaining}회 남음</span>
              </div>

              {/* 광고 영역 - 구글 애드센스 리워드 광고 슬롯 */}
              <div className={styles.adContainer}>
                <div className={styles.adContent}>
                  <div id="ad-reward-slot" className={styles.adSlot}>
                    <div className={styles.adPlaceholder}>
                      <p className={styles.adPlaceholderText}>
                        광고 준비 중입니다
                        <br />
                        <span className={styles.adPlaceholderSub}>Google AdSense 심사 통과 후 실제 광고가 표시됩니다</span>
                      </p>
                    </div>
                  </div>

                  <div className={styles.countdown}>
                    {canClose ? (
                      <div className={styles.completeMessage}>
                        <span className={styles.completeIcon}>✅</span>
                        <span className={styles.completeText}>시청 완료!</span>
                      </div>
                    ) : (
                      <div className={styles.countdownMessage}>
                        <div className={styles.progressBarContainer}>
                          <div
                            className={styles.progressBar}
                            style={{ width: `${((30 - countdown) / 30) * 100}%` }}
                          />
                        </div>
                        <span className={styles.countdownText}>
                          <strong>{countdown}</strong>초 남음
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.notice}>
                <p className={styles.noticeText}>
                  광고를 끝까지 시청하면 <strong>{pointsPerView}P</strong> 적립!
                </p>
                <p className={styles.noticeSubText}>
                  (하루 최대 {dailyLimit}회, {dailyLimit * pointsPerView}P 적립 가능)
                </p>
              </div>
            </>
          )}
        </div>

        {canClose && !isLimitReached && (
          <div className={styles.footer}>
            <button className={styles.confirmButton} onClick={handleClose}>
              {pointsPerView}P 받기
            </button>
          </div>
        )}
        {isLimitReached && (
          <div className={styles.footer}>
            <button className={styles.confirmButton} onClick={handleClose}>
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
