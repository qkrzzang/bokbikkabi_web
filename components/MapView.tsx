'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import PropertyDetailModal from './PropertyDetailModal'
import styles from './MapView.module.css'
import { supabase } from '@/lib/supabase/client'

declare global {
  interface Window {
    naver: any
  }
}

interface Agent {
  id: number
  agent_name: string
  road_address: string | null
  lot_address: string | null
  latitude: number
  longitude: number
  distance?: number
  rating?: number
  reviewCount?: number
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const myMarkerRef = useRef<any>(null)

  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showSearchBtn, setShowSearchBtn] = useState(false)

  const [detailProperty, setDetailProperty] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchNearby = useCallback(async (lat: number, lng: number, r: number) => {
    setLoading(true)
    setShowSearchBtn(false)
    try {
      const res = await fetch(`/api/search-agents?mode=nearby&lat=${lat}&lng=${lng}&radius=${r}`)
      const json = await res.json()
      if (json.data) {
        const list: Agent[] = json.data.map((a: any) => ({
          ...a,
          rating: json.reviews?.[a.id] || 0,
          reviewCount: json.reviewCounts?.[a.id] || 0,
        }))
        setAgents(list)
      }
    } catch (err) {
      console.error('[MapView] 주변 중개사 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearchHere = useCallback(() => {
    const map = mapInstanceRef.current
    if (!map) return
    const center = map.getCenter()
    fetchNearby(center.lat(), center.lng(), 1)
  }, [fetchNearby])

  const initMap = useCallback((center: { lat: number; lng: number }, retries = 0) => {
    if (!mapRef.current || mapInstanceRef.current) return
    if (!window.naver?.maps) {
      if (retries < 20) {
        setTimeout(() => initMap(center, retries + 1), 300)
      }
      return
    }

    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(center.lat, center.lng),
      zoom: 17,
      zoomControl: true,
      zoomControlOptions: { position: window.naver.maps.Position.TOP_RIGHT },
    })
    mapInstanceRef.current = map

    window.naver.maps.Event.addListener(map, 'click', () => {
      setSelectedAgent(null)
    })

    window.naver.maps.Event.addListener(map, 'dragend', () => {
      setShowSearchBtn(true)
    })

    window.naver.maps.Event.addListener(map, 'zoom_changed', () => {
      setShowSearchBtn(true)
    })

    fetchNearby(center.lat, center.lng, 1)
  }, [fetchNearby])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('위치 서비스를 지원하지 않는 브라우저입니다.\n지도를 이동하여 검색해주세요.')
      initMap(DEFAULT_CENTER)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMyPos(loc)
        initMap(loc)
      },
      (err) => {
        console.error('[MapView] 위치 오류:', err)
        let msg = '위치 정보를 가져올 수 없습니다.\n지도를 이동 후 검색해주세요.'
        if (err.code === 1) {
          msg = '위치 권한이 거부되었습니다.\n브라우저 설정에서 위치 권한을 허용하거나,\n지도를 이동 후 검색해주세요.'
        } else if (err.code === 3) {
          msg = '위치 요청 시간이 초과되었습니다.\n지도를 이동 후 검색해주세요.'
        }
        setLocError(msg)
        initMap(DEFAULT_CENTER)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }, [initMap])

  useEffect(() => {
    if (!myPos || !mapInstanceRef.current) return

    if (!myMarkerRef.current) {
      myMarkerRef.current = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(myPos.lat, myPos.lng),
        map: mapInstanceRef.current,
        icon: {
          content: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          anchor: new window.naver.maps.Point(8, 8),
        },
        zIndex: 200,
      })
    }
  }, [myPos])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.naver?.maps) return

    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    agents.forEach(agent => {
      if (!agent.latitude || !agent.longitude) return

      const hasReview = (agent.reviewCount || 0) > 0
      const color = hasReview ? '#7c3aed' : '#64748b'
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(agent.latitude, agent.longitude),
        map,
        icon: {
          content: `<div style="display:flex;align-items:center;gap:4px;padding:5px 10px;background:${color};color:#fff;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;border:2px solid rgba(255,255,255,0.5)">
            <span>${agent.agent_name.length > 8 ? agent.agent_name.slice(0, 8) + '…' : agent.agent_name}</span>
            ${hasReview ? `<span style="background:rgba(255,255,255,0.3);padding:1px 6px;border-radius:10px;font-size:10px">★${agent.rating}</span>` : ''}
          </div>`,
          anchor: new window.naver.maps.Point(50, 14),
        },
        zIndex: hasReview ? 110 : 100,
      })

      window.naver.maps.Event.addListener(marker, 'click', () => {
        setSelectedAgent(agent)
        map.panTo(new window.naver.maps.LatLng(agent.latitude, agent.longitude))
      })

      markersRef.current.push(marker)
    })
  }, [agents])

  const handleMyLocation = useCallback(() => {
    if (!mapInstanceRef.current) return
    if (myPos) {
      mapInstanceRef.current.setCenter(new window.naver.maps.LatLng(myPos.lat, myPos.lng))
      mapInstanceRef.current.setZoom(17)
      return
    }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMyPos(loc)
        mapInstanceRef.current?.setCenter(new window.naver.maps.LatLng(loc.lat, loc.lng))
        mapInstanceRef.current?.setZoom(17)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }, [myPos])

  const formatDist = (m?: number) => {
    if (m == null) return ''
    return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`
  }

  const openAgentDetail = useCallback(async (agent: Agent) => {
    setDetailLoading(true)
    try {
      const { data: userGradeCodes } = await supabase
        .from('common_code_detail')
        .select('code_value, code_name')
        .eq('code_group', 'USER_GRADE')
        .eq('use_yn', 'Y')

      const gradeMap: Record<string, string> = {}
      userGradeCodes?.forEach((c: any) => { gradeMap[c.code_value] = c.code_name })

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('agent_reviews')
        .select('*, user:users!supabase_user_id(email, user_grade)')
        .eq('agent_id', agent.id)
        .or('is_hidden.is.null,is_hidden.eq.false')
        .order('created_at', { ascending: false })

      const hasReviews = !reviewsError && reviewsData && reviewsData.length > 0

      const evaluationCategories = [
        { key: 'fee_satisfaction', label: '수수료 만족도' },
        { key: 'expertise', label: '전문성/지식' },
        { key: 'kindness', label: '친절/태도' },
        { key: 'property_reliability', label: '매물 신뢰도' },
        { key: 'response_speed', label: '응답 속도' },
      ]

      if (!hasReviews) {
        setDetailProperty({
          id: String(agent.id),
          name: agent.agent_name,
          address: agent.road_address || agent.lot_address || '',
          rating: 0, reviewCount: 0,
          transactionTags: [], praiseTags: [], regretTags: [],
          detailedEvaluation: [],
          keySummary: { recommendRate: 0, discountRate: 0, explanationRate: 0 },
          reviews: [],
          latitude: agent.latitude, longitude: agent.longitude,
        })
        setDetailOpen(true)
        return
      }

      const allTransactionTags = new Set<string>()
      const allPraiseTags = new Set<string>()
      const allRegretTags = new Set<string>()
      reviewsData.forEach((r: any) => {
        if (r.transaction_tag) allTransactionTags.add(r.transaction_tag)
        if (r.praise_tags) r.praise_tags.forEach((t: string) => allPraiseTags.add(t))
        if (r.regret_tags) r.regret_tags.forEach((t: string) => allRegretTags.add(t))
      })

      const detailedEvaluation = evaluationCategories.map(cat => {
        const scores = reviewsData.map((r: any) => r[cat.key]).filter((s: any) => s != null) as number[]
        const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
        return { category: cat.label, score: Number(avg.toFixed(1)) }
      })

      const allScores = detailedEvaluation.map(e => e.score).filter(s => s > 0)
      const avgRating = allScores.length > 0 ? allScores.reduce((s, v) => s + v, 0) / allScores.length : 0

      const reviews = reviewsData.map((r: any) => {
        const email = r.user?.email || 'anonymous@example.com'
        const userGrade = gradeMap[r.user?.user_grade || 'INJOO'] || '인주까비'
        const reviewEval = evaluationCategories.map(cat => ({ category: cat.label, score: r[cat.key] || 0 }))
        return {
          id: r.id.toString(),
          author: email.split('@')[0],
          rating: reviewEval.length > 0 ? reviewEval.reduce((s, e) => s + e.score, 0) / reviewEval.length : 0,
          date: new Date(r.created_at).toLocaleDateString('ko-KR'),
          content: r.review_text || '',
          helpfulCount: r.helpful_count || 0,
          userLevel: userGrade,
          transactionTags: r.transaction_tag ? [r.transaction_tag] : [],
          praiseTags: r.praise_tags || [],
          regretTags: r.regret_tags || [],
          detailedEvaluation: reviewEval,
        }
      })

      setDetailProperty({
        id: String(agent.id),
        name: agent.agent_name,
        address: agent.road_address || agent.lot_address || '',
        rating: Number(avgRating.toFixed(1)),
        reviewCount: reviewsData.length,
        transactionTags: Array.from(allTransactionTags),
        praiseTags: Array.from(allPraiseTags),
        regretTags: Array.from(allRegretTags),
        detailedEvaluation,
        keySummary: { recommendRate: 0, discountRate: 0, explanationRate: 0 },
        reviews,
        latitude: agent.latitude, longitude: agent.longitude,
      })
      setDetailOpen(true)
    } catch (err) {
      console.error('[MapView] 상세 조회 오류:', err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  return (
    <div className={styles.mapContainer}>
      {locError && (
        <div className={styles.locNotice}>
          <span>📍 {locError.split('\n')[0]}</span>
        </div>
      )}
      <div className={styles.mapWrap}>
        <div ref={mapRef} className={styles.map} />
        {loading && (
          <div className={styles.mapLoading}>
            <div className={styles.mapSpinner} />
            <span>중개사를 찾는 중...</span>
          </div>
        )}
        {showSearchBtn && !loading && (
          <button className={styles.searchHereBtn} onClick={handleSearchHere}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
            </svg>
            현 지도에서 검색
          </button>
        )}
        {myPos && (
          <button className={styles.myLocBtn} onClick={handleMyLocation}>
            현재위치
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          </button>
        )}

        {selectedAgent && (
          <div className={styles.popup}>
            <button className={styles.popupClose} onClick={() => setSelectedAgent(null)}>✕</button>
            <div className={styles.popupHeader}>
              <span className={styles.popupName}>{selectedAgent.agent_name}</span>
              {selectedAgent.distance != null && (
                <span className={styles.popupDist}>📍 {formatDist(selectedAgent.distance)}</span>
              )}
            </div>
            <p className={styles.popupAddr}>{selectedAgent.road_address || selectedAgent.lot_address || '주소 정보 없음'}</p>
            {selectedAgent.lot_address && selectedAgent.road_address && (
              <p className={styles.popupLotAddr}>{selectedAgent.lot_address}</p>
            )}
            {(selectedAgent.reviewCount || 0) > 0 && (
              <div className={styles.popupRating}>
                <span className={styles.popupStars}>★ {selectedAgent.rating}</span>
                <span className={styles.popupReviewCnt}>리뷰 {selectedAgent.reviewCount}건</span>
              </div>
            )}
            <button
              className={styles.popupDetailBtn}
              onClick={() => openAgentDetail(selectedAgent)}
              disabled={detailLoading}
            >
              {detailLoading ? '불러오는 중...' : '상세보기'}
            </button>
          </div>
        )}
      </div>

      <PropertyDetailModal
        property={detailProperty}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}
