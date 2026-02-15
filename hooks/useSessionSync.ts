'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/**
 * 동기화 최소 간격 (ms)
 * 탭 전환을 빠르게 반복해도 2초에 1회만 서버 검증을 수행합니다.
 */
const SYNC_DEBOUNCE_MS = 2_000

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface UseSessionSyncParams {
  /** AuthContext가 관리하는 현재 세션 (메모리 상태) */
  session: Session | null

  /** 서버 검증 후 유효한 세션이 확인되었을 때 호출 */
  onSessionRefreshed: (freshSession: Session) => void

  /** 세션이 만료되었거나 무효할 때 호출 */
  onSessionExpired: () => void
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * useSessionSync
 *
 * @supabase/ssr의 createBrowserClient는 세션을 메모리에 캐싱합니다.
 * 다른 탭의 미들웨어가 쿠키를 갱신해도, 현재 탭의 싱글톤은
 * 메모리의 만료된 Access Token을 계속 사용합니다.
 *
 * 이 훅은 다음 시점에 서버 검증(getUser)을 강제 수행하여
 * 메모리 세션과 실제 쿠키/서버 상태를 동기화합니다:
 *
 * 1. Page Visibility API (visibilitychange)
 *    - 데스크톱: 다른 탭 → 우리 탭 복귀
 *    - 모바일/PWA: 다른 앱 → 우리 앱 foreground 복귀
 *    - 표준 API이므로 모든 환경에서 안정적으로 동작
 *
 * 2. pageshow 이벤트 (bfcache 복원)
 *    - iOS Safari의 back-forward cache에서 복원될 때
 *    - event.persisted = true인 경우에만 동기화
 *
 * 동기화 흐름:
 *   탭 활성화 → getUser() (서버 JWT 검증)
 *     → 토큰 만료 시 SDK가 내부적으로 refreshSession() 실행
 *     → 성공: onSessionRefreshed() + router.refresh()
 *     → 실패: onSessionExpired() + router.refresh()
 */
export function useSessionSync({
  session,
  onSessionRefreshed,
  onSessionExpired,
}: UseSessionSyncParams) {
  const router = useRouter()

  // ── Refs ──
  // 콜백이 최신 session을 참조할 수 있도록 ref로 관리
  const sessionRef = useRef(session)
  const lastSyncRef = useRef(0)
  const isSyncingRef = useRef(false)

  // session prop이 변경될 때마다 ref 업데이트
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // ── Core: 세션 동기화 ──
  const syncSession = useCallback(async () => {
    // ── 디바운스: 최근 동기화로부터 충분한 시간이 지나지 않았으면 스킵
    const now = Date.now()
    if (now - lastSyncRef.current < SYNC_DEBOUNCE_MS) return

    // ── 동시 실행 방지 (mutex)
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    lastSyncRef.current = now

    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 1: 서버에 JWT 검증 요청
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //
      // getUser()는 Supabase Auth 서버에 HTTP 요청을 보내
      // 현재 Access Token의 유효성을 검증합니다.
      //
      // Access Token이 만료된 경우:
      // - SDK가 내부적으로 쿠키의 Refresh Token을 사용해 갱신 시도
      // - 성공 시: 새 토큰이 메모리 + 쿠키에 반영, user 반환
      // - 실패 시: Refresh Token도 만료됨, null 반환
      //
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        // ── 세션 만료: 이전에 로그인 상태였다면 만료 알림
        if (sessionRef.current) {
          console.warn('[SessionSync] 세션 만료 감지 → 상태 정리')
          onSessionExpired()
          // 서버 컴포넌트도 인증 없는 상태로 재렌더링
          router.refresh()
        }
        return
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 2: 갱신된 세션 가져오기
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //
      // getUser() 성공 후 getSession()을 호출하면
      // SDK가 방금 갱신한 최신 세션(토큰)을 반환합니다.
      //
      const {
        data: { session: freshSession },
      } = await supabase.auth.getSession()

      if (!freshSession) {
        // 극히 드문 케이스: user는 있는데 session은 없음
        if (sessionRef.current) {
          onSessionExpired()
          router.refresh()
        }
        return
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 3: 토큰 변경 감지 + React/Next.js 캐시 무효화
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //
      // 메모리의 access_token과 서버에서 받은 access_token이 다르면
      // 토큰이 갱신된 것입니다. 이 경우:
      //
      // 1. onSessionRefreshed: React 상태(AuthContext) 업데이트
      // 2. router.refresh(): Next.js 클라이언트 Router Cache 무효화
      //    → 서버 컴포넌트가 새 세션으로 재렌더링
      //    → 사이드바, 관리자 화면 등이 새 토큰으로 데이터 조회
      //
      const tokenChanged =
        sessionRef.current?.access_token !== freshSession.access_token

      // React 상태는 항상 최신으로 동기화
      onSessionRefreshed(freshSession)

      // 토큰이 실제로 변경되었을 때만 서버 캐시 무효화 (불필요한 리렌더 방지)
      if (tokenChanged) {
        console.log('[SessionSync] 토큰 갱신 감지 → router.refresh()')
        router.refresh()
      }
    } catch {
      // ── 네트워크 에러 ──
      // 일시적인 문제일 수 있으므로 무시합니다.
      // 다음 탭 전환이나 API 요청 시 interceptor가 처리합니다.
    } finally {
      isSyncingRef.current = false
    }
  }, [router, onSessionRefreshed, onSessionExpired])

  // ── 이벤트 리스너 등록 ──
  useEffect(() => {
    // ────────────────────────────────────
    // 1. Page Visibility API (메인)
    // ────────────────────────────────────
    // 표준 API: 데스크톱/모바일/PWA 모두에서 안정적 동작
    //
    // - 데스크톱: 다른 탭 → 우리 탭
    // - 모바일 Chrome/Safari: 다른 앱 → 우리 브라우저
    // - PWA (standalone): 다른 앱 → 우리 PWA
    // - 모바일 화면 잠금 해제 후 복귀
    //
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSession()
      }
    }

    // ────────────────────────────────────
    // 2. pageshow 이벤트 (iOS Safari bfcache)
    // ────────────────────────────────────
    // iOS Safari는 뒤로가기 시 bfcache에서 페이지를 복원합니다.
    // 이때 visibilitychange가 발생하지 않을 수 있으므로
    // pageshow + event.persisted로 보완합니다.
    //
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        syncSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [syncSession])
}
