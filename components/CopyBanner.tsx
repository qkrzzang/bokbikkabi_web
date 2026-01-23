'use client'

import { useState, useEffect } from 'react'
import styles from './CopyBanner.module.css'

const copyOptions = [
  {
    main: '계약하기 전, 이 부동산 괜찮을까?',
    sub: '실제 계약서를 인증한 사람들의 100% 찐후기를 먼저 확인하세요.',
  },
  {
    main: '나만 복비 더 내는 거 아닐까?',
    sub: '우리 동네 부동산의 수수료 할인율과 후기를 미리 알아보세요.',
  },
  {
    main: '우리 동네 \'착한 부동산\'은 어디일까요?',
    sub: '지금 가장 칭찬받는 중개사님을 찾아보세요.',
  },
  {
    main: '복비만 비싸고 불친절하면 어떡하지?',
    sub: '실제 거래자가 평가한 부동산만 보여드립니다.',
  },
  {
    main: '중개사 말만 듣고 계약해도 될까?',
    sub: '칭찬과 아쉬움까지 모두 공개된 리뷰로 판단하세요.',
  },
  {
    main: '첫 계약, 실패하고 싶지 않다면',
    sub: '계약 인증 리뷰로 검증된 부동산부터 확인하세요.',  
  },
  {
    main: "발품 팔기 전, '손품'부터 똑똑하게!",
    sub: "방문 전 미리 파악하는 중개사님의 스타일, 헛걸음을 확실히 줄여드립니다.",
  }
]

export default function CopyBanner() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const selectedCopy = copyOptions[selectedIndex]

  useEffect(() => {
    // 클라이언트에서만 랜덤 인덱스 설정 (Hydration 오류 방지)
    setIsClient(true)
    setSelectedIndex(Math.floor(Math.random() * copyOptions.length))
  }, [])

  useEffect(() => {
    if (!isClient) return
    
    const intervalId = window.setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % copyOptions.length)
    }, 10_000)

    return () => window.clearInterval(intervalId)
  }, [isClient])

  return (
    <div className={styles.banner} suppressHydrationWarning>
      <h2 className={styles.mainCopy} suppressHydrationWarning>{selectedCopy.main}</h2>
      <p className={styles.subCopy} suppressHydrationWarning>{selectedCopy.sub}</p>
    </div>
  )
}



