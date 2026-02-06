'use client'

import { useState, useEffect } from 'react'
import styles from './AdModal.module.css'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/lib/api/interceptor'

interface AdModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function AdModal({ isOpen, onClose, onComplete }: AdModalProps) {
  const { user: authUser } = useAuth()
  const [countdown, setCountdown] = useState(30) // 30초 광고
  const [canClose, setCanClose] = useState(false)
  const [isWatched, setIsWatched] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      // 모달이 닫힐 때 초기화
      setCountdown(30)
      setCanClose(false)
      setIsWatched(false)
      return
    }

    // 카운트다운 시작
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
  }, [isOpen])

  const handleClose = async () => {
    if (!canClose) {
      alert('광고를 끝까지 시청해주세요!')
      return
    }

    if (isWatched) {
      // 포인트 적립
      await awardAdPoints()
      onComplete()
    }
    onClose()
  }

  const awardAdPoints = async () => {
    if (!authUser) {
      console.log('로그인이 필요합니다.')
      return
    }

    try {
      // 오늘 이미 광고 시청 포인트를 받았는지 확인
      const today = new Date().toISOString().split('T')[0]
      const { data: existingTransactions } = await apiRequest<any[]>(
        () => supabase
          .from('point_transactions')
          .select('id')
          .eq('supabase_user_id', authUser.id)
          .eq('transaction_type', 'AD_VIEW')
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`)
          .limit(1),
        { requireAuth: true }
      )

      if (existingTransactions && existingTransactions.length > 0) {
        alert('오늘은 이미 광고 시청 포인트를 받았습니다!')
        return
      }

      // 포인트 정책 조회
      const todayYmd = today.replace(/-/g, '')
      const { data: policyData } = await apiRequest<{ code_name: string }>(
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
      )

      const points = policyData ? parseInt(policyData.code_name) : 10

      // 포인트 적립 함수 호출
      const { data, error } = await apiRequest<any>(
        () => supabase.rpc('award_points', {
          p_user_id: authUser.id,
          p_transaction_type: 'AD_VIEW',
          p_description: '광고 시청 완료'
        }),
        { requireAuth: true }
      )

      if (error) {
        console.error('광고 포인트 적립 오류:', error)
        alert('포인트 적립에 실패했습니다.')
      } else {
        alert(`광고 시청 완료! ${points}P가 적립되었습니다! 🎉`)
      }
    } catch (error) {
      console.error('광고 포인트 적립 예외:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>📺 광고 시청하기</h2>
          {canClose && (
            <button className={styles.closeButton} onClick={handleClose}>
              ✕
            </button>
          )}
        </div>

        <div className={styles.body}>
          {/* 광고 영역 */}
          <div className={styles.adContainer}>
            <div className={styles.adContent}>
              <div className={styles.adIcon}>🎬</div>
              <h3 className={styles.adTitle}>복비까비 광고</h3>
              <p className={styles.adDescription}>
                광고를 시청하고 포인트를 받아보세요!
                <br />
                포인트로 다양한 혜택을 누리실 수 있습니다.
              </p>
              
              {/* 실제 광고 영역 (나중에 구글 애드센스 등으로 대체) */}
              <div className={styles.adPlaceholder}>
                <p className={styles.adPlaceholderText}>
                  [ 광고 영역 ]
                  <br />
                  <br />
                  여기에 실제 광고가 표시됩니다.
                  <br />
                  구글 애드센스, 카카오 애드핏 등<br />
                  다양한 광고 플랫폼을 연동할 수 있습니다.
                </p>
              </div>

              {/* 카운트다운 */}
              <div className={styles.countdown}>
                {canClose ? (
                  <div className={styles.completeMessage}>
                    <span className={styles.completeIcon}>✅</span>
                    <span className={styles.completeText}>시청 완료! 닫기 버튼을 눌러주세요.</span>
                  </div>
                ) : (
                  <div className={styles.countdownMessage}>
                    <span className={styles.countdownIcon}>⏱️</span>
                    <span className={styles.countdownText}>
                      광고 종료까지 <strong>{countdown}초</strong> 남았습니다
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className={styles.notice}>
            <p className={styles.noticeText}>
              💡 광고를 끝까지 시청하면 <strong>10P</strong>가 적립됩니다!
            </p>
            <p className={styles.noticeSubText}>
              (하루 1회 적립 가능)
            </p>
          </div>
        </div>

        {canClose && (
          <div className={styles.footer}>
            <button className={styles.confirmButton} onClick={handleClose}>
              닫기 (10P 받기)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

