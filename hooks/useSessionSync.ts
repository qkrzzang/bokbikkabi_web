'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

/**
 * 탭 복귀 시 세션 동기화 훅
 *
 * 다른 탭에서 돌아왔을 때 세션이 아직 유효한지 확인하고,
 * 토큰이 갱신되었으면 React 상태를 업데이트합니다.
 *
 * 핵심 원칙: 가볍고 빠르게. DB 쿼리 없이 세션 검증만 수행.
 */

const MIN_INTERVAL_MS = 3_000 // 최소 3초 간격

interface UseSessionSyncParams {
  session: Session | null
  onSessionRefreshed: (freshSession: Session) => void
  onSessionExpired: () => void
}

export function useSessionSync({
  session,
  onSessionRefreshed,
  onSessionExpired,
}: UseSessionSyncParams) {
  const router = useRouter()
  const sessionRef = useRef(session)
  const lastSyncRef = useRef(0)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const syncSession = useCallback(async () => {
    // 디바운스
    const now = Date.now()
    if (now - lastSyncRef.current < MIN_INTERVAL_MS) return
    if (isSyncingRef.current) return

    isSyncingRef.current = true
    lastSyncRef.current = now

    try {
      // getUser()로 서버에 토큰 검증 요청
      // → 만료 시 SDK가 자동으로 refreshSession() 실행
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        // 세션 만료: 이전에 로그인 상태였다면 알림
        if (sessionRef.current) {
          onSessionExpired()
          router.refresh()
        }
        return
      }

      // 유저 확인됨 → 최신 세션 가져오기
      const {
        data: { session: freshSession },
      } = await supabase.auth.getSession()

      if (!freshSession) {
        if (sessionRef.current) {
          onSessionExpired()
          router.refresh()
        }
        return
      }

      // React 상태 동기화
      onSessionRefreshed(freshSession)

      // 토큰이 변경되었으면 서버 캐시 무효화
      if (sessionRef.current?.access_token !== freshSession.access_token) {
        router.refresh()
      }
    } catch {
      // 네트워크 에러 → 무시 (다음 시도에서 재검증)
    } finally {
      isSyncingRef.current = false
    }
  }, [router, onSessionRefreshed, onSessionExpired])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncSession()
      }
    }

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) syncSession()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [syncSession])
}
